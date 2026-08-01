-- 0009: corrige uma sobrecarga (overload) acidental de public.create_order.
-- CREATE OR REPLACE FUNCTION só substitui uma função quando a assinatura (tipos
-- de parâmetros) é EXATAMENTE igual - como a migration 0007 adicionou 4
-- parâmetros novos no final, o Postgres criou uma SEGUNDA função (7 parâmetros
-- + 11 parâmetros coexistindo), em vez de substituir a antiga. Isso deixa o
-- PostgREST incapaz de decidir qual usar quando chamado com só os 7 parâmetros
-- originais ("Could not choose the best candidate function"). Removemos a
-- versão antiga de 7 parâmetros - a de 11 (com os 4 opcionais de entrega) é a
-- única em uso pelo frontend.
drop function if exists public.create_order(text, text, text, text, text, jsonb, numeric);
