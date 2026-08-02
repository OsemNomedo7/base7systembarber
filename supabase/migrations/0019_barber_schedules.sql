-- 0019: BASE7 System Barber — expediente semanal e bloqueios/folgas dos profissionais.
--
-- Nenhuma policy pública nestas duas tabelas: a disponibilidade de horário nunca é
-- exposta lendo estas tabelas diretamente, só através da função
-- get_available_slots() (security definer, criada na migration 0020), que já
-- devolve os horários livres já calculados. Evita expor a agenda/expediente bruto
-- de cada profissional a qualquer visitante do site.

-- Expediente semanal. weekday segue extract(dow from ...): 0 = domingo ... 6 = sábado.
-- Permite múltiplas faixas no mesmo dia (ex: 09:00-12:00 e 14:00-19:00, com almoço).
create table public.professional_schedules (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null check (end_time > start_time),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index professional_schedules_professional_weekday_idx
  on public.professional_schedules (professional_id, weekday);

-- Bloqueios pontuais: folgas, férias, feriados, horário de almoço fora do padrão etc.
create table public.professional_time_off (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  reason text,
  created_at timestamptz not null default now()
);
create index professional_time_off_professional_range_idx
  on public.professional_time_off (professional_id, starts_at, ends_at);

-- RLS — admin-only, sem exceção (ver nota no topo do arquivo)
alter table public.professional_schedules enable row level security;
alter table public.professional_time_off enable row level security;

create policy "admin manage professional schedules" on public.professional_schedules
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin manage professional time off" on public.professional_time_off
  for all using (public.is_admin()) with check (public.is_admin());
