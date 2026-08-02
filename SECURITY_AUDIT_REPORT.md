# BASE7 SYSTEM MODA — SECURITY AUDIT REPORT

**Data:** 2026-07-31
**Tipo:** Static Application Security Review (code review manual, sem alterações de código)
**Escopo:** repositório local (`base7web-system-moda`), migrations Supabase, Edge Functions, frontend React
**Metodologia:** leitura direta de código/schema, `npm audit`, grep/secret scanning, testes read-only de RLS e endpoints via chamadas HTTP não-destrutivas. **Nenhum código foi alterado.**

> Nada foi deployado em produção ainda (regra do projeto: tudo roda em localhost até validação). O ambiente auditado é o estado atual do repositório + o banco Supabase de desenvolvimento já usado nas fases anteriores.

---

## 1. Resumo executivo

Foram encontradas **13 questões** documentadas, sendo a mais grave uma **falha crítica de integridade de preço** (SEC-001): o backend nunca recalcula o valor de um pedido a partir dos preços reais dos produtos — ele confia inteiramente no que o frontend envia. Isso afeta Pix, Cartão e a futura emissão de NFC-e, e é explorável hoje sem nenhuma credencial, só com a `anon key` pública.

A segunda mais grave (SEC-002) é uma **política de RLS esquecida**: a migration que corrigiu o bug "qualquer visitante anônimo tem acesso de admin" (migration 0003) não cobriu a tabela `analytics_events`, que ainda hoje pode ser lida por qualquer visitante do site.

O restante são questões de **defesa em profundidade** (headers ausentes, CORS permissivo, validação de upload só no cliente, dependências desatualizadas) e **débito técnico documentado** (overload de função possivelmente ainda ativo no banco, checagem de admin que não escala para múltiplos usuários).

Pontos **positivos confirmados**: validação de assinatura do webhook do Mercado Pago está correta (HMAC + nunca confia no corpo da notificação), credenciais externas (Mercado Pago e Focus NFe) ficam em tabelas sem nenhuma policy de RLS pública, nenhum segredo hardcoded foi encontrado no código versionado, e não há uso de `dangerouslySetInnerHTML` com dado controlado por usuário.

---

## 2. Arquitetura analisada

- **Frontend**: React 18 + TypeScript + Vite, SPA (React Router), TanStack Query, Tailwind + shadcn/ui. Deploy estático (Vercel — `vercel.json` só tem rewrite de SPA).
- **Backend**: não existe backend próprio (Node/Express etc.). Toda lógica server-side vive em **Supabase** — Postgres com Row Level Security (RLS), funções `SECURITY DEFINER` (RPCs) e **Edge Functions (Deno)** para tudo que precisa de segredo (Mercado Pago, Focus NFe).
- **Banco**: Postgres gerenciado pelo Supabase. Sem ORM — SQL puro em `supabase/migrations/*.sql`, tipos TypeScript mantidos manualmente em paralelo (`src/types/db.ts`).
- **Autenticação**: Supabase Auth. Um único usuário admin fixo (e-mail/senha). Visitantes do site recebem sessão **anônima** automaticamente (`signInAnonymously()`) para o chat ao vivo.
- **Autorização**: RLS no Postgres, com uma função `public.is_admin()` (`role = authenticated AND is_anonymous = false`) usada como padrão principal de policy administrativa.
- **Integrações externas**: Mercado Pago (credenciais diretas por instalação, sem OAuth) e Focus NFe (mesmo modelo, ainda sem conta real conectada).
- **Infraestrutura**: sem Docker, sem Nginx, sem VPS própria — confirmado que nenhum desses arquivos existe no repositório. Hospedagem é 100% gerenciada (Supabase + Vercel).

---

## 3. Superfície de ataque

| Camada | Exposta a | Observação |
|---|---|---|
| Storefront público (`/`, `/loja`, `/produto/:id`) | Internet, sem autenticação | Leitura de produtos ativos, criação de pedidos, chat |
| `create_order` (RPC) | `anon` (qualquer um) | **Ver SEC-001** |
| `find_or_create_customer` (RPC) | `anon` | Chamada indiretamente por `create_order`; grava em `customers` |
| `POST /rest/v1/orders` direto | `anon` (RLS permite insert com `customer_id is null`) | **Ver SEC-001** — path alternativo que contorna até a RPC |
| Edge Functions de pagamento (`mercadopago-create-payment`, `mercadopago-create-card-payment`) | `anon` | Usam `order.total` sem recálculo — herdam SEC-001 |
| Edge Function de webhook (`mercadopago-webhook`) | Mercado Pago (público, sem JWT — `verify_jwt=false`) | Protegida por validação HMAC própria — OK |
| Edge Functions administrativas (`*-save-credentials`, `focusnfe-emit-nfce`, `focusnfe-cancel-nfce`) | Qualquer sessão **não-anônima** | **Ver SEC-006** |
| `/admin/*` (painel) | Sessão não-anônima (login real) | Protegido no frontend (`RequireAuth`) e no banco (RLS `is_admin()`) |
| `analytics_events` (tabela) | **Qualquer visitante anônimo** | **Ver SEC-002** |
| Bucket `media` (Storage) | Leitura pública; escrita só admin | **Ver SEC-008/SEC-009** |

---

## 4. Vulnerabilidades críticas

### SEC-001 — Manipulação de preço/total do pedido (Broken Access Control / Insecure Design)

```
ID: SEC-001
Título: create_order (e insert direto em orders) não recalcula preço/total no backend
Severidade: 🔴 CRITICAL
CVSS aproximado: 8.6 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N)
Categoria: OWASP A04:2021 Insecure Design / A01:2021 Broken Access Control (CWE-840, CWE-20)
Arquivo: supabase/migrations/0005_orders_checkout.sql (linhas 53-85), 0007_delivery.sql (linhas 93-129)
Endpoint: RPC public.create_order (grant to anon) e POST /rest/v1/orders (RLS: insert with check (customer_id is null))
```

**Descrição:** `create_order` recebe `p_total`, `p_items` (jsonb com `price` por item) e `p_shipping_fee` diretamente do cliente e os grava em `orders` sem NENHUMA validação contra `products.price` ou `delivery_methods.price`. Não há recomputação server-side do valor do pedido em nenhum ponto do fluxo.

