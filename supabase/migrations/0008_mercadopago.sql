-- 0008: integração Mercado Pago (OAuth por lojista + pagamentos Pix).
-- Nenhum segredo é armazenado em texto no código: access_token/refresh_token do
-- lojista ficam só nesta tabela, sem NENHUMA policy pública/admin — só as Edge
-- Functions (usando a service_role key) conseguem ler/escrever aqui. O admin no
-- navegador nunca vê o token, só um status resumido via RPC abaixo.

create table public.mercadopago_credentials (
  id integer primary key default 1 check (id = 1),
  mp_user_id bigint,
  access_token text,
  refresh_token text,
  public_key text,
  live_mode boolean,
  token_expires_at timestamptz,
  connected_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.mercadopago_credentials enable row level security;
-- Propositalmente sem nenhuma policy: RLS ativo + zero policies = ninguém via
-- anon/authenticated acessa; só service_role (Edge Functions) bypassa RLS.

-- Status seguro para o admin ver na tela (nunca expõe os tokens).
create or replace function public.get_mercadopago_status()
returns table (is_connected boolean, live_mode boolean, connected_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if exists (select 1 from public.mercadopago_credentials where id = 1) then
    return query
      select (mc.access_token is not null), mc.live_mode, mc.connected_at
      from public.mercadopago_credentials mc
      where mc.id = 1;
  else
    return query select false, null::boolean, null::timestamptz;
  end if;
end;
$$;
revoke all on function public.get_mercadopago_status() from public;
grant execute on function public.get_mercadopago_status() to authenticated;

-- public_key é seguro expor publicamente (equivalente à publishable key do Stripe) —
-- o checkout da loja (visitante anônimo) precisa dela para inicializar o SDK JS do MP.
create or replace function public.get_mercadopago_public_key()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public_key from public.mercadopago_credentials where id = 1 and access_token is not null limit 1;
$$;
revoke all on function public.get_mercadopago_public_key() from public;
grant execute on function public.get_mercadopago_public_key() to anon, authenticated;

-- Rastreio do pagamento no pedido (snapshot do id/detalhe do MP, útil pra suporte/depuração)
alter table public.orders
  add column mp_payment_id text,
  add column mp_status_detail text;
create unique index orders_mp_payment_id_idx on public.orders (mp_payment_id) where mp_payment_id is not null;

-- O checkout precisa acompanhar se o Pix foi pago, mas não existe (nem deve existir)
-- policy pública de SELECT em orders (vazaria dados de outros clientes). Esta RPC
-- devolve só o status de um pedido específico (quem já tem o id, sabe o suficiente
-- pra não ser um vazamento de dado sensível de terceiros) - nada de PII.
create or replace function public.get_order_payment_status(p_order_id uuid)
returns table (payment_status text, status text)
language sql
stable
security definer
set search_path = public
as $$
  select payment_status, status from public.orders where id = p_order_id;
$$;
revoke all on function public.get_order_payment_status(uuid) from public;
grant execute on function public.get_order_payment_status(uuid) to anon, authenticated;

-- Log de notificações processadas, pra nunca reprocessar a mesma duas vezes
-- (o Mercado Pago pode reenviar a mesma notificação por retry).
create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  mp_payment_id text not null,
  mp_status text not null,
  received_at timestamptz not null default now(),
  constraint payment_webhook_events_dedup unique (mp_payment_id, mp_status)
);
alter table public.payment_webhook_events enable row level security;
-- Sem nenhuma policy: só service_role (Edge Function do webhook) acessa.
