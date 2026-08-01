-- 0012: metadados não-sensíveis do cartão para exibir no admin (Fase 4b).
-- Nunca guarda o token, número completo ou CVV - só o suficiente pra o
-- lojista identificar o pagamento na lista de pedidos.
alter table public.orders
  add column card_brand text,
  add column card_last_four text,
  add column card_installments integer;
