-- 0020: BASE7 System Barber — agenda (appointments) + regras de disponibilidade.
--
-- Mesmo modelo de segurança do checkout de e-commerce (create_order, migration
-- 0014): o cliente nunca manda preço/duração/nome de serviço, tudo é relido do
-- banco dentro de uma função security definer. A prevenção de conflito de
-- horário NÃO depende só da aplicação: uma exclusion constraint garante, no
-- nível do Postgres, que dois agendamentos ativos do mesmo profissional nunca
-- se sobrepõem, mesmo sob concorrência.

create extension if not exists btree_gist;

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  professional_id uuid not null references public.professionals(id) on delete restrict,
  professional_name text not null,
  service_id uuid not null references public.services(id) on delete restrict,
  service_name text not null,
  service_price numeric(10,2) not null,
  service_duration_minutes integer not null check (service_duration_minutes > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'aguardando'
    check (status in ('aguardando', 'confirmado', 'em_atendimento', 'concluido', 'cancelado', 'nao_compareceu')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_valid_range check (ends_at > starts_at)
);
create index appointments_professional_starts_idx on public.appointments (professional_id, starts_at);
create index appointments_starts_at_idx on public.appointments (starts_at);
create index appointments_status_idx on public.appointments (status);

-- Mantém ends_at sempre coerente com starts_at + duração, tanto na criação (RPC)
-- quanto numa remarcação feita por UPDATE direto do admin (mudar só starts_at).
create or replace function public.set_appointment_ends_at()
returns trigger
language plpgsql
as $$
begin
  new.ends_at := new.starts_at + (new.service_duration_minutes || ' minutes')::interval;
  new.updated_at := now();
  return new;
end;
$$;

create trigger appointments_set_ends_at
before insert or update on public.appointments
for each row execute function public.set_appointment_ends_at();

-- Impede, no nível do banco, dois agendamentos "ativos" sobrepostos para o
-- mesmo profissional. Vale para qualquer caminho de escrita (RPC ou UPDATE
-- direto do admin ao remarcar) — não é uma checagem que dá pra contornar.
alter table public.appointments add constraint appointments_no_overlap
  exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at) with &&
  )
  where (status in ('aguardando', 'confirmado', 'em_atendimento'));

-- RLS — sem nenhuma policy pública de insert/select. A única forma de criar um
-- agendamento vindo do público é a função create_appointment (abaixo), que roda
-- como security definer e ignora RLS. Admin usa a mesma função (ou UPDATE
-- direto, coberto pela policy abaixo) para agendamentos feitos por telefone/balcão.
alter table public.appointments enable row level security;
create policy "admin manage appointments" on public.appointments
  for all using (public.is_admin()) with check (public.is_admin());

