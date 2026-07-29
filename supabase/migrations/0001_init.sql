-- BASE7WEB - SYSTEM MODA — schema inicial (produtos, pedidos, conteúdo, chat, analytics)
create extension if not exists pgcrypto;

-- PRODUTOS (loja)
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null,
  image text not null,
  images text[] default '{}',
  category text not null,
  sizes text[],
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- CONTEÚDO INSTITUCIONAL (CMS simples: chave -> jsonb)
create table public.site_content (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- PEDIDOS (checkout da loja)
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  delivery_type text not null check (delivery_type in ('entrega', 'retirada')),
  address text,
  payment_method text not null check (payment_method in ('pix', 'credito', 'debito')),
  items jsonb not null, -- snapshot: [{product_id, name, price, quantity, size}]
  total numeric(10,2) not null,
  status text not null default 'novo' check (status in ('novo', 'contatado', 'concluido', 'cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ANALYTICS (eventos simples: visitas + produtos mais vistos)
create table public.analytics_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('page_view', 'product_view')),
  path text,
  product_id uuid references public.products(id) on delete set null,
  session_id text,
  created_at timestamptz not null default now()
);
create index analytics_events_type_date_idx on public.analytics_events (event_type, created_at);
create index analytics_events_product_idx on public.analytics_events (product_id) where product_id is not null;

-- Identifica sessão de admin (autenticada e NÃO anônima)
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select auth.role() = 'authenticated'
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;

-- CHAT AO VIVO (visitante <-> admin)
create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null unique references auth.users(id) on delete cascade,
  visitor_name text,
  status text not null default 'aberto' check (status in ('aberto', 'fechado')),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index chat_conversations_last_message_idx on public.chat_conversations (last_message_at desc);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender text not null check (sender in ('visitor', 'admin')),
  body text not null check (char_length(trim(body)) > 0),
  is_read_by_admin boolean not null default false,
  created_at timestamptz not null default now()
);
create index chat_messages_conversation_idx on public.chat_messages (conversation_id, created_at);

-- Toda mensagem nova atualiza last_message_at da conversa (security definer: visitante
-- não precisa de permissão extra pra isso acontecer automaticamente)
create or replace function public.touch_chat_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.chat_conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;
create trigger chat_messages_touch_conversation
after insert on public.chat_messages for each row execute function public.touch_chat_conversation();

-- RLS
alter table public.products enable row level security;
alter table public.site_content enable row level security;
alter table public.orders enable row level security;
alter table public.analytics_events enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

create policy "public read active products" on public.products for select using (is_active = true);
create policy "public read site content" on public.site_content for select using (true);

create policy "admin manage products" on public.products for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin manage site content" on public.site_content for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public insert orders" on public.orders for insert with check (true);
create policy "admin read orders" on public.orders for select using (auth.role() = 'authenticated');
create policy "admin update orders" on public.orders for update using (auth.role() = 'authenticated');
create policy "admin delete orders" on public.orders for delete using (auth.role() = 'authenticated');

create policy "public insert analytics" on public.analytics_events for insert with check (true);
create policy "admin read analytics" on public.analytics_events for select using (auth.role() = 'authenticated');

create policy "visitor select own conversation" on public.chat_conversations for select using (visitor_id = auth.uid());
create policy "visitor insert own conversation" on public.chat_conversations for insert with check (visitor_id = auth.uid());
create policy "visitor update own conversation" on public.chat_conversations for update using (visitor_id = auth.uid()) with check (visitor_id = auth.uid());
create policy "admin select all conversations" on public.chat_conversations for select using (public.is_admin());
create policy "admin update conversations" on public.chat_conversations for update using (public.is_admin()) with check (public.is_admin());

create policy "visitor select own messages" on public.chat_messages for select using (
  exists (select 1 from public.chat_conversations c where c.id = conversation_id and c.visitor_id = auth.uid())
);
create policy "visitor insert own messages" on public.chat_messages for insert with check (
  sender = 'visitor' and exists (select 1 from public.chat_conversations c where c.id = conversation_id and c.visitor_id = auth.uid())
);
create policy "admin select all messages" on public.chat_messages for select using (public.is_admin());
create policy "admin insert admin messages" on public.chat_messages for insert with check (sender = 'admin' and public.is_admin());
create policy "admin mark messages read" on public.chat_messages for update using (public.is_admin()) with check (public.is_admin());

alter publication supabase_realtime add table public.chat_conversations;
alter publication supabase_realtime add table public.chat_messages;

-- Número de WhatsApp editável (seed inicial, trocar depois pelo painel admin)
insert into public.site_content (key, value)
values ('whatsapp_number', '"5511999999999"'::jsonb)
on conflict (key) do nothing;

-- STORAGE (bucket de imagens do admin)
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "public read media" on storage.objects for select using (bucket_id = 'media');
create policy "admin upload media" on storage.objects for insert
  with check (bucket_id = 'media' and auth.role() = 'authenticated');
create policy "admin update media" on storage.objects for update
  using (bucket_id = 'media' and auth.role() = 'authenticated');
create policy "admin delete media" on storage.objects for delete
  using (bucket_id = 'media' and auth.role() = 'authenticated');
