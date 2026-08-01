-- 0013: infraestrutura de emissão de NFC-e via Focus NFe (Fase 5).
-- Mesmo modelo de credenciais diretas do Mercado Pago: o lojista cria a
-- própria conta no Focus NFe (CNPJ + certificado digital A1, fora do nosso
-- sistema) e cola o token aqui. RLS zero policies - só service_role acessa.
create table public.focusnfe_credentials (
  id integer primary key default 1 check (id = 1),
  api_token text,
  ambiente text not null default 'homologacao' check (ambiente in ('homologacao', 'producao')),
  cnpj_emitente text,
  connected_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.focusnfe_credentials enable row level security;

create or replace function public.get_focusnfe_status()
returns table (is_connected boolean, ambiente text, connected_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
    select (api_token is not null), fc.ambiente, fc.connected_at
    from public.focusnfe_credentials fc where fc.id = 1
    union all
    select false, 'homologacao', null where not exists (select 1 from public.focusnfe_credentials where id = 1)
    limit 1;
end;
$$;
grant execute on function public.get_focusnfe_status() to authenticated;

-- Dados fiscais por produto, necessários pra montar o item da NFC-e.
-- Defaults cobrem o caso comum (Simples Nacional, venda dentro do estado,
-- mercadoria nacional) - NCM não tem default por variar de produto pra
-- produto, e bloqueia a emissão se não for preenchido.
alter table public.products
  add column ncm text,
  add column cfop text not null default '5102',
  add column unidade_comercial text not null default 'UN',
  add column icms_origem text not null default '0',
  add column icms_situacao_tributaria text not null default '102';

-- Rastreio da NFC-e emitida por pedido.
alter table public.orders
  add column nfce_status text,
  add column nfce_ref text,
  add column nfce_chave text,
  add column nfce_numero text,
  add column nfce_serie text,
  add column nfce_danfe_url text,
  add column nfce_mensagem_sefaz text,
  add column nfce_emitted_at timestamptz;