-- Cria um agendamento validando tudo no backend: serviço ativo, profissional
-- ativo, profissional realmente presta o serviço, horário dentro do expediente,
-- sem bloqueio/folga no intervalo. Preço/duração vêm sempre de `services`.
create or replace function public.create_appointment(
  p_customer_name text,
  p_customer_phone text,
  p_professional_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service record;
  v_professional record;
  v_customer_id uuid;
  v_appointment_id uuid;
  v_ends_at timestamptz;
begin
  if trim(coalesce(p_customer_name, '')) = '' then
    raise exception 'customer name is required';
  end if;
  if trim(coalesce(p_customer_phone, '')) = '' then
    raise exception 'customer phone is required';
  end if;
  if p_starts_at is null or p_starts_at < now() then
    raise exception 'invalid start time';
  end if;

  select id, name, price, duration_minutes, is_active into v_service
    from public.services where id = p_service_id;
  if v_service.id is null then
    raise exception 'service not found: %', p_service_id;
  end if;
  if not v_service.is_active then
    raise exception 'service not available: %', v_service.name;
  end if;

  select id, name, is_active into v_professional
    from public.professionals where id = p_professional_id;
  if v_professional.id is null then
    raise exception 'professional not found: %', p_professional_id;
  end if;
  if not v_professional.is_active then
    raise exception 'professional not available: %', v_professional.name;
  end if;

  if not exists (
    select 1 from public.professional_services
    where professional_id = p_professional_id and service_id = p_service_id
  ) then
    raise exception 'professional does not perform this service';
  end if;

  v_ends_at := p_starts_at + (v_service.duration_minutes || ' minutes')::interval;

  -- Rejeita serviço que atravessa a meia-noite (fuso local) ANTES de comparar
  -- só o horário-do-dia contra o expediente abaixo - senão um agendamento tipo
  -- 23:50-01:50 poderia "passar" comparando 01:50 (hora final) contra um
  -- end_time de expediente numericamente maior (ex: 20:00), o que seria
  -- incorreto (esse não é o mesmo dia útil).
  if date_trunc('day', p_starts_at at time zone 'America/Sao_Paulo')
     <> date_trunc('day', v_ends_at at time zone 'America/Sao_Paulo') then
    raise exception 'appointment cannot span across midnight';
  end if;

  -- O horário pedido precisa caber inteiro dentro de alguma faixa de expediente
  -- ativa do dia da semana correspondente (fuso fixo America/Sao_Paulo).
  if not exists (
    select 1 from public.professional_schedules ps
    where ps.professional_id = p_professional_id
      and ps.is_active
      and ps.weekday = extract(dow from (p_starts_at at time zone 'America/Sao_Paulo'))::smallint
      and ps.start_time <= (p_starts_at at time zone 'America/Sao_Paulo')::time
      and ps.end_time >= (v_ends_at at time zone 'America/Sao_Paulo')::time
  ) then
    raise exception 'requested time is outside professional working hours';
  end if;

  if exists (
    select 1 from public.professional_time_off pto
    where pto.professional_id = p_professional_id
      and tstzrange(pto.starts_at, pto.ends_at) && tstzrange(p_starts_at, v_ends_at)
  ) then
    raise exception 'professional is unavailable at the requested time';
  end if;

  v_customer_id := public.find_or_create_customer(p_customer_name, p_customer_phone);

  begin
    insert into public.appointments (
      customer_id, customer_name, customer_phone,
      professional_id, professional_name,
      service_id, service_name, service_price, service_duration_minutes,
      starts_at, notes
    ) values (
      v_customer_id, p_customer_name, p_customer_phone,
      v_professional.id, v_professional.name,
      v_service.id, v_service.name, v_service.price, v_service.duration_minutes,
      p_starts_at, p_notes
    )
    returning id into v_appointment_id;
  exception when exclusion_violation then
    raise exception 'time slot is no longer available';
  end;

  return v_appointment_id;
end;
$$;

revoke all on function public.create_appointment(text, text, uuid, uuid, timestamptz, text) from public;
grant execute on function public.create_appointment(text, text, uuid, uuid, timestamptz, text) to anon, authenticated;

-- Calcula os horários livres de um profissional para um serviço numa data,
-- cruzando expediente - bloqueios - agendamentos existentes, em passos de 15min.
-- É a ÚNICA forma de descobrir disponibilidade: professional_schedules e
-- professional_time_off não têm policy pública (ver migration 0019).
create or replace function public.get_available_slots(
  p_professional_id uuid,
  p_service_id uuid,
  p_date date
) returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_duration integer;
  v_step constant interval := interval '15 minutes';
  v_weekday smallint;
  v_range record;
  v_range_start timestamptz;
  v_range_end timestamptz;
  v_candidate timestamptz;
  v_candidate_end timestamptz;
begin
  select duration_minutes into v_duration from public.services
    where id = p_service_id and is_active = true;
  if v_duration is null then
    return;
  end if;

  if not exists (
    select 1 from public.professional_services
    where professional_id = p_professional_id and service_id = p_service_id
  ) then
    return;
  end if;

  v_weekday := extract(dow from p_date)::smallint;

  for v_range in
    select start_time, end_time from public.professional_schedules
    where professional_id = p_professional_id
      and weekday = v_weekday
      and is_active = true
    order by start_time
  loop
    v_range_start := (p_date + v_range.start_time) at time zone 'America/Sao_Paulo';
    v_range_end := (p_date + v_range.end_time) at time zone 'America/Sao_Paulo';
    v_candidate := v_range_start;

    while v_candidate + (v_duration || ' minutes')::interval <= v_range_end loop
      v_candidate_end := v_candidate + (v_duration || ' minutes')::interval;

      if v_candidate >= now()
        and not exists (
          select 1 from public.professional_time_off pto
          where pto.professional_id = p_professional_id
            and tstzrange(pto.starts_at, pto.ends_at) && tstzrange(v_candidate, v_candidate_end)
        )
        and not exists (
          select 1 from public.appointments a
          where a.professional_id = p_professional_id
            and a.status in ('aguardando', 'confirmado', 'em_atendimento')
            and tstzrange(a.starts_at, a.ends_at) && tstzrange(v_candidate, v_candidate_end)
        )
      then
        slot_start := v_candidate;
        slot_end := v_candidate_end;
        return next;
      end if;

      v_candidate := v_candidate + v_step;
    end loop;
  end loop;

  return;
end;
$$;

revoke all on function public.get_available_slots(uuid, uuid, date) from public;
grant execute on function public.get_available_slots(uuid, uuid, date) to anon, authenticated;
