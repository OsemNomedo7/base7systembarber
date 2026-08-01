-- 0015: correção SEC-002 do audit de segurança (SECURITY_AUDIT_REPORT.md).
-- A migration 0003 corrigiu "auth.role()='authenticated' também vale pra
-- sessão anônima" em products/site_content/orders/product_reviews/storage,
-- mas esqueceu analytics_events. Como todo visitante do site ganha uma
-- sessão anônima automática (chat), qualquer um conseguia ler a tabela
-- inteira de analytics. Corrige pro mesmo padrão is_admin() das demais.
drop policy if exists "admin read analytics" on public.analytics_events;
create policy "admin read analytics" on public.analytics_events
  for select using (public.is_admin());
