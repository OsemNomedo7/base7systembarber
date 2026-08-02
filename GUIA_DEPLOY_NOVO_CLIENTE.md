# Guia — Colocar o Base7 System Barber no ar para uma barbearia nova

Este guia documenta o passo a passo completo pra levar este sistema (código-fonte)
e transformar numa **instalação independente e funcional** para uma barbearia real,
do zero até o site publicado.

## Arquitetura (relembrando)

Cada cliente tem sua **própria instalação isolada**, sem nada compartilhado:

```
CLIENTE X
├── Repositório GitHub próprio
├── Projeto Supabase próprio (banco, Auth, Storage, Edge Functions)
├── Deploy Vercel próprio (domínio próprio)
├── Conta Mercado Pago própria (credenciais coladas no admin dele)
└── Conta Focus NFe própria, opcional (credenciais coladas no admin dele)
```

Não existe nada centralizado do lado do Base7 — cada cliente é 100% independente.
Isso significa que **este guia se repete inteiro para cada cliente novo**.

---

## Checklist rápido

- [ ] Novo repositório Git criado com o código
- [ ] Novo projeto Supabase criado
- [ ] Migrations `0001` a `0022` aplicadas em ordem
- [ ] "Anonymous sign-ins" habilitado (se for usar o chat ao vivo)
- [ ] Usuário admin criado + claim `role: admin` aplicada
- [ ] `.env.local` configurado e testado localmente (`npm run dev`)
- [ ] Edge Functions deployadas (7 funções)
- [ ] Projeto criado na Vercel com as env vars configuradas
- [ ] Secret `ALLOWED_ORIGIN` configurada apontando pro domínio da Vercel
- [ ] Serviços, profissionais e expediente cadastrados pelo admin (`/admin/servicos`, `/admin/profissionais`)
- [ ] Produtos, frete e conteúdo (hero, marca, galeria, WhatsApp etc.) cadastrados pelo admin
- [ ] Mercado Pago conectado pelo cliente (`/admin/pagamentos`)
- [ ] Webhook do Mercado Pago cadastrado no painel dele com o evento **"Order (Mercado Pago)"** marcado (⚠️ ver nota crítica abaixo)
- [ ] Focus NFe conectado pelo cliente, se for usar nota fiscal (`/admin/fiscal`)
- [ ] Teste de ponta a ponta feito em produção (um agendamento real + checkout Pix real de valor baixo)

---

## Passo 1 — Preparar o repositório do cliente

1. No GitHub, crie um repositório novo e vazio (ex: `nomecliente-loja`).
2. No projeto atual (que serve de "molde"), aponte o remote pra esse repositório novo e envie o código:
   ```bash
   git remote set-url origin https://github.com/SUA-CONTA/nomecliente-loja.git
   git push -u origin main
   ```
   (Se preferir manter o molde intacto, clone a pasta pra um diretório novo antes de trocar o remote.)

---

## Passo 2 — Criar o projeto Supabase do cliente

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**.
2. Anote a **Project URL** e a **anon public key** (Settings → API) — vai precisar delas no Passo 5.
3. No terminal, dentro da pasta do projeto:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-do-novo-projeto>
   ```

---

## Passo 3 — Aplicar as migrations (schema do banco)

Aplique **todas**, em ordem, colando o conteúdo de cada arquivo no **SQL Editor** do
Supabase (Dashboard → SQL Editor → New query → colar → Run):

```
supabase/migrations/0001_init.sql
supabase/migrations/0002_reviews.sql
supabase/migrations/0003_rls_is_admin.sql
supabase/migrations/0004_customers.sql
supabase/migrations/0005_orders_checkout.sql
supabase/migrations/0006_stock.sql
supabase/migrations/0007_delivery.sql
supabase/migrations/0008_mercadopago.sql
supabase/migrations/0009_fix_create_order_overload.sql
supabase/migrations/0010_mercadopago_scope.sql
supabase/migrations/0011_mercadopago_direct_credentials.sql
supabase/migrations/0012_mercadopago_card_details.sql
supabase/migrations/0013_focusnfe.sql
supabase/migrations/0014_secure_create_order.sql
supabase/migrations/0015_fix_analytics_rls.sql
supabase/migrations/0016_real_admin_role.sql
supabase/migrations/0017_storage_upload_restrictions.sql
supabase/migrations/0018_barber_catalog.sql
supabase/migrations/0019_barber_schedules.sql
supabase/migrations/0020_barber_appointments.sql
supabase/migrations/0021_testimonials.sql
supabase/migrations/0022_professionals_phone_privacy.sql
```

⚠️ **0018–0021 são específicas do domínio de barbearia** (serviços, profissionais,
expediente, agenda e depoimentos) — não existiam no Base7 System Moda original. A
`0020` cria a extensão `btree_gist` (necessária pra exclusion constraint que impede
conflito de horário) — o Supabase já vem com ela disponível, não precisa habilitar
manualmente antes.

⚠️ **Atenção especial à migration `0016`**: ela concede a claim `role: admin` a
**todo usuário não-anônimo que já existir no banco no momento em que ela rodar**.
Como num projeto novo ainda não existe nenhum usuário, rode a migration 0016
**depois** de criar o usuário admin (Passo 4) — ou rode ela de novo (é segura de
repetir) depois de criar o admin, se a ordem escapar.

⚠️ Depois de aplicar tudo, confirme que **só existe uma versão** da função
`create_order` no banco (rode no SQL Editor: `select proname, pronargs from
pg_proc where proname = 'create_order';` — deve devolver **uma linha só**, com
9 parâmetros). Isso já foi um bug real neste projeto (ver
`SECURITY_AUDIT_REPORT.md`, SEC-003) — vale sempre conferir em instalação nova.

---

## Passo 4 — Criar o usuário admin

1. Dashboard → **Authentication → Users → Add user** → preencha e-mail/senha
   do lojista, **desmarque** "Send invite" (ou confirme o e-mail manualmente),
   marque "Auto Confirm User".
2. No **SQL Editor**, rode (ou re-rode a migration 0016 inteira):
   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
   where email = 'email-do-lojista@exemplo.com';
   ```
