-- 0003: corrige policies administrativas para usar public.is_admin() em vez de
-- auth.role() = 'authenticated'. Sessões anônimas (usadas hoje pelo chat público via
-- signInAnonymously()) também recebem role 'authenticated' no JWT, então as policies
-- antigas davam acesso administrativo a qualquer visitante do site. is_admin() já
-- existia e já era usado corretamente nas tabelas de chat; aqui só estendemos o mesmo
-- padrão para as demais tabelas administrativas. Sem mudança de comportamento para o
-- admin real (login com e-mail/senha nunca é anônimo).

-- products
drop policy "admin manage products" on public.products;
create policy "admin manage products" on public.products for all
  using (public.is_admin()) with check (public.is_admin());

-- site_content
drop policy "admin manage site content" on public.site_content;
create policy "admin manage site content" on public.site_content for all
  using (public.is_admin()) with check (public.is_admin());

-- orders (a policy de insert público não muda aqui)
drop policy "admin read orders" on public.orders;
drop policy "admin update orders" on public.orders;
drop policy "admin delete orders" on public.orders;
create policy "admin read orders" on public.orders for select using (public.is_admin());
create policy "admin update orders" on public.orders for update using (public.is_admin()) with check (public.is_admin());
create policy "admin delete orders" on public.orders for delete using (public.is_admin());

-- product_reviews
drop policy "admin read all reviews" on public.product_reviews;
drop policy "admin update reviews" on public.product_reviews;
drop policy "admin delete reviews" on public.product_reviews;
create policy "admin read all reviews" on public.product_reviews for select using (public.is_admin());
create policy "admin update reviews" on public.product_reviews for update
  using (public.is_admin()) with check (public.is_admin());
create policy "admin delete reviews" on public.product_reviews for delete using (public.is_admin());

-- storage.objects (bucket "media")
drop policy "admin upload media" on storage.objects;
drop policy "admin update media" on storage.objects;
drop policy "admin delete media" on storage.objects;
create policy "admin upload media" on storage.objects for insert
  with check (bucket_id = 'media' and public.is_admin());
create policy "admin update media" on storage.objects for update
  using (bucket_id = 'media' and public.is_admin());
create policy "admin delete media" on storage.objects for delete
  using (bucket_id = 'media' and public.is_admin());