**Impacto:** qualquer pessoa com a `anon key` pública (a mesma usada pelo próprio frontend, visível no bundle JS) pode:
- Criar um pedido de um produto real de R$1000 informando `p_total = 0.01` e `p_items[0].price = 0.01`.
- `mercadopago-create-payment`/`mercadopago-create-card-payment` usam `order.total` (exatamente o valor gravado, não verificado) para gerar o cobrança real no Mercado Pago — ou seja, o cliente pagaria de fato só R$0,01 e, se confirmado, o webhook marcaria o pedido como "pago" (o webhook está correto quanto a **status**, mas nunca teve como saber que o valor cobrado era fraudulento, porque o valor cobrado É o valor manipulado).
- O mesmo vale para `focusnfe-emit-nfce`, que usaria esse valor manipulado na nota fiscal.
- Também é possível pular a RPC inteiramente e fazer `POST /rest/v1/orders` direto (a policy `public insert orders` só exige `customer_id is null`), inserindo qualquer combinação de `items`/`total`/`payment_method` sem passar por `find_or_create_customer` nem por qualquer verificação.

**Evidência:** leitura direta de `create_order()` (0005/0007) — `insert into orders (..., items, total, ...) values (..., p_items, p_total, ...)`, sem `select price from products where id = ...` em nenhum lugar do fluxo de checkout (backend). Também confirmado que `mercadopago-create-payment/index.ts` faz `const amount = order.total.toFixed(2);` direto, e `focusnfe-emit-nfce/index.ts` usa `item.price`/`order.total` do pedido gravado.

**Como reproduzir (conceitual, não executado):**
```
POST {SUPABASE_URL}/rest/v1/rpc/create_order
apikey: <anon key pública>
{
  "p_customer_name": "Teste",
  "p_customer_phone": "11999999999",
  "p_delivery_type": "retirada",
  "p_address": null,
  "p_payment_method": "pix",
  "p_items": [{"product_id": "<uuid real>", "name": "Produto Caro", "price": 0.01, "quantity": 1, "size": null}],
  "p_total": 0.01
}
```
→ pedido gravado com total R$0,01; `mercadopago-create-payment` geraria um Pix de R$0,01 para um produto que custa muito mais.

**Correção recomendada:** dentro de `create_order` (SQL, `SECURITY DEFINER`), para cada item de `p_items`, buscar `products.price` real pelo `product_id` e recalcular `valor_bruto`/`total` no servidor, ignorando o `price` recebido do cliente. Rejeitar (`raise exception`) se o total recalculado divergir do esperado, se algum `product_id` não existir, estiver inativo, ou (se aplicável) sem estoque. Fazer o mesmo para `shipping_fee` contra `delivery_methods.price`. Também remover/restringir a policy `public insert orders` para não aceitar mais inserts diretos fora da função (ou replicar a mesma validação via trigger `BEFORE INSERT`).

---

## 5. Vulnerabilidades altas

### SEC-002 — `analytics_events` legível por qualquer visitante anônimo (Broken Access Control)

```
ID: SEC-002
Título: policy RLS de analytics_events não foi migrada para is_admin()
Severidade: 🟥 HIGH
CVSS aproximado: 6.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N)
Categoria: OWASP A01:2021 Broken Access Control (CWE-284)
Arquivo: supabase/migrations/0001_init.sql:115 (não corrigido por 0003_rls_is_admin.sql)
Endpoint: GET /rest/v1/analytics_events?select=*
```

**Descrição:** a migration `0003_rls_is_admin.sql` foi criada especificamente para corrigir o bug "`auth.role() = 'authenticated'` também é verdade para sessões anônimas" nas tabelas `products`, `site_content`, `orders`, `product_reviews` e no bucket `media` — mas **não cobriu `analytics_events`**, que manteve a policy antiga: `create policy "admin read analytics" on public.analytics_events for select using (auth.role() = 'authenticated');`.

**Impacto:** o `ChatWidget` (`src/components/ChatWidget.tsx`) é montado incondicionalmente em `PublicLayout` (toda página pública) e chama `useVisitorSession()` no mount, que executa `supabase.auth.signInAnonymously()` **automaticamente, sem interação do visitante**. Uma sessão anônima tem `role: authenticated` no JWT (só `is_anonymous` é `true`). Como a policy de `analytics_events` checa apenas `role = authenticated`, **qualquer pessoa que apenas abra o site** consegue ler a tabela inteira de analytics (todos os `page_view`/`product_view`, `session_id`, `path`, timestamps de todos os visitantes) com uma chamada direta ao PostgREST.

**Evidência:** confirmado lendo `0001_init.sql:115`, `0003_rls_is_admin.sql` (lista exata de tabelas corrigidas, sem `analytics_events`), `src/hooks/useVisitorChat.ts:19` (`signInAnonymously()`) e `src/components/PublicLayout.tsx:18`/`ChatWidget.tsx:8` (montagem incondicional).

**Correção recomendada:**
```sql
drop policy "admin read analytics" on public.analytics_events;
create policy "admin read analytics" on public.analytics_events for select using (public.is_admin());
```

### SEC-003 — Possível overload duplicado de `create_order` ainda ativo no banco

```
ID: SEC-003
Título: função create_order pode existir em duas versões simultâneas (7 e 11 parâmetros)
Severidade: 🟥 HIGH (se confirmado) — Security Misconfiguration / Software Integrity Failure
Categoria: OWASP A08:2021 Software and Data Integrity Failures
Arquivo: supabase/migrations/0007_delivery.sql (cria overload de 11 params), 0009_fix_create_order_overload.sql (deveria remover a de 7)
```

**Descrição:** `CREATE OR REPLACE FUNCTION` só substitui quando a assinatura é idêntica. A migration 0007 adicionou 4 parâmetros opcionais, criando uma SEGUNDA função em vez de substituir a original — migration 0009 foi escrita para `drop function ... create_order(text,text,text,text,text,jsonb,numeric)` (a versão antiga de 7 parâmetros).

**Evidência concreta**: durante testes reais **nesta mesma sessão de trabalho** (fase de integração Mercado Pago), uma chamada a `create_order` usando só os 7 parâmetros originais retornou:
```
PGRST203: Could not choose the best candidate function between:
public.create_order(... 7 params ...), public.create_order(... 11 params ...)
```
Isso só acontece se **ambas as versões existirem simultaneamente** no banco — ou seja, a migration 0009 não foi (ou não pôde ser) aplicada com sucesso no ambiente de desenvolvimento usado até agora, apesar de constar no repositório. Não foi re-testado nesta auditoria (evitando escrita no banco), então:

> ⚠️ **NÃO VERIFICADO NO MOMENTO DESTA AUDITORIA** se o problema persiste — a evidência acima é de um teste anterior, real, dentro da mesma sessão de desenvolvimento. Recomenda-se confirmar rodando `select oid, proname, pronargs from pg_proc where proname = 'create_order';` no SQL Editor.

**Impacto se persistir:** comportamento de despacho do PostgREST imprevisível dependendo de quais parâmetros nomeados o cliente envia — pode silenciosamente ignorar validações/campos novos (frete, método de entrega) se a versão antiga for escolhida, ou quebrar chamadas legítimas.

