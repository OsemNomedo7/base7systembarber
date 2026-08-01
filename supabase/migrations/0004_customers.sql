-- 0004: módulo de Clientes — cadastro manual pelo admin e base para associação
-- automática no checkout (feita na migration seguinte, via RPC security definer).

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  -- normaliza o telefone (só dígitos) para permitir encontrar o mesmo cliente
  -- mesmo quando ele digita com máscaras diferentes em compras distintas
  phone_normalized text generated always as (regexp_replace(phone, '\D', '', 'g')) stored,
  email text,
  document text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_phone_not_empty check (phone_normalized <> '')
);
create unique index customers_phone_normalized_key on public.customers (phone_normalized);
create index customers_name_idx on public.customers (name);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  label text,
  zip_code text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customer_addresses_customer_idx on public.customer_addresses (customer_id);
-- no máximo um endereço padrão por cliente
create unique index customer_addresses_one_default_idx
  on public.customer_addresses (customer_id) where is_default;

alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;

-- Sem policy pública: o checkout do storefront nunca lê/escreve essas tabelas
-- diretamente, só através da função security definer criada na migration 0005.
create policy "admin manage customers" on public.customers for all
  using (public.is_admin()) with check (public.is_admin());
create policy "admin manage customer addresses" on public.customer_addresses for all
  using (public.is_admin()) with check (public.is_admin());
