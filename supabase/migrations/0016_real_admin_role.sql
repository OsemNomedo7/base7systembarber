-- 0016: correção SEC-006 do audit de segurança (SECURITY_AUDIT_REPORT.md).
--
-- Até aqui, "ser admin" significava só "ter uma sessão autenticada e não
-- anônima" - o que hoje é equivalente a "é o admin", porque só existe UM
-- usuário não-anônimo no projeto. Mas isso é uma bomba-relógio: no dia em
-- que a loja ganhar login real de cliente (já cogitado no roadmap), QUALQUER
-- cliente logado passaria a ser tratado como admin por is_admin() e pelas
-- Edge Functions administrativas (mercadopago-save-credentials,
-- focusnfe-save-credentials, focusnfe-emit-nfce, focusnfe-cancel-nfce).
--
-- Corrige is_admin() para exigir explicitamente app_metadata.role = 'admin'
-- (claim dentro do JWT, não confiável pelo usuário - só quem tem acesso de
-- service_role consegue setar app_metadata via API/SQL direto em
-- auth.users). Concede essa claim, uma única vez, para quem HOJE já é
-- usuário não-anônimo (ou seja: o admin fixo desta instalação) - login de
-- cliente futuro nunca deve receber essa claim automaticamente.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
where is_anonymous is not true
  and coalesce(raw_app_meta_data ->> 'role', '') <> 'admin';

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select auth.role() = 'authenticated'
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
     and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

-- IMPORTANTE (operacional): sessões já abertas no navegador têm um JWT
-- antigo, emitido ANTES dessa claim existir - o token só é atualizado no
-- próximo refresh automático ou login. Depois de aplicar esta migration,
-- se o painel admin parecer ter perdido acesso, faça logout e login de novo.
