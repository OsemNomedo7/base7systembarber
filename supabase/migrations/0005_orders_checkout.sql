-- 0005: enriquece orders para servir de Histórico de Vendas e liga o checkout
-- público ao cadastro de clientes (0004), sem quebrar compatibilidade com pedidos
-- já existentes (customer_name/customer_phone continuam sendo gravados como hoje).

alter table public.orders
  add column customer_id uuid references public.customers(id) on delete set null,
  add column payment_status text not null default 'pendente'
    check (payment_status in ('pendente', 'pago', 'recusado', 'estornado')),
  add column discount_amount numeric(10,2) not null default 0 check (discount_amount >= 0),
  add column shipping_fee numeric(10,2) not null default 0 check (shipping_fee >= 0),
  add column order_number bigserial unique not null;

create index orders_customer_id_idx on public.orders (customer_id);
create index orders_payment_status_idx on public.orders (payment_status);
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_order_number_idx on public.orders (order_number);

-- Encontra um cliente pelo telefone normalizado ou cria um novo. security definer:
-- roda com os privilégios do dono da tabela, então funciona mesmo sem nenhuma
-- policy pública em customers (o visitante do checkout não tem acesso direto à tabela).
create or replace function public.find_or_create_customer(p_name text, p_phone text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_name text := nullif(trim(p_name), '');
  v_phone text := trim(p_phone);
begin
  if v_phone = '' or regexp_replace(v_phone, '\D', '', 'g') = '' then
    raise exception 'invalid phone';
  end if;
  if v_name is null then
    raise exception 'invalid name';
  end if;

  insert into public.customers (name, phone)
  values (v_name, v_phone)
  on conflict (phone_normalized) do update
    set is_active = true, updated_at = now()
  returning id into v_customer_id;

  return v_customer_id;
end;
$$;
revoke all on function public.find_or_create_customer(text, text) from public;
grant execute on function public.find_or_create_customer(text, text) to anon, authenticated;

-- Cria o cliente (find-or-create) e o pedido numa única transação, para o
-- checkout público nunca precisar (nem conseguir) manipular customer_id diretamente.
create or replace function public.create_order(
  p_customer_name text,
  p_customer_phone text,
  p_delivery_type text,
  p_address text,
  p_payment_method text,
  p_items jsonb,
  p_total numeric
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
    customer_id, customer_name, customer_phone, delivery_type, address,
    payment_method, items, total
  ) values (
    v_customer_id, p_customer_name, p_customer_phone, p_delivery_type, p_address,
    p_payment_method, p_items, p_total
  )
  returning id into v_order_id;

  return v_order_id;
end;
$$;
revoke all on function public.create_order(text, text, text, text, text, jsonb, numeric) from public;
grant execute on function public.create_order(text, text, text, text, text, jsonb, numeric) to anon, authenticated;

-- Defesa em profundidade: um insert feito manualmente via REST pelo cliente nunca
-- consegue setar customer_id de outra pessoa. Só a função security definer acima
-- (que roda como dona da tabela) consegue.
drop policy "public insert orders" on public.orders;
create policy "public insert orders" on public.orders
  for insert with check (customer_id is null);
