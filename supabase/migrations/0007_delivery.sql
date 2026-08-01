-- 0007: métodos de entrega configuráveis (retirada, entrega própria, frete fixo,
-- Correios, transportadora) e ligação com o checkout via CEP.

create extension if not exists unaccent;

-- unaccent() é marcada STABLE pelo Postgres (não IMMUTABLE), então não pode ser usada
-- direto numa coluna GENERATED ALWAYS AS. Este wrapper força IMMUTABLE (padrão
-- documentado para esse caso, seguro porque não dependemos de configurações de
-- dicionário variáveis em runtime).
create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
as $$
  select unaccent('unaccent', $1)
$$;

create table public.delivery_methods (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('retirada','entrega_propria','frete_fixo','correios','transportadora')),
  name text not null,
  is_active boolean not null default true,
  price numeric(10,2) not null default 0 check (price >= 0),
  min_order_value numeric(10,2) check (min_order_value >= 0),
  free_above_value numeric(10,2) check (free_above_value >= 0),
  estimated_days_min integer check (estimated_days_min >= 0),
  estimated_days_max integer check (estimated_days_max >= 0),
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_methods_retirada_free check (type <> 'retirada' or price = 0),
  constraint delivery_methods_days_order check (
    estimated_days_min is null or estimated_days_max is null or estimated_days_min <= estimated_days_max
  )
);
-- só pode existir 1 método do tipo 'retirada'
create unique index delivery_methods_single_retirada_idx on public.delivery_methods (type) where type = 'retirada';
create index delivery_methods_active_idx on public.delivery_methods (is_active) where is_active;

create table public.delivery_method_areas (
  id uuid primary key default gen_random_uuid(),
  delivery_method_id uuid not null references public.delivery_methods(id) on delete cascade,
  city text,
  state text check (state ~ '^[A-Z]{2}$'),
  -- normalizado (minúsculo, sem acento) para casar com a cidade resolvida pelo ViaCEP no frontend
  city_normalized text generated always as (lower(public.immutable_unaccent(trim(coalesce(city, ''))))) stored,
  zip_range_start text check (zip_range_start ~ '^\d{8}$'),
  zip_range_end text check (zip_range_end ~ '^\d{8}$'),
  created_at timestamptz not null default now(),
  -- cada linha é OU uma regra de cidade/UF OU uma faixa de CEP, nunca ambígua
  constraint delivery_method_areas_rule_shape check (
    (state is not null and zip_range_start is null and zip_range_end is null)
    or
    (state is null and zip_range_start is not null and zip_range_end is not null
     and zip_range_start <= zip_range_end)
  )
);
create index delivery_method_areas_method_idx on public.delivery_method_areas (delivery_method_id);

alter table public.delivery_methods enable row level security;
alter table public.delivery_method_areas enable row level security;

-- Leitura pública só de métodos ativos (o checkout do storefront precisa ler sem login)
create policy "public read active delivery methods" on public.delivery_methods
  for select using (is_active = true);
create policy "public read areas of active methods" on public.delivery_method_areas
  for select using (
    exists (select 1 from public.delivery_methods dm
            where dm.id = delivery_method_areas.delivery_method_id and dm.is_active)
  );
create policy "admin manage delivery methods" on public.delivery_methods
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin manage delivery method areas" on public.delivery_method_areas
  for all using (public.is_admin()) with check (public.is_admin());

-- Retirada sempre existe e funciona sem nenhuma configuração do admin
insert into public.delivery_methods (type, name, price, is_active)
values ('retirada', 'Retirada na loja', 0, true)
on conflict do nothing;

-- Enriquece orders com o método escolhido (snapshot de nome/prazo: o método pode
-- mudar de nome ou ser removido depois, o pedido preserva o que valia na compra)
alter table public.orders
  add column delivery_method_id uuid references public.delivery_methods(id) on delete set null,
  add column shipping_label text,
  add column shipping_eta text;
create index orders_delivery_method_id_idx on public.orders (delivery_method_id);

-- create_order ganha parâmetros novos opcionais (com DEFAULT) — Postgres permite
-- adicionar parâmetros no final via CREATE OR REPLACE sem quebrar chamadas antigas.
create or replace function public.create_order(
  p_customer_name text,
  p_customer_phone text,
  p_delivery_type text,
  p_address text,
  p_payment_method text,
  p_items jsonb,
  p_total numeric,
  p_delivery_method_id uuid default null,
  p_shipping_fee numeric default 0,
  p_shipping_label text default null,
  p_shipping_eta text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_order_id uuid;
begin
  v_customer_id := public.find_or_create_customer(p_customer_name, p_customer_phone);

  insert into public.orders (
    customer_id, customer_name, customer_phone, delivery_type, address, payment_method,
    items, total, delivery_method_id, shipping_fee, shipping_label, shipping_eta
  ) values (
    v_customer_id, p_customer_name, p_customer_phone, p_delivery_type, p_address, p_payment_method,
    p_items, p_total, p_delivery_method_id, p_shipping_fee, p_shipping_label, p_shipping_eta
  )
  returning id into v_order_id;

  return v_order_id;
end;
$$;
revoke all on function public.create_order(text, text, text, text, text, jsonb, numeric, uuid, numeric, text, text) from public;
grant execute on function public.create_order(text, text, text, text, text, jsonb, numeric, uuid, numeric, text, text) to anon, authenticated;
