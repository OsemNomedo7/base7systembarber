# BASE7 System Barber

Plataforma completa para barbearias: site institucional premium, agendamento online,
loja de produtos com checkout real, painel administrativo completo, integração fiscal
(NFC-e) e emissão automática de nota — tudo numa única aplicação, sem depender de
plugins ou serviços de terceiros para operar a barbearia.

Evoluído a partir do **BASE7 System Moda 2.0** (e-commerce de moda/beleza): a
arquitetura técnica, a segurança e as integrações (Mercado Pago, Focus NFe) são as
mesmas — o domínio de negócio é que passou por uma migração completa, de loja de
roupas para barbearia com agenda, serviços e profissionais.

Desenvolvido para ser implantado como **instalação independente por cliente**: cada
barbearia tem seu próprio banco de dados, suas próprias credenciais de pagamento e
fiscal, e seu próprio domínio — não existe nada compartilhado entre diferentes
barbearias rodando este mesmo código.

---

## O que o sistema faz

### Site público

- Site institucional premium (Hero, Sobre, Serviços, Profissionais, Galeria,
  Avaliações, Localização), com identidade visual e conteúdo editáveis pelo admin —
  ver [`GUIA_DEPLOY_NOVO_CLIENTE.md`](./GUIA_DEPLOY_NOVO_CLIENTE.md) pra personalizar
  cada instalação.
- **Agendamento online** (`/agendar`): o cliente escolhe serviço, profissional, data e
  horário — a disponibilidade real é calculada no backend (expediente do profissional,
  bloqueios/folgas e agendamentos já existentes), com confirmação por WhatsApp.
- Loja de produtos (pomadas, óleos, cosméticos) com carrinho e checkout com três formas
  de pagamento: **Pix**, **cartão de crédito** e **débito**.
- Avaliações de atendimento/profissional e de produtos (com moderação).
- Chat ao vivo entre visitante e barbearia, direto no site.
- Botão de WhatsApp fixo, configurável pelo admin.

### Agendamento

- Serviços com nome, descrição, preço, duração e categoria.
- Profissionais com foto, bio, telefone, quais serviços realizam, expediente semanal
  (múltiplas faixas por dia) e bloqueios/folgas pontuais.
- Conflito de horário é impedido **no nível do banco** (exclusion constraint
  PostgreSQL) — não é possível dois agendamentos ativos sobrepostos para o mesmo
  profissional, mesmo sob concorrência.
- Preço e duração exibidos nunca vêm do navegador: o backend relê `services` e
  `professionals` do banco antes de confirmar qualquer agendamento.

### Pagamentos (Mercado Pago)

- Pix e cartão de crédito processados de verdade, com QR code e tokenização de cartão
  feita no navegador (o número do cartão nunca passa pelo nosso backend).
- Cada barbearia conecta a **própria conta** do Mercado Pago — basta colar as
  credenciais da aplicação dela no painel admin.
- Confirmação de pagamento automática via webhook, sempre revalidada diretamente na
  API do Mercado Pago (nunca confia cegamente na notificação).
- Preço e total do pedido são sempre recalculados no backend a partir do banco de
  dados — o valor cobrado nunca depende do que o navegador envia.

### Fiscal (Focus NFe)

- Emissão de **NFC-e** direto do painel de pedidos, com cancelamento dentro da janela
  legal de 30 minutos.
- Cada barbearia conecta a própria conta do Focus NFe (o certificado digital nunca é
  enviado nem armazenado por este sistema — fica só no painel dela).

### Painel administrativo

- **Dashboard** com métricas gerais, incluindo agendamentos do dia e próximos agendamentos.
- **Agenda**: agendamentos por dia, filtro por profissional/status, criação manual
  (walk-in/telefone), mudança de status e remarcação.
- **Serviços** e **Profissionais**: cadastro completo, atribuição de serviços por
  profissional, expediente semanal e bloqueios/folgas.
- **Produtos**: cadastro completo (fotos, preço, categoria, descrição, dados fiscais) e
  controle de **estoque**, com baixa automática na confirmação do pagamento.
