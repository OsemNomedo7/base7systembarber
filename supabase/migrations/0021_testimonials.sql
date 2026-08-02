-- 0021: BASE7 System Barber — depoimentos sobre a barbearia/atendimento/profissional.
-- Distinto de product_reviews (que continua só para produtos da loja): aqui a
-- avaliação é sobre o atendimento em si, opcionalmente associada a um profissional.
-- Mesmo modelo de moderação de product_reviews (0002), já usando is_admin() real
-- (0002 usava o padrão antigo auth.role() = 'authenticated', corrigido depois em 0016 -
-- aqui já nasce com o padrão correto).

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid references public.professionals(id) on delete set null,
  customer_name text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'rejeitada')),
  admin_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index testimonials_status_idx on public.testimonials (status, created_at desc);
create index testimonials_professional_idx on public.testimonials (professional_id) where professional_id is not null;

alter table public.testimonials enable row level security;

-- Pública só vê aprovados; pode enviar um novo, mas sempre entra como 'pendente'
-- (o check abaixo impede que o próprio cliente publique direto como aprovado).
create policy "public read approved testimonials" on public.testimonials
  for select using (status = 'aprovada');
create policy "public insert testimonials" on public.testimonials
  for insert with check (status = 'pendente');

-- Admin vê e modera tudo (aprovar/rejeitar/responder/excluir)
create policy "admin manage testimonials" on public.testimonials
  for all using (public.is_admin()) with check (public.is_admin());