3. **Authentication → Sign In/Providers**, role até **"Allow anonymous
   sign-ins"** e ative (necessário para o chat ao vivo do site funcionar — sem
   isso, o widget de chat fica sem sessão). O próprio Supabase recomenda
   habilitar **CAPTCHA** para sign-ins anônimos nessa mesma tela — vale
   configurar pra evitar abuso.

---

## Passo 5 — Configurar e testar localmente

1. Copie `.env.example` para `.env.local` e preencha com os dados do **novo**
   projeto Supabase (Passo 2):
   ```
   VITE_SUPABASE_URL=https://<ref-do-novo-projeto>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key-do-novo-projeto>
   ```
2. `npm install`
3. `npm run dev` → abra `http://localhost:8080`, confirme que a loja carrega
   (sem produtos ainda) e que o login em `/admin/login` funciona com o usuário
   criado no Passo 4.

---

## Passo 6 — Popular dados iniciais

Tudo feito pelo próprio painel admin (`/admin`), logado como o dono da barbearia:

- **Serviços** (`/admin/servicos`) — cadastrar os serviços reais (nome, descrição,
  preço, duração, categoria, imagem).
- **Profissionais** (`/admin/profissionais`) — cadastrar os barbeiros reais, atribuir
  quais serviços cada um realiza e configurar o **expediente semanal** (e folgas/
  bloqueios pontuais) — sem isso, `/agendar` não mostra nenhum horário disponível.
- **Produtos** (`/admin/produtos`) — cadastrar os produtos reais (fotos, preços,
  estoque). Se for emitir NFC-e, preencher também os **dados fiscais** de cada
  produto (NCM principalmente — CFOP/unidade/ICMS já vêm com um padrão razoável pro
  Simples Nacional).
- **Entregas** (`/admin/entregas`) — configurar os métodos de entrega/frete reais (a
  Retirada já vem criada por padrão), se a barbearia for entregar produtos.
- **Conteúdo** (`/admin/conteudo`) — hero da Home, seção "sobre", página Sobre,
  galeria de fotos, marca (nome, endereço, horário, Instagram) e número de WhatsApp
  reais da barbearia.

> Não use o `scripts/seed.ts` numa barbearia real — ele popula serviços,
> profissionais, produtos e textos **fictícios de demonstração** (Navalha
> Barbearia). Ele é só para testar o sistema rapidamente antes de existir conteúdo
> real (usado durante o desenvolvimento deste projeto).

---

## Passo 7 — Deploy das Edge Functions

Com o CLI já logado e linkado (Passo 2), rode um deploy por função:

```bash
npx supabase functions deploy mercadopago-create-payment --project-ref <ref>
npx supabase functions deploy mercadopago-create-card-payment --project-ref <ref>
npx supabase functions deploy mercadopago-webhook --project-ref <ref>
npx supabase functions deploy mercadopago-save-credentials --project-ref <ref>
npx supabase functions deploy focusnfe-save-credentials --project-ref <ref>
npx supabase functions deploy focusnfe-emit-nfce --project-ref <ref>
npx supabase functions deploy focusnfe-cancel-nfce --project-ref <ref>
```

Não é necessário configurar nenhuma secret de Supabase/Postgres nas funções —
`SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` já são injetadas
automaticamente pela plataforma. A única secret que **você** precisa configurar
é o `ALLOWED_ORIGIN`, no Passo 9 (só depois de saber o domínio da Vercel).

---

## Passo 8 — Deploy na Vercel