- **Clientes**: cadastro automático a partir do checkout/agendamento, histórico.
- **Pedidos**: histórico de vendas, filtros, emissão de nota fiscal, status de entrega.
- **Entregas**: configuração dos métodos de frete e áreas de cobertura.
- **Relatórios**: vendas por período, produtos mais vendidos, indicadores, e uma seção
  dedicada a agendamentos (faturamento em serviços, atendimentos concluídos,
  cancelamentos, não comparecimento, serviços mais realizados e desempenho por
  profissional).
- **Avaliações**: moderação de depoimentos (barbearia/profissional) e de avaliações de
  produtos.
- **Chat**: atendimento aos visitantes direto pelo painel.
- **Conteúdo**: edição do hero, seções institucionais, galeria, marca (nome, endereço,
  horário, Instagram) e WhatsApp — sem precisar mexer em código.
- **Configurações de Pagamento e Fiscal**: onde a barbearia cola as próprias
  credenciais do Mercado Pago e do Focus NFe.

### Segurança

Preserva integralmente o modelo de segurança auditado do Moda original — nenhuma regra
foi relaxada na migração de domínio. Destaques:
- Backend nunca confia em preço, total, frete, estoque, duração de serviço ou
  disponibilidade de profissional vindos do navegador — tudo é recalculado a partir do
  banco no momento da compra/agendamento.
- Conflito de horário de agendamento é impedido por uma constraint do próprio
  PostgreSQL, não só por lógica de aplicação.
- Nenhuma credencial de pagamento ou fiscal chega a existir no frontend.
- Autenticação/autorização administrativa baseada em role real no token.
- Assinatura de webhooks sempre validada, e o status de pagamento é sempre reconferido
  na origem antes de confirmar qualquer pedido.
- Dado interno de cada tabela pública (ex.: telefone do profissional) nunca sai junto
  da leitura pública — RLS não distingue coluna, então informação sensível é sempre
  exposta via função dedicada com só as colunas seguras, nunca `select("*")` direto.

Detalhes completos em [`SECURITY_AUDIT_REPORT.md`](./SECURITY_AUDIT_REPORT.md) e
[`SECURITY_REMEDIATION_REPORT.md`](./SECURITY_REMEDIATION_REPORT.md).

---

## Arquitetura técnica

Aplicação **SPA (Single Page Application)** sem servidor backend próprio — toda a
lógica de servidor roda como *Backend-as-a-Service*:

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite, Tailwind CSS + shadcn/ui, TanStack Query, React Router, Framer Motion (animações do site público) |
| Backend / banco | Supabase (Postgres + Row Level Security + Auth + Storage + Realtime) |
| Lógica de servidor sensível | Supabase Edge Functions (Deno) — pagamentos, fiscal, webhooks |
| Pagamentos | Mercado Pago (API Orders — Pix e Cartão via Brick oficial) |
| Fiscal | Focus NFe (emissão de NFC-e) |
| Hospedagem do site | Vercel |

Sem Docker, sem Nginx, sem VPS própria — toda a infraestrutura é gerenciada pelas
plataformas acima. Cada instalação (cliente) tem seu próprio projeto Supabase e seu
próprio deploy na Vercel, totalmente isolados dos demais.

## Estrutura do repositório

```
src/
  components/     componentes de UI (públicos e do admin)
  pages/          páginas públicas (Home, Agendar, Produtos, Sobre, Contato) e do admin
  hooks/          acesso a dados (Supabase, React Query)
  contexts/       carrinho, autenticação
  lib/            regras de negócio auxiliares (frete, relatórios)
  types/          tipos TypeScript do banco
supabase/
  migrations/     schema do banco, em ordem (SQL puro, sem ORM)
  functions/      Edge Functions (Deno) — pagamentos, fiscal, webhooks
```

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencher com as chaves do seu projeto Supabase
npm run dev
```

Acesse `http://localhost:8080` para o site e `http://localhost:8080/admin` para o
painel administrativo.

## Documentação relacionada

- [`GUIA_DEPLOY_NOVO_CLIENTE.md`](./GUIA_DEPLOY_NOVO_CLIENTE.md) — passo a passo
  completo para colocar uma instalação nova no ar para uma barbearia real.
- [`SECURITY_AUDIT_REPORT.md`](./SECURITY_AUDIT_REPORT.md) — auditoria de segurança
  completa do sistema.
- [`SECURITY_REMEDIATION_REPORT.md`](./SECURITY_REMEDIATION_REPORT.md) — correções
  aplicadas e evidências de validação de cada uma.
