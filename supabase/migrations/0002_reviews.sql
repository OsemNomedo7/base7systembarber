-- 0002: Avaliações de produtos (estrelas + comentário), com moderação do admin

create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_name text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'rejeitada')),
  admin_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_reviews_product_idx on public.product_reviews (product_id, created_at desc);
create index product_reviews_status_idx on public.product_reviews (status, created_at desc);

alter table public.product_reviews enable row level security;

-- Pública só vê avaliações aprovadas; pode enviar uma nova, mas sempre entra como
-- 'pendente' (o check abaixo impede que o próprio cliente publique direto como aprovada).
create policy "public read approved reviews" on public.product_reviews for select using (status = 'aprovada');
create policy "public insert reviews" on public.product_reviews for insert with check (status = 'pendente');

-- Admin vê e modera tudo (aprovar/rejeitar/responder/excluir)
create policy "admin read all reviews" on public.product_reviews for select using (auth.role() = 'authenticated');
create policy "admin update reviews" on public.product_reviews for update
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin delete reviews" on public.product_reviews for delete using (auth.role() = 'authenticated');
