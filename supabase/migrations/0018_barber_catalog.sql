-- 0018: BASE7 System Barber — catálogo de agendamento (serviços, profissionais).
-- Início da migração de domínio de Moda (e-commerce) para Barbearia. Preserva o
-- e-commerce existente (products/orders/estoque) intacto — a barbearia também
-- vende produtos (pomadas, óleos, etc.), então essas tabelas continuam em uso.

-- SERVIÇOS (corte, barba, degradê, etc.)
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  image text,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index services_category_idx on public.services (category);

-- PROFISSIONAIS (barbeiros)
create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo text,
  bio text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Quais serviços cada profissional realiza (usado para filtrar disponibilidade
-- e para o site público mostrar "agendar com este barbeiro" por serviço).
create table public.professional_services (
  professional_id uuid not null references public.professionals(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (professional_id, service_id)
);
create index professional_services_service_idx on public.professional_services (service_id);

-- RLS
alter table public.services enable row level security;
alter table public.professionals enable row level security;
alter table public.professional_services enable row level security;

create policy "public read active services" on public.services
  for select using (is_active = true);
create policy "admin manage services" on public.services
  for all using (public.is_admin()) with check (public.is_admin());

create policy "public read active professionals" on public.professionals
  for select using (is_active = true);
create policy "admin manage professionals" on public.professionals
  for all using (public.is_admin()) with check (public.is_admin());

-- Leitura pública liberada (só associação id->id, sem dado sensível) — necessária
-- pro site público mostrar quais serviços cada barbeiro realiza. Escrita só admin.
create policy "public read professional services" on public.professional_services
  for select using (true);
create policy "admin manage professional services" on public.professional_services
  for all using (public.is_admin()) with check (public.is_admin());
