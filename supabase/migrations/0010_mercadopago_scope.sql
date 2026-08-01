-- 0010: guarda o "scope" devolvido pelo OAuth do Mercado Pago (não é segredo,
-- é só uma lista de permissões tipo "read,write,offline_access") - útil para
-- diagnosticar diferenças de permissão entre o token obtido via OAuth
-- (Authorization Code) e o token visto direto no painel da aplicação.
alter table public.mercadopago_credentials
  add column scope text;
