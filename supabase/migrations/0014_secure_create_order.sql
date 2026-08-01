-- 0014: correção de segurança CRÍTICA (SEC-001/SEC-003/SEC-004 do audit de
-- 2026-07-31, ver SECURITY_AUDIT_REPORT.md).
--
-- SEC-001: create_order recebia p_total/preço de item/frete direto do
-- cliente e gravava sem NENHUMA validação contra os preços reais em
-- `products`/`delivery_methods`. Isso permitia pagar qualquer valor
-- (inclusive R$0,01) por qualquer produto. Agora o cliente manda só
-- product_id/quantity/size por item - preço, subtotal, frete e total são
-- SEMPRE calculados aqui dentro, a partir do banco.
--
-- SEC-003: confirmado nesta correção que as DUAS versões antigas de
-- create_order (7 e 11 parâmetros) ainda coexistiam no banco - a migration
-- 0009 não teve efeito duradouro. Este migration remove explicitamente as
-- duas assinaturas antigas antes de criar a nova.
--
-- SEC-004: valida estoque disponível (product_stock) antes de aceitar o
-- pedido - não é uma reserva/lock (o decremento continua só na confirmação
-- do pagamento, como já era), mas bloqueia o caso óbvio de vender algo sem
-- nenhum estoque cadastrado.

drop function if exists public.create_order(text, text, text, text, text, jsonb, numeric);
drop function if exists public.create_order(text, text, text, text, text, jsonb, numeric, uuid, numeric, text, text);

create or replace function public.create_order(
  p_customer_name text,
  p_customer_phone text,
  p_delivery_type text,
  p_address text,
  p_payment_method text,
  p_items jsonb, -- [{product_id, quantity, size}] - NUNCA confiar em price/name vindos daqui
  p_delivery_method_id uuid default null,
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
  v_subtotal numeric(10,2) := 0;
  v_shipping_fee numeric(10,2) := 0;
  v_total numeric(10,2);
  v_priced_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_size text;
  v_product record;
  v_available_qty integer;
  v_delivery record;
begin
  if p_delivery_type not in ('entrega', 'retirada') then
    raise exception 'invalid delivery type';
  end if;
  if p_payment_method not in ('pix', 'credito', 'debito') then
    raise exception 'invalid payment method';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'order must have at least one item';
  end if;

  -- Recalcula cada item a partir do banco - o preço/nome enviados pelo
  -- cliente (se houver) são completamente ignorados.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(v_item->>'product_id', '')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    v_size := nullif(v_item->>'size', '');

    if v_product_id is null then
      raise exception 'invalid product_id';
    end if;
    if v_quantity is null or v_quantity <= 0 or v_quantity > 999 then
      raise exception 'invalid quantity';
    end if;

    select id, name, price, is_active into v_product
      from public.products where id = v_product_id;

    if v_product.id is null then
      raise exception 'product not found: %', v_product_id;
    end if;
    if not v_product.is_active then
      raise exception 'product not available: %', v_product.name;
    end if;

    select quantity into v_available_qty
      from public.product_stock
      where product_id = v_product_id
        and coalesce(size, '') = coalesce(v_size, '');

    if v_available_qty is null or v_available_qty < v_quantity then
      raise exception 'insufficient stock for product: %', v_product.name;
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_quantity);
    v_priced_items := v_priced_items || jsonb_build_object(
      'product_id', v_product.id,
      'name', v_product.name,
      'price', v_product.price,
      'quantity', v_quantity,
      'size', v_size
    );
  end loop;

  -- Frete: sempre a partir de delivery_methods, nunca do que o cliente mandar.
  if p_delivery_type = 'entrega' then
    if p_delivery_method_id is null then
      raise exception 'delivery method required for entrega';
    end if;

    select price, free_above_value into v_delivery
      from public.delivery_methods
      where id = p_delivery_method_id and is_active and type <> 'retirada';

    if not found then
      raise exception 'invalid or inactive delivery method';
    end if;

    v_shipping_fee := case
      when v_delivery.free_above_value is not null and v_subtotal >= v_delivery.free_above_value then 0
      else v_delivery.price
    end;
  else
    v_shipping_fee := 0;
    p_delivery_method_id := null; -- retirada não usa método de entrega pago
  end if;

  v_total := v_subtotal + v_shipping_fee;

  v_customer_id := public.find_or_create_customer(p_customer_name, p_customer_phone);

  insert into public.orders (
    customer_id, customer_name, customer_phone, delivery_type, address, payment_method,
    items, total, delivery_method_id, shipping_fee, shipping_label, shipping_eta
  ) values (
    v_customer_id, p_customer_name, p_customer_phone, p_delivery_type, p_address, p_payment_method,
    v_priced_items, v_total, p_delivery_method_id, v_shipping_fee, p_shipping_label, p_shipping_eta
  )
  returning id into v_order_id;

  return v_order_id;
end;
$$;

revoke all on function public.create_order(text, text, text, text, text, jsonb, uuid, text, text) from public;
grant execute on function public.create_order(text, text, text, text, text, jsonb, uuid, text, text) to anon, authenticated;

-- Fecha o path alternativo de ataque: um POST direto em /rest/v1/orders
-- (fora da função) conseguia inserir qualquer total/items, já que a única
-- exigência era "customer_id is null". Agora a única forma de criar um
-- pedido é via create_order (SECURITY DEFINER, roda com os privilégios do
-- dono da tabela e ignora RLS de qualquer forma).
drop policy if exists "public insert orders" on public.orders;