1. Em [vercel.com](https://vercel.com), **Add New → Project**, conecte a conta
   GitHub e selecione o repositório do cliente (Passo 1).
2. Antes de clicar em "Deploy", em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` = a URL do projeto Supabase do cliente
   - `VITE_SUPABASE_ANON_KEY` = a anon key do projeto Supabase do cliente
3. Deploy. Anote a URL gerada (ex: `https://nomecliente-loja.vercel.app`) —
   ou configure um domínio próprio do cliente nas configurações do projeto.

---

## Passo 9 — Configurar `ALLOWED_ORIGIN`

Com a URL de produção em mãos:

```bash
npx supabase secrets set ALLOWED_ORIGIN=https://dominio-do-cliente.com --project-ref <ref>
```

Sem isso, o site publicado não consegue chamar nenhuma Edge Function (checkout,
pagamentos, fiscal) — vai dar erro de CORS. Se o cliente trocar de domínio
depois, é só rodar esse comando de novo com o novo valor.

---

## Passo 10 — Cliente conecta o Mercado Pago

O próprio lojista (ou você, com acesso à conta dele) faz, dentro do painel
admin do site (`/admin/pagamentos`):

1. Criar uma aplicação em `suas.integracoes.mercadopago.com.br` (conta MP do
   próprio cliente).
2. Copiar **Access Token** e **Public Key** de produção pro formulário.
3. Em **Webhooks → Configurar notificações** no painel do Mercado Pago:
   - Colar a URL do webhook (o admin já mostra o link certo, com botão de copiar).
   - **⚠️ CRÍTICO — marcar o evento "Order (Mercado Pago)"** em Modo de
     Produção (não só "Pagamentos (legacy)", que vem marcado por padrão e
     **não é o suficiente**, já que este sistema usa a API Orders do
     Mercado Pago). Esse foi um bug real de configuração encontrado durante o
     desenvolvimento — sem isso, os pagamentos são cobrados normalmente mas o
     pedido nunca é marcado como "pago" automaticamente.
   - Copiar a **chave secreta** gerada e colar no terceiro campo do formulário
     do admin.

---

## Passo 11 — Cliente conecta o Focus NFe (opcional)

Só necessário se o cliente for emitir NFC-e. No painel admin (`/admin/fiscal`):

1. Cliente cria conta em `focusnfe.com.br`, cadastra CNPJ e envia o
   certificado digital A1 **no painel deles** (nunca no nosso sistema).
2. Cola o token de API + CNPJ no formulário do admin, escolhe o ambiente
   (Homologação pra testar sem valor fiscal, Produção pra emitir de verdade).

---

## Passo 12 — Teste final em produção

1. Fazer login no admin de produção.
2. Cadastrar um produto de valor baixo (ou usar temporariamente um preço
   baixo) e fazer uma compra real via Pix, confirmando:
   - o pedido aparece em `/admin/pedidos` com o valor correto;
   - o pagamento é debitado de verdade e o pedido muda pra "Pago" sozinho
     (isso confirma que o webhook + evento "Order" do Passo 10 estão certos).
3. Testar o formulário de cartão (Brick) pelo menos até a etapa de
   tokenização — um pagamento real de cartão só deve ser testado com
   autorização explícita do cliente, com um valor bem baixo.
4. Testar o chat ao vivo (widget no canto da tela) — confirma que "Anonymous
   sign-ins" (Passo 4) está ativo.

---

## Notas de segurança — não pular

Este projeto passou por uma auditoria de segurança completa (ver
`SECURITY_AUDIT_REPORT.md` e `SECURITY_REMEDIATION_REPORT.md` no repositório).
Pontos que dependem de **configuração por instalação** e não vêm prontos só
por copiar o código:

- **`ALLOWED_ORIGIN`** (Passo 9) — sem isso, CORS fica aberto pro domínio
  errado (padrão de desenvolvimento) e o site de produção não funciona.
- **Claim `role: admin`** (Passo 4) — sem isso, ninguém consegue usar as
  funções administrativas (salvar credenciais, emitir/cancelar NFC-e).
- **Anonymous sign-ins + CAPTCHA** (Passo 4) — necessário pro chat funcionar,
  mas habilita sessões anônimas no projeto; o CAPTCHA evita abuso.
- **Evento "Order" no webhook do Mercado Pago** (Passo 10) — sem isso,
  pagamentos reais não confirmam pedidos automaticamente.
- Nunca reative a policy antiga de insert direto em `orders`, nem passe a
  aceitar `total`/`price` vindos do frontend em `create_order` — essa foi a
  vulnerabilidade crítica corrigida na migration `0014` (ver SEC-001 no
  relatório de auditoria).

---

## Manutenção contínua

- Atualizações de código no molde original podem ser trazidas pra instalação
  de um cliente via `git cherry-pick`/merge manual (cada cliente tem seu
  próprio repositório e pode divergir).
- Sempre que uma migration nova for criada no molde, aplicar na ordem certa
  no projeto Supabase de cada cliente que for atualizar.
- Sempre que uma Edge Function for alterada, redeployar só ela
  (`npx supabase functions deploy <nome> --project-ref <ref-do-cliente>`).
