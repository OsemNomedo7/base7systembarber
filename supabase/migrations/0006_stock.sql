-- 0006: controle básico de estoque por produto/tamanho, com baixa automática
-- quando um pedido é marcado como pago (hoje feito manualmente pelo admin em
-- AdminPedidos.tsx; o mesmo trigger será reaproveitado quando o webhook do
-- Mercado Pago existir numa fase futura).

create table public.product_stock (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text,
  quantity integer not null default 0 check (quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default now()
);

-- unicidade por (product_id, size) tratando size = null como uma chave real
-- (o índice único padrão do Postgres trataria múltiplos NULLs como não-conflitantes)
create unique index product_stock_product_size_key
  on public.product_stock (product_id, (coalesce(size, '')));
create index product_stock_product_idx on public.product_stock (product_id);

-- Backfill: uma linha de estoque por tamanho de cada produto já existente
-- (ou uma linha com size = null para produtos sem variação de tamanho), qtd inicial 0.
insert into public.product_stock (product_id, size, quantity)
select p.id, s.size, 0
from public.products p
cross join lateral unnest(coalesce(p.sizes, array[null]::text[])) as s(size)
on conflict (product_id, (coalesce(size, ''))) do nothing;

alter table public.product_stock enable row level security;
create policy "admin manage product stock" on public.product_stock for all
  using (public.is_admin()) with check (public.is_admin());

-- Decrementa o estoque correspondente a cada item do pedido, sem deixar a
-- quantidade ficar negativa e sem travar a transação por causa de um item
-- malformado (isso não pode impedir o admin de confirmar o pagamento do pedido).
create or replace function public.decrement_stock_on_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(new.items)
  loop
    begin
      update public.product_stock
         set quantity = greatest(0, quantity - coalesce((item->>'quantity')::integer, 0)),
             updated_at = now()
       where product_id = (item->>'product_id')::uuid
         and coalesce(size, '') = coalesce(item->>'size', '');
    exception when others then
      null;
    end;
  end loop;
  return new;
end;
$$;

create trigger orders_decrement_stock
after update on public.orders
for each row
when (new.payment_status = 'pago' and old.payment_status is distinct from 'pago')
execute function public.decrement_stock_on_payment();
