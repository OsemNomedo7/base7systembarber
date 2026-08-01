-- 0011: modelo direto de credenciais Mercado Pago (substitui o fluxo OAuth).
-- Como cada instalação do Base7 atende só um lojista (arquitetura de instalação
-- independente por cliente), não faz sentido usar o modelo "marketplace" OAuth
-- (uma aplicação central autorizando várias contas de terceiros) - na prática
-- isso causou um comportamento não documentado do Mercado Pago com tokens
-- obtidos via Authorization Code de contas de teste (ver memória do projeto).
-- O caminho mais simples e confiável: cada lojista cria sua PRÓPRIA aplicação
-- no Mercado Pago e cola o Access Token/Public Key direto no admin do Base7.
--
-- webhook_secret guardado aqui (não como secret de Edge Function) porque cada
-- instalação já é de um lojista só - o mesmo nível de proteção (RLS zero
-- policies, só service_role acessa) se aplica igualmente.
alter table public.mercadopago_credentials
  add column webhook_secret text;
