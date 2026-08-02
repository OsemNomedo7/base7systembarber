-- 0022: corrige exposição da coluna phone de professionals a visitantes públicos.
--
-- RLS é por LINHA, não por coluna: a policy "public read active professionals"
-- (migration 0018) libera a linha inteira de qualquer profissional ativo pra
-- qualquer visitante anônimo, incluindo o telefone pessoal dele - que nunca é
-- exibido em nenhuma tela do site (nem Index.tsx, nem Agendar.tsx), só existe
-- pra uso interno do admin. Confirmado em auditoria: `select name,phone from
-- professionals` com a anon key pública devolvia o telefone de cada barbeiro.
--
-- Mesmo padrão já usado nesta migração de domínio pra esconder dado sensível
-- de agenda (migration 0019/0020, get_available_slots): remove a policy
-- pública de select da tabela e expõe só as colunas seguras através de duas
-- funções security definer. Acesso do admin (RLS "admin manage professionals",
-- já existente) continua igual, sem nenhuma mudança.

drop policy "public read active professionals" on public.professionals;

create or replace function public.get_public_professionals()
returns table (
  id uuid,
  name text,
  photo text,
  bio text
)
language sql
stable
security definer
set search_path = public
as $$
  select id, name, photo, bio
  from public.professionals
  where is_active = true
  order by name;
$$;

create or replace function public.get_public_professionals_for_service(p_service_id uuid)
returns table (
  id uuid,
  name text,
  photo text,
  bio text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.name, p.photo, p.bio
  from public.professionals p
  join public.professional_services ps on ps.professional_id = p.id
  where p.is_active = true
    and ps.service_id = p_service_id
  order by p.name;
$$;

revoke all on function public.get_public_professionals() from public;
revoke all on function public.get_public_professionals_for_service(uuid) from public;
grant execute on function public.get_public_professionals() to anon, authenticated;
grant execute on function public.get_public_professionals_for_service(uuid) to anon, authenticated;