**Correção recomendada:** reaplicar/confirmar a migration 0009; adicionar uma verificação de "número de funções `create_order` = 1" como smoke test pós-deploy.

---

## 6. Vulnerabilidades médias

### SEC-004 — Sem validação de estoque na criação do pedido (Insecure Design)
```
ID: SEC-004 | Severidade: 🟠 MEDIUM | Categoria: OWASP A04 Insecure Design (CWE-841)
Arquivo: supabase/migrations/0005_orders_checkout.sql, 0006_stock.sql
```
`create_order` nunca consulta `product_stock`. A baixa de estoque só acontece (clampada em `GREATEST(0, ...)`) depois que o pedido é marcado como pago — ou seja, é possível vender infinitas unidades de um produto esgotado; o lojista só descobre depois. Não há policy pública de leitura em `product_stock` nem RPC pública para o storefront checar disponibilidade antes de finalizar a compra.
**Correção recomendada:** validar quantidade disponível dentro de `create_order` (com lock/atualização atômica) e rejeitar itens sem estoque suficiente; expor uma RPC pública somente-leitura de disponibilidade para a loja mostrar "esgotado" antes do checkout.

### SEC-005 — Ausência de security headers em produção
```
ID: SEC-005 | Severidade: 🟠 MEDIUM | Categoria: OWASP A05 Security Misconfiguration
Arquivo: vercel.json
```
`vercel.json` só define o rewrite de SPA. Não há `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` ou `Strict-Transport-Security` configurados explicitamente.
> ⚠️ Vercel pode aplicar alguns headers/HTTPS por padrão na borda — **não verificado nesta auditoria** por não haver deploy ativo para inspecionar as respostas reais.
**Correção recomendada:** adicionar um bloco `"headers"` em `vercel.json` com CSP restritiva (permitindo Supabase, Mercado Pago SDK, Focus NFe), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

### SEC-006 — Autorização "admin" via "não-anônimo" em vez de role explícita
```
ID: SEC-006 | Severidade: 🟠 MEDIUM (latente — não explorável hoje) | Categoria: OWASP A01 Broken Access Control
Arquivo: supabase/functions/mercadopago-save-credentials/index.ts, focusnfe-save-credentials/index.ts, focusnfe-emit-nfce/index.ts, focusnfe-cancel-nfce/index.ts
```
Todas as Edge Functions administrativas checam apenas `!user || user.is_anonymous` — ou seja, qualquer sessão autenticada **não-anônima** passa, não especificamente o admin. Hoje isso é equivalente na prática (só existe um usuário fixo, o admin), mas é o **mesmo padrão de risco já documentado internamente no projeto** (ver `project_architecture.md`: "policies de admin usam `auth.role()='authenticated'`... se for criado login real de cliente sem corrigir isso, clientes autenticados ganhariam acesso administrativo"). No dia em que o sistema ganhar login real de clientes (item já cogitado no roadmap), qualquer cliente logado poderá salvar credenciais do Mercado Pago/Focus NFe ou emitir/cancelar notas fiscais.
**Correção recomendada:** trocar a checagem por uma chamada real a `public.is_admin()` (via RPC ou checando um claim/role específico), não apenas "não é anônimo".

---

## 7. Vulnerabilidades baixas

### SEC-007 — CORS wildcard em todas as Edge Functions
```
ID: SEC-007 | Severidade: 🟡 LOW | Categoria: OWASP A05 Security Misconfiguration
Arquivo: supabase/functions/_shared/cors.ts
```
`"Access-Control-Allow-Origin": "*"` aplicado a todas as funções, incluindo as que lidam com credenciais (`*-save-credentials`) e ações administrativas. Como a autenticação é via Bearer token (não cookie), o wildcard não abre CSRF clássico, mas é desnecessariamente permissivo — qualquer site conseguiria ler a resposta de uma chamada autenticada feita por JS de terceiros, **se** conseguisse obter um token válido por outro meio.
**Correção recomendada:** restringir `Access-Control-Allow-Origin` ao(s) domínio(s) reais do frontend em produção.

### SEC-008 — Validação de upload só no cliente
```
ID: SEC-008 | Severidade: 🟡 LOW (requer sessão admin já comprometida) | Categoria: OWASP A05 / CWE-434
Arquivo: src/components/admin/ImageUploader.tsx
```
`accept="image/png,image/jpeg,image/webp"` e o limite de 5MB são checados só no navegador. A policy de Storage (`admin upload media`) só valida `bucket_id` + `is_admin()`, não tipo de conteúdo. Um admin (ou uma sessão de admin sequestrada) poderia enviar qualquer tipo de arquivo (SVG com script embutido, HTML) para o bucket `media`, que é **público para leitura**.
**Correção recomendada:** restringir tipos de arquivo permitidos no próprio bucket do Supabase Storage (`allowed_mime_types`), e/ou validar magic bytes no Edge Function antes do upload.

### SEC-009 — Nome de arquivo não sanitizado no upload
```
ID: SEC-009 | Severidade: 🟡 LOW | Categoria: CWE-73 (path/object-key injection)
Arquivo: src/components/admin/ImageUploader.tsx:28
```
`path = ${folder}/${crypto.randomUUID()}-${file.name}` usa `file.name` sem sanitização. Em um object-store S3-like isso não é directory traversal real, mas caracteres como `/` no nome do arquivo podem escapar do prefixo de pasta pretendido dentro do mesmo bucket.
**Correção recomendada:** sanitizar `file.name` (remover `/`, `..`, caracteres de controle) antes de compor o path.

---

## 8. Informações / melhorias

- **SEC-010** 🔵 `vite.config.ts` mantém `allowedHosts: [".trycloudflare.com"]`, remanescente dos testes de OAuth do Mercado Pago (já abandonado). Só afeta o servidor de desenvolvimento local, não a build de produção — recomenda-se remover por higiene.
- **SEC-011** 🔵 Arquivo solto não rastreado na raiz do repositório: `UsersG7...pix_teste_r1.png` (artefato de um teste de QR code Pix desta sessão). Não é segredo sensível, mas deveria ser removido/ignorado.
- **SEC-012** 🔵 `npm audit`: 1 CRITICAL (`vitest`, dependência de teste, não vai para o bundle de produção), 15 HIGH (a maioria em devDependencies de build — `vite`, `rollup`, `esbuild`, `postcss` — **mas `react-router-dom@6.30.1` é dependência de produção direta e está na faixa afetada** por um advisory HIGH do `npm audit`, com correção disponível). Recomenda-se `npm audit fix` / atualização manual do `react-router-dom` e revisão das devDependencies.
- **SEC-013** 🔵 Sessão do admin (JWT do Supabase Auth) fica em `localStorage` (comportamento padrão do `supabase-js`, sem storage customizado). Isso é o padrão aceito para SPAs sem backend de sessão próprio, mas significa que qualquer XSS futuro teria acesso direto ao token — reforça a importância de nunca introduzir `dangerouslySetInnerHTML` com dado de usuário (hoje não há nenhum caso disso).

