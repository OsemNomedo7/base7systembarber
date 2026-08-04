-- Bucket privado pra guardar os snapshots gerados pela Edge Function
-- backup-export. Nunca é acessado pelo frontend nem por usuário anônimo/
-- autenticado comum — só pelo service_role (que ignora RLS), então não
-- precisa de policy nenhuma em storage.objects.
insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;