---

## 9. Secrets encontrados

**Nenhum segredo hardcoded foi encontrado** em arquivos versionados (`src/`, `supabase/`, `*.json`, `*.md`) — busca por padrões de token do Mercado Pago (`APP_USR-`, `TEST-`), tokens JWT (`eyJ...`), chaves `sb_secret_`/`sb_publishable_` não retornou nenhuma ocorrência fora de `node_modules`.

- `.env.local` (contém `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, ambos **destinados a serem públicos** por design do Supabase) está corretamente coberto pelo `.gitignore` (`*.local`) e **não está** no histórico do git (`git ls-files` só lista `.env.example`, que tem apenas placeholders).
- Nenhum arquivo `.pem`, `.pfx`, `.p12` (certificado digital) encontrado no repositório — consistente com a arquitetura combinada (o certificado A1 do Focus NFe fica no painel deles, nunca no nosso sistema).
- Nenhum dado pessoal (CPF/e-mail/telefone) encontrado hardcoded em código ou fixtures versionadas além dos dados de exemplo do `scripts/seed.ts` (dados fictícios de demonstração).

---

## 10. Authentication

- Login usa `supabase.auth.signInWithPassword` (hashing/gerenciamento de senha delegado ao Supabase Auth — não há hashing customizado no código, o que é positivo).
- Não existe fluxo de cadastro público de admin, nem recuperação de senha implementada no app (mudança de senha, se necessária, seria feita direto no painel do Supabase) — reduz superfície de ataque, mas também significa que não há "esqueci minha senha" para o lojista dentro do produto (nota operacional, não vulnerabilidade).
- `RequireAuth` bloqueia corretamente qualquer sessão ausente **ou anônima** das rotas `/admin/*`.
- `AdminLogin.tsx` redireciona sessões já autenticadas (não-anônimas) para longe da tela de login corretamente.
- ⚠️ **NÃO VERIFICADO**: rate limiting / proteção a brute-force no endpoint de login do Supabase Auth — depende de configuração da plataforma Supabase (projeto hospedado), sem acesso ao painel de configurações de Auth para confirmar.
- ⚠️ **NÃO VERIFICADO**: política de expiração/revogação de refresh tokens (configuração padrão do Supabase, não customizada no código, não inspecionada no painel).

## 11. Authorization

Ver Seções 4-6 (SEC-001, SEC-002, SEC-006) para os achados concretos. Resumo do mapeamento de IDOR/BOLA:

| Recurso | Identificador | Exposto a | Resultado |
|---|---|---|---|
| `orders` (leitura) | `id` (uuid) | admin apenas (RLS `is_admin()`) | OK |
| `orders` (escrita/criação) | — | `anon` via RPC ou insert direto | **SEC-001** |
| `get_order_payment_status(uuid)` | `order_id` (uuid) | `anon`/`authenticated` | Escopo mínimo (só `payment_status`/`status`); UUID não é adivinhável — risco residual baixo, aceitável pelo design (necessário para polling anônimo do checkout) |
| `customers`/`customer_addresses` | — | só admin (RLS) + RPC `security definer` restrita | OK |
| `analytics_events` | — | deveria ser só admin | **SEC-002** |
| `mercadopago_credentials`/`focusnfe_credentials` | — | zero policies (só service_role) | OK — nunca acessível via PostgREST/RLS, só pelas Edge Functions com service role key |
| Edge Functions admin (`*-save-credentials`, `focusnfe-emit/cancel-nfce`) | — | qualquer não-anônimo | **SEC-006** |

## 12. API Security

| Método | Endpoint | Auth | Risco |
|---|---|---|---|
| POST | `/rest/v1/rpc/create_order` | anon | **SEC-001** |
| POST | `/rest/v1/orders` (insert direto) | anon (RLS) | **SEC-001** |
| GET | `/rest/v1/rpc/get_order_payment_status` | anon | Baixo (escopo mínimo) |
| POST | `functions/v1/mercadopago-create-payment` | anon | Herda SEC-001 (usa `order.total`) |
| POST | `functions/v1/mercadopago-create-card-payment` | anon | Herda SEC-001; tokenização de cartão feita no cliente via Brick oficial (número/CVV nunca chegam ao backend) — correto |
| POST | `functions/v1/mercadopago-webhook` | nenhuma (verify_jwt=false) + HMAC próprio | OK — assinatura validada, nunca confia no corpo |
| POST | `functions/v1/mercadopago-save-credentials` | não-anônimo | **SEC-006** |
| POST | `functions/v1/focusnfe-save-credentials` | não-anônimo | **SEC-006** |
| POST | `functions/v1/focusnfe-emit-nfce` | não-anônimo | **SEC-006** |
| DELETE (via POST) | `functions/v1/focusnfe-cancel-nfce` | não-anônimo | **SEC-006** |

Mensagens de erro das Edge Functions são, em geral, genéricas (`"Erro inesperado."`) para falhas não previstas, mas alguns caminhos propagam `err.message` diretamente na resposta (ex.: `getFocusNfeConfig`/`getValidAccessToken` lançam mensagens como `"Focus NFe não está conectado."`) — são mensagens de negócio inofensivas hoje, mas o padrão de "devolver `err.message` cru" é frágil: uma exceção inesperada do driver do Postgres poderia, em tese, vazar detalhes internos. Classificado como observação (não elevado a vulnerabilidade por não ter sido observado nenhum vazamento real).

## 13. Mercado Pago

- **Sem OAuth**, confirmado — modelo de credenciais diretas por instalação (`mercadopago_credentials`, singleton, zero RLS policies).
- Access Token nunca é devolvido ao frontend em nenhuma resposta de Edge Function revisada (`save-credentials` retorna só `{ok:true}`; `create-payment`/`create-card-payment` retornam apenas dados de exibição do QR/status).
- Public Key é exposta **intencionalmente** via `get_mercadopago_public_key()` (RPC `anon`) — correto, é o equivalente à publishable key do Stripe, necessária para o Brick de cartão no navegador.
- **Cálculo do valor**: ver SEC-001 — o backend usa `order.total`, que por sua vez não é validado contra os produtos reais.
- Pagamento duplicado: `mercadopago-create-payment`/`create-card-payment` verificam `if (order.mp_payment_id) return 409` antes de criar um novo pagamento — protege contra reprocessar o mesmo pedido duas vezes. OK.
- Associação pagamento↔pedido: feita via `X-Idempotency-Key: order.id` e `external_reference: order.id` — consistente.

## 14. Webhooks

- **Mercado Pago**: assinatura HMAC-SHA256 validada (`x-signature` com `ts`/`v1`), comparação com `timingSafeEqual` (constante no tempo), e — mais importante — **o status nunca é lido do corpo da notificação**: a função sempre refaz `GET /v1/orders/{id}` na API do Mercado Pago antes de decidir o status. Isso neutraliza diretamente o ataque descrito na Fase 9 do escopo pedido ("`POST /webhook status=approved` sem transação real") — um payload forjado não teria assinatura válida, e mesmo que tivesse, o status usado seria sempre o real, consultado na origem.
- Idempotência: tabela `payment_webhook_events` com `unique (mp_payment_id, mp_status)` — reenvio da mesma notificação não reprocessa. Testado e confirmado funcionando nesta mesma sessão de desenvolvimento (replay do mesmo evento não duplicou baixa de estoque).
- **Focus NFe**: não há webhook implementado ainda para NFC-e (a emissão é síncrona por design da própria API do Focus NFe — a resposta do POST já traz o resultado final). Não há, portanto, superfície de "webhook forgery" nessa integração hoje.

## 15. Focus NFe

- Token de API armazenado em `focusnfe_credentials` (zero RLS policies, só service_role).
- **Certificado digital A1 e a senha dele NUNCA tocam o sistema Base7** — por decisão de arquitetura, o certificado é cadastrado direto no painel do Focus NFe pelo próprio lojista. Portanto os itens do escopo pedido "certificado pode ser baixado", "senha aparece em logs" são **N/A para este sistema** (não existe código nosso que manipule certificado/senha).
- Emissão (`focusnfe-emit-nfce`) e cancelamento (`focusnfe-cancel-nfce`) são restritos a sessão não-anônima — ver SEC-006 para a ressalva sobre essa checagem não ser um `is_admin()` explícito.
- XML/DANFE: os links (`caminho_danfe`, XML) retornados pela API do Focus NFe são armazenados como URL no pedido (`nfce_danfe_url`) — essas URLs são geradas e hospedadas pelo próprio Focus NFe, fora do nosso controle de acesso; não foi possível avaliar se são publicamente acessíveis por qualquer um com o link (comportamento do Focus NFe, não do Base7). ⚠️ **NÃO VERIFICADO** (depende de uma conta real conectada, que ainda não existe).
- Dados fiscais por produto (NCM/CFOP/ICMS) só editáveis pelo admin (RLS `is_admin()` na tabela `products`).

## 16. NFC-e

Nenhuma nota fiscal real foi emitida até hoje (sem conta Focus NFe conectada). O fluxo de emissão:
- É sempre **manual** (botão no admin), nunca automático ao confirmar pagamento — reduz risco de emissão indevida por bug de automação.
- Bloqueia a emissão se o produto não tiver NCM cadastrado (`focusnfe-emit-nfce` verifica antes de chamar a API externa).
- Cancelamento restrito à janela de 30 minutos definida pela própria SEFAZ/Focus NFe, validado tanto no frontend quanto (implicitamente) pela API do Focus NFe.
- ⚠️ Não verificável em produção real (nenhuma nota real emitida ainda).

## 17. Checkout

Ver SEC-001 (preço/total) e SEC-004 (estoque). Cenários testados conceitualmente conforme pedido:

| Cenário | Resultado |
|---|---|
| Preço negativo/zero enviado pelo cliente | **Aceito** — sem validação (parte de SEC-001) |
| Quantidade negativa/zero | **Aceito** — `p_items` é jsonb livre, sem checagem de `quantity > 0` |
| Frete zerado/negativo quando deveria ter custo | **Aceito** — `p_shipping_fee` client-supplied (parte de SEC-001) |
| Desconto maior que o pedido / negativo | `discount_amount` tem `check (>= 0)` no schema, mas nada impede um valor absurdamente alto (ex. maior que o total) — sem validação de coerência |
| Produto inexistente | **Aceito** — `p_items` não é validado contra `products` |
| Produto desativado (`is_active=false`) | **Aceito** — mesma causa |
| Produto sem estoque | **Aceito** — ver SEC-004 |
| Pedido duplicado / pagamento duplicado | Pagamento duplicado é bloqueado (`mp_payment_id` já setado → 409); pedido duplicado (múltiplos `create_order` idênticos) não tem nenhuma proteção, mas não é por si só uma vulnerabilidade de segurança (é possível gerar spam de pedidos "novo" — ver SEC-004/rate limiting) |

## 18. Estoque

- Baixa de estoque é atômica via trigger de banco (`decrement_stock_on_payment`, dispara em `UPDATE ... when payment_status='pago'`), usando `UPDATE ... SET quantity = GREATEST(0, quantity - X)` — isso é uma operação atômica no nível de linha do Postgres, então **duas confirmações de pagamento simultâneas para pedidos diferentes não corrompem o estoque entre si** (cada `UPDATE` é serializado pelo próprio banco).
- Porém, como o pedido nunca é bloqueado por falta de estoque na criação (SEC-004), múltiplos clientes podem "comprar" a mesma última unidade simultaneamente — o estoque não fica negativo (protegido pelo `GREATEST(0, ...)`), mas **múltiplos pedidos podem ser confirmados como pagos para o mesmo item esgotado**, e a inconsistência (vender mais do que existe) só aparece como estoque em zero sem refletir o excesso de pedidos pagos. Isso é uma falha de lógica de negócio, não uma race condition técnica no banco.

## 19. Clientes e dados pessoais

- `customers`/`customer_addresses`: RLS restrita a `is_admin()`, sem nenhuma policy pública de leitura — clientes não conseguem ler dados de outros clientes via API direta.
- `find_or_create_customer` é `SECURITY DEFINER`, então o checkout público consegue criar/atualizar um registro de cliente **sem ter acesso de leitura/escrita direto** à tabela — desenho correto (privilégio mínimo).
- Dados pessoais trafegam em `orders.items`/`customer_name`/`customer_phone`/`address` como texto livre — acessível só pelo admin (RLS). Não foi encontrada nenhuma rota que devolva esses campos para o público.
- Nenhuma exportação/relatório (`AdminRelatorios.tsx`) foi identificada expondo dados além do que o próprio admin já vê na listagem de pedidos.

## 20. Entregas e frete

- Cálculo de frete (`shipping_fee`) é feito **no frontend** (`src/lib/deliveryMatching.ts`, não lido em detalhe nesta auditoria por já estar coberto pela conclusão de SEC-001) e enviado como parâmetro pronto pro backend — mesma causa raiz de SEC-001: o valor final de frete nunca é conferido contra `delivery_methods.price` no servidor.
- Seleção de região não atendida: `delivery_method_areas` tem policies de leitura pública só de métodos ativos; a validação de "esse CEP está na área de cobertura" acontece no frontend (`matchDeliveryMethods`) — um cliente poderia, em tese, enviar um `delivery_method_id` de um método que não atende o CEP dele, já que o backend (`create_order`) não valida a compatibilidade CEP↔método. Impacto operacional (entrega prometida incorretamente) mais do que um risco de segurança direto — mas está no mesmo balde de "backend não valida o que o frontend calculou" do SEC-001.

## 21. Uploads

Ver SEC-008/SEC-009. Único ponto de upload no sistema é `ImageUploader.tsx` (imagens de produto/conteúdo), restrito por RLS a sessão admin. Não há upload de certificado digital no Base7 (fica no painel do Focus NFe, fora do nosso sistema) — item do escopo original marcado como **N/A**.

## 22. Banco de dados

- Sem SQL dinâmico/concatenado em nenhuma migration ou Edge Function — todas as queries usam o cliente Supabase (`.eq()`, `.select()`, `.update()`) ou RPCs com parâmetros tipados (`plpgsql`, `$1`/named params via PostgREST), o que **elimina a classe clássica de SQL Injection** por concatenação de string. Nenhuma instância de `EXECUTE format(...)` com input de usuário foi encontrada.
- Credenciais externas (Mercado Pago, Focus NFe) ficam em tabelas dedicadas com **zero policies de RLS** — nem `anon` nem `authenticated` conseguem ler/escrever, só o `service_role` usado pelas Edge Functions. É o padrão mais restritivo possível dentro do modelo do Supabase.
- Backups: gerenciados pela plataforma Supabase — ⚠️ **NÃO VERIFICADO** (fora do escopo de acesso desta auditoria).

## 23. XSS

- Nenhum `dangerouslySetInnerHTML` com dado controlado por usuário foi encontrado (o único uso, em `src/components/ui/chart.tsx`, injeta apenas cores de configuração definidas por código, não input de usuário).
- React escapa por padrão todo conteúdo interpolado em JSX (`{variavel}`), o que cobre os principais pontos de entrada de texto livre auditados (nome do cliente, descrição de produto, mensagens de chat, observações, endereço).
- Não foi realizado fuzzing dinâmico (payloads `<script>`, `<img onerror>` etc. não foram efetivamente submetidos nesta auditoria) — a conclusão é baseada em revisão estática do código-fonte, não em testes dinâmicos.
> **VULNERABILIDADE NÃO ENCONTRADA** via revisão estática. ⚠️ Testes dinâmicos de XSS **não foram executados**.

## 24. Injection

- SQL Injection: **não encontrado** (ver Seção 22).
- Command Injection: não há nenhum uso de `child_process`/`exec`/`eval` no frontend ou nas Edge Functions revisadas.
- SSRF: única chamada de rede a partir de input do usuário é `useCep.ts`, que consulta `viacep.com.br` com o CEP restrito a exatamente 8 dígitos numéricos (regex aplicado antes de montar a URL) — sem espaço para injeção de host/path. Chamadas às APIs do Mercado Pago/Focus NFe usam URLs fixas (`api.mercadopago.com`, `homologacao.focusnfe.com.br`/`api.focusnfe.com.br`), nunca construídas a partir de input do usuário.
- Template Injection / CRLF: não aplicável (sem templates server-side nem headers HTTP montados a partir de input livre).

## 25. Infraestrutura

- Sem Docker, sem Nginx, sem VPS — confirmado por ausência total desses arquivos/configurações no repositório.
- Hospedagem: Vercel (frontend estático) + Supabase (banco/Auth/Storage/Edge Functions), ambos gerenciados.
- `.git` não está exposto publicamente por ser um projeto Vercel (build estático, não serve arquivos arbitrários do working directory) — ⚠️ não verificável sem um deploy ativo para testar `GET /.git/config`.
- Source maps: não verificado se o build de produção gera/expõe source maps (configuração padrão do Vite pode incluir `.map` files publicamente) — ⚠️ **NÃO VERIFICADO**, recomenda-se checar `vite.config.ts`/build output antes de ir a produção.

## 26. Dependências

Resumo do `npm audit` (ver SEC-012 para detalhes): 1 CRITICAL, 15 HIGH, 3 MODERATE, 1 LOW — a maioria em devDependencies de build/test (`vite`, `vitest`, `rollup`, `esbuild`, `postcss`, `js-yaml`, `ajv`, `yaml`, `glob`, `minimatch`, `picomatch`, `brace-expansion`, `flatted`, `form-data`, `ws`, `@tootallnate/once`), **exceto `react-router-dom@6.30.1`** (dependência de produção direta, HIGH, corrigível via atualização). Recomenda-se rodar `npm audit fix` (revisando breaking changes antes de aplicar) fora desta etapa de auditoria.

## 27. OWASP Top 10

| # | Categoria | Status | Evidência |
|---|---|---|---|
| A01 | Broken Access Control | 🔴 **Encontrado** | SEC-001, SEC-002, SEC-006 |
| A02 | Cryptographic Failures | 🔵 Observação | Sessão em `localStorage` (padrão aceito p/ SPA); sem outros achados |
| A03 | Injection | ✅ Não encontrado (revisão estática) | Seção 24 |
| A04 | Insecure Design | 🔴 **Encontrado** | SEC-001 (núcleo do design, não um bug pontual), SEC-004 |
| A05 | Security Misconfiguration | 🟠 **Encontrado** | SEC-005, SEC-007, SEC-010 |
| A06 | Vulnerable Components | 🟡 **Encontrado** | SEC-012 |
| A07 | Identification and Auth Failures | ⚠️ Parcialmente não verificado | Rate limiting/brute force não verificável (Seção 10) |
| A08 | Software and Data Integrity Failures | 🟠 **Encontrado (a confirmar)** | SEC-003 |
| A09 | Security Logging and Monitoring Failures | ⚠️ Não verificado | Sem acesso a logs de produção/alertas configurados; Edge Functions logam erros no console do Supabase (confirmado durante testes desta sessão), mas não há monitoramento/alerta automatizado conhecido |
| A10 | SSRF | ✅ Não encontrado | Seção 24 |

## 28. Threat Model

**Ativos:** dados de clientes (nome/telefone/e-mail/CPF/endereço), pedidos e histórico de compras, credenciais Mercado Pago/Focus NFe, valores monetários dos pedidos, dados fiscais (quando NFC-e existir), configurações administrativas, sessão do admin.

**Atores:** visitante anônimo (com sessão auto-anônima via chat), cliente do checkout (mesma sessão anônima, sem login real hoje), administrador (login único), atacante externo (sem nenhuma credencial, só a `anon key` pública).

**Ameaças avaliadas:**

| Ameaça | Viável hoje? | Referência |
|---|---|---|
| Payment/Price Manipulation | **Sim** | SEC-001 |
| Data Theft (analytics) | **Sim** | SEC-002 |
| IDOR/BOLA | Parcial (baixo risco, escopo mínimo) | Seção 11 |
| Privilege Escalation (futuro, com login de cliente) | Latente | SEC-006 |
| Webhook Forgery | **Não** (mitigado corretamente) | Seção 14 |
| Credential Theft (Mercado Pago/Focus NFe) | Não encontrado | Seção 9 |
| XSS / Account Takeover via XSS | Não encontrado (estático) | Seção 23 |
| SQL Injection | Não encontrado | Seção 24 |
| Brute Force / Credential Stuffing (login admin) | ⚠️ Não verificado | Seção 10 |
| CSRF | Baixo (arquitetura Bearer token, sem sessão por cookie) | Seção 6 (contexto) |

## 29. Plano de correção

Ordem recomendada por risco:

| Prioridade | ID | Ação |
|---|---|---|
| 1 | SEC-001 | Recalcular preço/total/frete no backend (`create_order`), rejeitando itens/valores divergentes dos produtos reais. Restringir insert direto em `orders`. |
| 2 | SEC-002 | Corrigir policy de `analytics_events` para `is_admin()`. |
| 3 | SEC-003 | Confirmar/reaplicar remoção do overload antigo de `create_order`. |
| 4 | SEC-004 | Validar estoque disponível na criação do pedido. |
| 5 | SEC-006 | Trocar checagem "não-anônimo" por `is_admin()` real nas Edge Functions administrativas. |
| 6 | SEC-005 | Adicionar security headers em `vercel.json`. |
| 7 | SEC-007 | Restringir CORS das Edge Functions ao domínio real em produção. |
| 8 | SEC-008 / SEC-009 | Reforçar validação de upload (tipo de arquivo no bucket + sanitizar nome). |
| 9 | SEC-012 | Atualizar `react-router-dom` e revisar demais dependências (`npm audit fix`). |
| 10 | SEC-010 / SEC-011 | Limpeza: remover `allowedHosts` do Vite e o arquivo solto na raiz do repo. |

### Tabela consolidada

| ID | Severidade | Vulnerabilidade | Local | Status |
|---|---|---|---|---|
| SEC-001 | 🔴 CRITICAL | Preço/total do pedido não é recalculado no backend | `create_order` (0005/0007), Edge Functions de pagamento/NFC-e | Aberta |
| SEC-002 | 🟥 HIGH | `analytics_events` legível por qualquer visitante anônimo | `0001_init.sql` (policy não migrada em `0003`) | Aberta |
| SEC-003 | 🟥 HIGH (a confirmar) | Overload duplicado de `create_order` possivelmente ainda ativo | `0007`/`0009` | Aberta — reverificar |
| SEC-004 | 🟠 MEDIUM | Sem validação de estoque na criação do pedido | `create_order` / `product_stock` | Aberta |
| SEC-005 | 🟠 MEDIUM | Sem security headers em produção | `vercel.json` | Aberta |
| SEC-006 | 🟠 MEDIUM (latente) | Autorização admin via "não-anônimo", não role explícita | Edge Functions `*-save-credentials`, `focusnfe-emit/cancel-nfce` | Aberta |
| SEC-007 | 🟡 LOW | CORS wildcard em todas as Edge Functions | `_shared/cors.ts` | Aberta |
| SEC-008 | 🟡 LOW | Validação de upload só no cliente | `ImageUploader.tsx` | Aberta |
| SEC-009 | 🟡 LOW | Nome de arquivo não sanitizado no upload | `ImageUploader.tsx` | Aberta |
| SEC-010 | 🔵 INFO | `allowedHosts` de tunnel esquecido no Vite config | `vite.config.ts` | Aberta |
| SEC-011 | 🔵 INFO | Arquivo solto/artefato de teste na raiz do repo | raiz do projeto | Aberta |
| SEC-012 | 🔵 INFO | Dependências desatualizadas (`react-router-dom` + devDeps) | `package.json` | Aberta |
| SEC-013 | 🔵 INFO | Sessão admin em localStorage (padrão SPA, sem achado adicional) | `src/lib/supabase.ts` | Informativo |
| SEC-014 | 🟠 MEDIUM | Telefone pessoal dos profissionais legível por qualquer visitante anônimo | `0018_barber_catalog.sql` (policy `public read active professionals`) | ✅ Corrigida (`0022_professionals_phone_privacy.sql`) |

---

## Itens explicitamente NÃO VERIFICADOS nesta auditoria

- Rate limiting / brute-force protection no login (Supabase Auth, configuração de plataforma).
- Headers HTTP realmente servidos em produção (sem deploy ativo para inspecionar).
- TLS/HSTS na borda (gerenciado pela Vercel, não testado diretamente).
- Content-Type real servido pelo Supabase Storage para arquivos enviados (não foi feito upload de teste).
- Comportamento de acesso a XML/DANFE hospedados pelo Focus NFe (depende de conta real, ainda não conectada).
- Certificado digital/senha do Focus NFe — **arquiteturalmente fora do sistema Base7** (fica no painel deles).
- Testes dinâmicos de XSS/injeção (nenhum payload foi de fato submetido; análise puramente estática).
- Configuração de rate limiting / DDoS na camada Supabase/Vercel.

---

## Adendo — Domínio de agendamento (BASE7 System Barber, migração de domínio)

**Data:** 2026-08-01
**Escopo:** migrations `0018`–`0021` (`services`, `professionals`, `professional_services`,
`professional_schedules`, `professional_time_off`, `appointments`, `testimonials`) e o
código frontend que as consome. Revisão feita **durante o desenvolvimento** (não é uma
auditoria posterior a um deploy) — aplica o mesmo padrão de rigor do audit original de
2026-07-31 desde o desenho inicial, em vez de corrigir depois.

### Modelo de ameaça aplicado (mesmo do SEC-001)

O agendamento tem exatamente o mesmo risco estrutural que o checkout de e-commerce
(SEC-001): um cliente malicioso pode tentar enviar preço, duração ou disponibilidade
arbitrários. A defesa é a mesma receita já validada no `create_order`:

| Risco | Mitigação | Onde |
|---|---|---|
| Cliente manda preço/duração do serviço | `create_appointment` (RPC `security definer`) relê `services.price`/`duration_minutes` do banco — o parâmetro de entrada nem existe | `0020_barber_appointments.sql` |
| Cliente agenda fora do expediente do profissional | Validado dentro da mesma RPC contra `professional_schedules`, com guarda explícita contra o serviço "atravessar a meia-noite" (edge case corrigido nesta revisão antes do commit) | `0020_barber_appointments.sql` |
| Dois agendamentos sobrepostos pro mesmo profissional (race condition) | **Exclusion constraint** do Postgres (`appointments_no_overlap`, `EXCLUDE USING gist`) — garantia de banco, não de aplicação; vale mesmo sob concorrência e independente do caminho de escrita (RPC ou `UPDATE` direto do admin) | `0020_barber_appointments.sql` |
| Insert direto em `appointments`/`professional_schedules` via REST, contornando a RPC (mesmo path de ataque do SEC-001 original em `orders`) | Nenhuma policy pública de insert/select nessas tabelas — só `is_admin()`. A única forma de criar um agendamento é a RPC (que ignora RLS por ser `security definer`) | `0019_barber_schedules.sql`, `0020_barber_appointments.sql` |
| Leitura da agenda/expediente por visitante anônimo (equivalente ao SEC-002 original) | `professional_schedules`/`professional_time_off`/`appointments` sem policy pública nenhuma — disponibilidade só é exposta via `get_available_slots()` (RPC), nunca por leitura direta da tabela | `0019_barber_schedules.sql` |
| Depoimento publicado sem moderação | Mesma regra de `product_reviews`: insert público só aceito com `status = 'pendente'`; leitura pública só de `status = 'aprovada'` | `0021_testimonials.sql` |

### Resultado

Nenhum achado novo de severidade CRITICAL/HIGH — o domínio nasceu já aplicando as
correções que o audit original (SEC-001/002/003) precisou descobrir depois. Um bug de
lógica (janela de horário cruzando meia-noite indevidamente aceita) foi encontrado e
corrigido em autorrevisão antes do primeiro commit da migration, não em produção.

### Não verificado (mesmas ressalvas do audit original)

Testes dinâmicos de exploração (payloads reais contra um projeto Supabase hospedado)
não foram executados nesta revisão — análise estática de schema/RPC/RLS, como o audit
original. Recomenda-se repetir os testes de SEC-051 (seção "Testes de segurança
específicos" do prompt de migração) contra uma instalação real antes de ir para
produção: tentar criar agendamento com profissional/serviço inexistente, horário
passado, duração manipulada, e duas requisições concorrentes pro mesmo horário.

---

## Adendo 2 — Testes dinâmicos de exploração (FASE 8 / seção 51 do prompt de migração)

**Data:** 2026-08-02
**Tipo:** Dynamic Application Security Testing — ataques reais via HTTP contra o projeto
Supabase de desenvolvimento (`psnebcbluanimlvivykc`), usando só a `anon key` pública
(simulando um visitante sem nenhuma credencial), exatamente como pedido no Adendo 1.

### Achado novo: SEC-014 — Telefone do profissional exposto publicamente

RLS no Postgres é **por linha, não por coluna**: a policy `public read active
professionals` (migration `0018`) libera a linha inteira de qualquer profissional
ativo pra qualquer visitante anônimo — incluindo a coluna `phone`, que nunca é exibida
em nenhuma tela do site (nem `Index.tsx`, nem `Agendar.tsx`), só existe para uso interno
do admin.

**Confirmado ao vivo antes da correção:**
```
GET /rest/v1/professionals?select=name,phone  (com anon key)
→ [{"name":"Marcos Silva","phone":"5519999990001"}, {"name":"Rafael Souza","phone":"5519999990002"}]
```

Mesma classe de bug do SEC-002 original (policy pública ampla demais esquecendo uma
coluna/tabela sensível), desta vez introduzida já na migração de domínio pra barbearia.

**Severidade:** 🟠 MEDIUM (vazamento de PII de terceiro — dado pessoal do profissional,
não do cliente/lojista; sem impacto financeiro direto).

**Correção:** ver `SECURITY_REMEDIATION_REPORT.md` (SEC-014).

### Testes executados (todos com `anon key`, sem nenhuma credencial adicional)

| # | Categoria (seção 51) | Teste | Resultado |
|---|---|---|---|
| 1 | Agendamento | Conflito de horário (mesmo profissional/slot de um agendamento já existente) | ✅ Rejeitado — `"time slot is no longer available"` (exclusion constraint) |
| 2 | Agendamento | Horário no passado (`2020-01-01`) | ✅ Rejeitado — `"invalid start time"` |
| 3 | Agendamento | Profissional inexistente (UUID aleatório) | ✅ Rejeitado — `"professional not found"` |
| 4 | Agendamento | Fora do expediente (domingo, barbearia fechada) | ✅ Rejeitado — `"requested time is outside professional working hours"` |
| 5 | Agendamento | Leitura direta de `appointments`/`professional_schedules`/`professional_time_off` (agenda/expediente bruto) | ✅ Vazio — sem policy pública, só via RPC |
| 6 | Agendamento | Profissional não presta o serviço | 🟡 Não reproduzido ao vivo — dados de seed têm os 2 profissionais prestando os 6 serviços; checagem confirmada só por leitura de código (`0020`, linha ~121) |
| 7 | Pagamento | `POST /rest/v1/orders` direto (bypass de `create_order`) | ✅ Rejeitado — `42501 row-level security policy` |
| 8 | Pagamento | `create_order` com `product_id` inexistente | ✅ Rejeitado — `"product not found"` |
| 9 | Pagamento | Leitura direta de `orders`/`customers`/`mercadopago_credentials` | ✅ Vazio para todas — sem policy pública de select |
| 10 | Administração | IDOR em `payment_webhook_events` (tabela interna de idempotência do webhook) | ✅ Vazio — admin only |
| 11 | Administração | Leitura pública de `professionals` (telefone) | 🔴 **Vazava antes** → ✅ corrigido e revalidado (SEC-014) |

Webhook do Mercado Pago (assinatura HMAC, replay, reconsulta da fonte de verdade) e
Edge Functions administrativas (`*-save-credentials`, `focusnfe-*`) **não foram
re-testadas dinamicamente** nesta rodada — dependem de credenciais reais do Mercado
Pago/Focus NFe ainda não conectadas neste projeto de dev; a validação continua sendo
só por leitura de código (já coberta no Adendo 1 e no corpo principal deste relatório).

### Resultado

Confirmado na prática que toda a defesa descrita no Adendo 1 se sustenta sob ataque
real, com uma exceção corrigida nesta mesma rodada (SEC-014). Nenhum outro achado.
- Política de expiração e revogação de refresh tokens do Supabase Auth.
