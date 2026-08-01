# BASE7 SYSTEM MODA — SECURITY REMEDIATION REPORT

**Data:** 2026-07-31
**Baseado em:** `SECURITY_AUDIT_REPORT.md` (auditoria de 2026-07-31)
**Metodologia:** cada correção foi implementada, aplicada no banco de desenvolvimento (via migrations aplicadas pelo usuário no SQL Editor) e **re-testada com os mesmos ataques descritos na auditoria original**, usando chamadas HTTP diretas contra a API (com a `anon key` pública, simulando um atacante real) e testes de regressão via navegador no fluxo real de checkout/admin.

---

## Resumo do status

| ID | Vulnerabilidade | Status |
|---|---|---|
| SEC-001 | Manipulação de preço/total do pedido | ✅ **CORRIGIDA E VALIDADA** |
| SEC-002 | `analytics_events` exposta a visitante anônimo | ✅ **CORRIGIDA E VALIDADA** (ver atualização abaixo) |
| SEC-003 | Overload duplicado de `create_order` | ✅ **CORRIGIDA E VALIDADA** |
| SEC-004 | Sem validação de estoque na criação do pedido | ✅ **CORRIGIDA E VALIDADA** |
| SEC-005 | Sem security headers em produção | ✅ **CORRIGIDA** (⚠️ efeito real não verificável sem deploy) |
| SEC-006 | Autorização admin via "não-anônimo" | ✅ **CORRIGIDA E VALIDADA** |
| SEC-007 | CORS wildcard nas Edge Functions | ✅ **CORRIGIDA** (validada indiretamente) |
| SEC-008 | Validação de upload só no cliente | ✅ **CORRIGIDA E VALIDADA** |
| SEC-009 | Nome de arquivo não sanitizado | ✅ **CORRIGIDA** |
| SEC-010 | `allowedHosts` de tunnel esquecido | ✅ **CORRIGIDA** |
| SEC-011 | Arquivo solto na raiz do repo | ✅ **CORRIGIDA** |
| SEC-012 | Dependências desatualizadas | 🟡 **PARCIALMENTE CORRIGIDA** (ver nota) |
| SEC-013 | Sessão admin em localStorage | 🔵 Informativo, sem ação necessária |

---

## SEC-001 — Manipulação de preço/total do pedido

**Causa raiz:** `create_order` gravava `p_total`, preço de cada item e `p_shipping_fee` exatamente como recebidos do cliente, sem nenhuma validação contra `products.price`/`delivery_methods.price`. Havia ainda um segundo caminho de ataque: `POST /rest/v1/orders` direto, contornando a função inteiramente.

**Correção:**
- `supabase/migrations/0014_secure_create_order.sql` — reescreve `create_order` para receber só `product_id`/`quantity`/`size` por item (nunca preço). A função agora:
  - Busca `products.price` real de cada item e recalcula o subtotal.
  - Rejeita produto inexistente ou `is_active = false`.
  - Valida estoque disponível em `product_stock` (ver SEC-004).
  - Recalcula o frete a partir de `delivery_methods.price`/`free_above_value` (nunca aceita o valor do cliente).
  - Remove as duas assinaturas antigas da função (ver SEC-003).
  - Remove a policy `public insert orders`, fechando o caminho de insert direto.
- `src/components/CartDrawer.tsx` — os dois pontos de checkout (Pix e Cartão) agora mandam só `product_id`/`quantity`/`size`; preço, frete e total exibidos na tela continuam calculados no cliente **só para exibição/UX**, mas o valor realmente cobrado vem do banco.

**Arquivos alterados:** `supabase/migrations/0014_secure_create_order.sql` (novo), `src/components/CartDrawer.tsx`.

**Testes executados (contra o ambiente real, com a `anon key` pública):**

| Teste | Resultado |
|---|---|
| Pedido legítimo (produto real R$99,90, sem manipulação) | ✅ Criado com `total = 99.90` (conferido no banco) |
| Enviar `p_total`/`price` manipulados (`0.01`) dentro do payload | ✅ **Rejeitado** — `404 PGRST202: função não encontrada` (a assinatura nova nem aceita esses parâmetros) |
| Chamar a assinatura antiga de 7 parâmetros | ✅ **Rejeitado** — `404` (função não existe mais) |
| Quantidade maior que o estoque disponível (50 vs. 20 em estoque) | ✅ **Rejeitado** — `"insufficient stock for product"` |
| Produto inexistente | ✅ **Rejeitado** — `"product not found"` |
| `POST /rest/v1/orders` direto (bypass da função) | ✅ **Rejeitado** — `401`, `"new row violates row-level security policy"` |
| Fluxo real de checkout via navegador (Pix) após a correção | ✅ Pedido #26 criado com `total = 99.90`, Pix real gerado, `mp_payment_id` presente — **sem regressão** |

**Resultado:** ✅ **CORRIGIDA E VALIDADA.** Todos os vetores de manipulação testados na auditoria original foram bloqueados; o fluxo legítimo continua funcionando ponta a ponta com pagamento real.

**Risco residual:** nenhum vetor de manipulação de preço identificado. Cupons/descontos não existem como funcionalidade no sistema hoje (`discount_amount` é só exibido no admin, nunca setado pelo checkout), então não havia lógica de desconto pra proteger.

---

## SEC-002 — `analytics_events` exposta

**Causa raiz:** a policy `admin read analytics` usava `auth.role() = 'authenticated'` em vez de `is_admin()` — qualquer sessão autenticada (inclusive uma sessão anônima, que também tem `role: authenticated`) conseguia ler a tabela inteira.

**Correção:** `supabase/migrations/0015_fix_analytics_rls.sql` — recria a policy usando `public.is_admin()`, igual às demais tabelas administrativas.

**Arquivo alterado:** `supabase/migrations/0015_fix_analytics_rls.sql` (novo).

**Teste executado:** confirmado que a tabela tem dados reais (5 registros, verificado via `service_role`) e que uma chamada com só a `anon key` (sem nenhuma sessão) retorna `[]` vazio.

**⚠️ Descoberta importante durante o re-teste:** ao tentar reproduzir o ataque original de forma fiel (uma sessão *autenticada-porém-anônima*, exatamente como o `ChatWidget` cria via `signInAnonymously()`), descobri que **os sign-ins anônimos estão desabilitados no provedor de Auth deste projeto Supabase** (`"anonymous_provider_disabled"`). Isso significa duas coisas:
1. Não consegui reproduzir o ataque original de ponta a ponta neste ambiente específico, porque a sessão anônima que o ataque dependia nunca chega a se estabelecer.
2. **Isso também significa que o próprio Chat ao vivo do site provavelmente não está funcionando hoje** (`useVisitorSession()` falha silenciosamente e o chat fica sem conversa associada) — isso é um problema **funcional**, não de segurança, e é independente desta auditoria. Recomendo verificar em `Authentication → Providers → Anonymous Sign-Ins` no painel do Supabase se isso é intencional.

**Atualização (pós-relatório):** a pedido do usuário, o provedor "Anonymous Sign-Ins" foi reativado no painel do Supabase (Authentication → Sign In/Providers) — ele estava desligado, o que também explicava o Chat ao vivo não funcionar de ponta a ponta. Ao reativar, o próprio Supabase exibiu um aviso confirmando exatamente o mecanismo do SEC-002: *"Anonymous users will use the `authenticated` role when signing in... subjected to RLS policies that apply to the `public` and `authenticated` roles"* — validação independente, pela própria plataforma, do diagnóstico original.

Com o provedor reativado, o teste adversarial completo foi refeito: criada uma sessão anônima real (`is_anonymous: true`) e usada para ler `analytics_events` → **`200 []` (vazio)**, mesmo com a tabela tendo 5 registros reais confirmados via `service_role`. Corrigido também o Chat ao vivo, que agora consegue estabelecer sessão de visitante normalmente.

**Resultado:** ✅ **CORRIGIDA E VALIDADA** com o vetor de ataque original completo (sessão anônima real), não apenas por leitura de código.

**Nota de hardening (não aplicada, fora do escopo desta remediação):** o próprio Supabase recomenda habilitar CAPTCHA para sign-ins anônimos, para evitar abuso/custo de MAU (usuários anônimos ilimitados). Sugestão para o usuário avaliar separadamente.

---

## SEC-003 — Overload duplicado de `create_order`

**Causa raiz:** a migration 0009 (que deveria remover a versão antiga de 7 parâmetros) não teve efeito duradouro no banco — confirmado **antes** desta correção com uma chamada real que reproduziu o erro `PGRST203: Could not choose the best candidate function`.

**Correção:** a mesma migration `0014_secure_create_order.sql` remove explicitamente as duas assinaturas antigas (`drop function ... (text,text,text,text,text,jsonb,numeric)` e a de 11 parâmetros) antes de criar a nova versão de 9 parâmetros.

**Teste executado:** chamar a função com os parâmetros da assinatura antiga de 7 parâmetros → `404 PGRST202` ("função não encontrada"), confirmando que só existe uma versão de `create_order` no banco agora.

**Resultado:** ✅ **CORRIGIDA E VALIDADA.**

---

## SEC-004 — Sem validação de estoque na criação do pedido

**Correção:** incluída na mesma reescrita de `create_order` (migration 0014) — antes de aceitar cada item, a função consulta `product_stock` pelo par `(product_id, size)` e rejeita se a quantidade disponível for menor que a solicitada.

**Teste executado:** pedido de 50 unidades de um produto com 20 em estoque → rejeitado com `"insufficient stock for product: <nome>"`.

**Resultado:** ✅ **CORRIGIDA E VALIDADA.**

**Risco residual (documentado, aceito por escopo):** a validação acontece no momento da criação do pedido, mas o estoque só é de fato decrementado na confirmação do pagamento (comportamento já existente, mantido). Isso significa que, em teoria, dois pedidos **pendentes** (ainda não pagos) simultâneos para a última unidade de um produto podem ambos passar na validação — um sistema de reserva de estoque (hold) resolveria isso, mas é uma mudança de escopo maior (mudaria quando o estoque é decrementado) e não foi pedida na auditoria original, que pedia especificamente "validar estoque disponível antes da confirmação do pedido" (feito). Documentado como melhoria futura, não como vulnerabilidade aberta.

---

## SEC-005 — Security headers em produção

**Correção:** `vercel.json` ganhou um bloco `headers` com `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (câmera/microfone/geolocalização/payment desabilitados) e `Strict-Transport-Security`. O CSP libera explicitamente os domínios realmente usados pelo sistema: Supabase (REST/Functions/Realtime), SDK do Mercado Pago (Bricks), ViaCEP e imagens do Unsplash (usadas nos produtos de exemplo).

**Arquivo alterado:** `vercel.json`.

**⚠️ NÃO VERIFICADO:** headers de `vercel.json` só têm efeito num deploy real na Vercel — não existe deploy ativo (regra do projeto: tudo em localhost até validação), e o servidor de desenvolvimento do Vite não lê `vercel.json`. Não foi possível confirmar que o CSP não quebra nada (em especial o Brick de cartão do Mercado Pago, que carrega recursos dinamicamente) sem um deploy real. **Recomendação:** ao fazer o primeiro deploy, testar o checkout completo (Pix e Cartão) e abrir o console do navegador procurando por erros `Refused to load/connect` — se aparecerem, ajustar o CSP em `vercel.json` para incluir o domínio bloqueado.

**Resultado:** ✅ **CORRIGIDA** no código; efeito real ⚠️ **NÃO VERIFICADO** (depende de deploy).

---

## SEC-006 — Autorização admin via "não-anônimo"

**Causa raiz:** Edge Functions administrativas checavam só `!user.is_anonymous`, equivalente hoje a "é admin" só porque existe um único usuário não-anônimo no projeto — mas isso quebraria no dia em que a loja ganhasse login real de cliente.

**Correção:**
- `supabase/migrations/0016_real_admin_role.sql` — `is_admin()` agora exige explicitamente `app_metadata.role = 'admin'` (claim no JWT, só alterável via API/SQL com privilégio elevado, nunca pelo próprio usuário). A migration também faz um "grandfathering" único: concede essa claim para quem **hoje** já é usuário não-anônimo (ou seja, o admin desta instalação) — logins futuros de cliente não recebem essa claim automaticamente.
- `supabase/functions/mercadopago-save-credentials/index.ts`, `focusnfe-save-credentials/index.ts`, `focusnfe-emit-nfce/index.ts`, `focusnfe-cancel-nfce/index.ts` — a checagem de autorização passou a exigir `user.app_metadata?.role === "admin"`, não só `!is_anonymous`.

**Arquivos alterados:** `supabase/migrations/0016_real_admin_role.sql` (novo) + as 4 Edge Functions acima (redeployadas).

**Testes executados:**
- Confirmado, lendo o JWT ativo da sessão admin real no navegador, que `app_metadata.role: "admin"` está presente (a migration aplicou a claim corretamente e o token já foi renovado, sem precisar de logout/login manual).
- Chamada real à `focusnfe-save-credentials` com o token do admin real → passou pela checagem de autorização e chegou até a validação do token no Focus NFe (`400 "Token inválido"`, não `401 "Não autorizado"`) — confirma que o admin real continua funcionando.
- Telas administrativas (`Pedidos`, `Fiscal`) testadas no navegador, carregando normalmente após a correção.
- Após a reativação do provedor anônimo (ver SEC-002), o caminho negativo também foi validado: uma sessão anônima real (`is_anonymous: true`) tem `app_metadata` sem `role: admin`, então cai direto na rejeição `!user.is_anonymous` antes mesmo de chegar na checagem de role — bloqueada nos dois critérios.

**Resultado:** ✅ **CORRIGIDA E VALIDADA** (caminho positivo com admin real, caminho negativo coberto por revisão de código + confirmação de que sessões anônimas nunca têm a claim de admin).

**⚠️ Ação operacional para o usuário:** se qualquer outra sessão de admin estiver aberta em outro navegador/dispositivo com um token emitido antes desta migration, ela pode perder acesso até fazer logout/login de novo (o JWT antigo não tem a claim nova).

---

## SEC-007 — CORS wildcard

**Correção:** `supabase/functions/_shared/cors.ts` agora lê `Deno.env.get("ALLOWED_ORIGIN")` (configurável via `supabase secrets set ALLOWED_ORIGIN=https://seu-dominio.com` antes de ir pra produção), caindo em `http://localhost:8080` como padrão de desenvolvimento. Todas as 7 Edge Functions foram redeployadas com o novo `_shared/cors.ts`.

**Arquivo alterado:** `supabase/functions/_shared/cors.ts` (nenhuma mudança necessária nas funções individuais, todas importam o mesmo módulo).

**Teste executado:** todo o fluxo de checkout e admin testado nesta remediação (Pix real, telas administrativas, salvar credenciais) foi feito a partir de `http://localhost:8080` **sem nenhum erro de CORS** — confirma que o valor padrão de desenvolvimento não quebrou nada.

**Resultado:** ✅ **CORRIGIDA**, validada indiretamente (nenhuma regressão observada em dev). **Ação necessária antes de produção:** configurar a secret `ALLOWED_ORIGIN` com o domínio real.

---

## SEC-008 / SEC-009 — Upload de arquivos

**Correção:**
- `supabase/migrations/0017_storage_upload_restrictions.sql` — restringe o bucket `media` a `allowed_mime_types: [image/png, image/jpeg, image/webp]` e `file_size_limit: 5MB` diretamente no Storage (não só no frontend).
- `src/components/admin/ImageUploader.tsx` — sanitiza `file.name` (remove tudo exceto letras/números/`._-`) antes de compor o path no bucket.

**Arquivos alterados:** `supabase/migrations/0017_storage_upload_restrictions.sql` (novo), `src/components/admin/ImageUploader.tsx`.

**Testes executados (contra o bucket real):**
- Upload de um PNG válido → `200 OK` (upload legítimo não quebrou).
- Upload de um "arquivo" `image/svg+xml` (o tipo classicamente usado pra XSS via upload) → `415 invalid_mime_type`, rejeitado pelo próprio Storage.
- Arquivo de teste removido depois do teste.

**Resultado:** ✅ **CORRIGIDA E VALIDADA** (SEC-008). SEC-009 (sanitização de nome) aplicada e revisada, sem teste adversarial dedicado (mudança pequena e determinística).

---

## SEC-010 / SEC-011 — Limpeza

- `vite.config.ts`: removido `allowedHosts: [".trycloudflare.com"]` (não usado mais desde o abandono do fluxo OAuth do Mercado Pago).
- Removido o arquivo solto `UsersG7...pix_teste_r1.png` da raiz do repositório (artefato de teste de uma sessão anterior, nunca commitado).

**Resultado:** ✅ **CORRIGIDA.**

---

## SEC-012 — Dependências

**Ação tomada:** `react-router-dom` (a única dependência de **produção** com CVE relevante) atualizado de `6.30.1` para `6.30.4` — um patch dentro da mesma versão major (sem breaking changes), que resolve o advisory HIGH reportado.

**Verificado:** `npx tsc --noEmit` e `npm run lint` limpos após a atualização; nenhuma mudança de código necessária (API do React Router não mudou entre patches).

**🟡 Risco residual documentado (decisão consciente, não omissão):** as demais vulnerabilidades reportadas pelo `npm audit` (`vite`, `vitest`, `rollup`, `esbuild`, `js-yaml`, `ajv`, `yaml`, `ws`, etc.) são **todas devDependencies** — ferramentas de build/teste que nunca são enviadas ao navegador do usuário final, só rodam na máquina de quem desenvolve. Corrigi-las exigiria subir `vite` de major version (5→6), o que pode quebrar plugins (`@vitejs/plugin-react-swc`, `lovable-tagger`) e exige uma rodada de testes dedicada — não é uma correção segura de se fazer "de passagem" dentro desta remediação, conforme a própria instrução de não atualizar pacotes indiscriminadamente. **Recomendação:** tratar como um item de manutenção separado, com sua própria rodada de testes.

**Resultado:** 🟡 **PARCIALMENTE CORRIGIDA** — a única dependência de produção foi corrigida; devDependencies deixadas como risco residual documentado e de baixo impacto real (superfície de ataque não inclui o toolchain de build).

---

## SEC-013 — Sessão admin em localStorage

Nenhuma ação necessária — é o comportamento padrão do `supabase-js` para SPAs sem backend de sessão próprio, e nenhuma vulnerabilidade de XSS foi encontrada que tornasse isso explorável (ver Seção 23 do audit original). Mantido como nota informativa.

---

## Testes de regressão executados

| Área | Teste | Resultado |
|---|---|---|
| Loja | Navegar produtos, adicionar ao carrinho, ajustar quantidade | ✅ OK |
| Checkout | Fluxo completo de Pix (nome, telefone, retirada, e-mail, CPF) até QR code real | ✅ OK — pedido #26 criado, total correto (R$99,90), Pix real gerado |
| Admin | Login/sessão existente continua ativa após migration de `is_admin()` | ✅ OK |
| Admin | Tela de Pedidos carrega, mostra pedidos novos e antigos corretamente | ✅ OK |
| Admin | Tela Fiscal (`get_focusnfe_status`, depende de `is_admin()`) | ✅ OK |
| Admin | Edge Function administrativa (`focusnfe-save-credentials`) com token real do admin | ✅ OK — passou da autorização, validou o token externo normalmente |
| Storage | Upload de imagem de produto (PNG) | ✅ OK |
| Build | `npx tsc --noEmit` | ✅ Sem erros |
| Build | `npm run lint` | ✅ Sem novos erros (só os pré-existentes, não relacionados) |

**Não testado nesta rodada** (fora do escopo direto das correções, ou já coberto por sessões anteriores): cartão de crédito, cancelamento de pedido, relatórios, entregas — nenhuma dessas áreas teve código alterado por esta remediação, então o risco de regressão é baixo, mas não foram re-executadas explicitamente.

---

## ⚠️ RISCOS RESIDUAIS

1. ~~SEC-002/SEC-006 (teste adversarial parcial)~~ — **resolvido**: o provedor "Anonymous Sign-Ins" foi reativado a pedido do usuário e o teste adversarial completo (sessão anônima real) confirmou a correção. Nota de hardening pendente (opcional): habilitar CAPTCHA para sign-ins anônimos, recomendação do próprio Supabase para evitar abuso/custo de MAU.
2. **SEC-005 (security headers):** o efeito real do CSP só pode ser confirmado num deploy de produção de verdade. Recomendo testar o checkout completo (especialmente o Brick de cartão do Mercado Pago) logo após o primeiro deploy e ajustar o CSP se algo for bloqueado.
3. **SEC-007 (CORS):** funciona corretamente com o padrão de desenvolvimento (`localhost:8080`). **Antes de ir para produção, é necessário configurar a secret `ALLOWED_ORIGIN` com o domínio real** (`supabase secrets set ALLOWED_ORIGIN=https://seu-dominio.com`), senão o frontend de produção não conseguirá chamar as Edge Functions.
4. **SEC-012 (dependências de build):** `vite`/`vitest`/`rollup`/`esbuild` continuam com advisories abertos do `npm audit`, todos limitados ao ambiente de desenvolvimento/build (não expostos a usuários finais). Recomendo uma atualização major dedicada e testada separadamente.
5. **SEC-004 (estoque):** validação no momento da criação do pedido, sem reserva/hold entre criação e pagamento — dois pedidos pendentes simultâneos para a última unidade ainda podem coexistir até um deles ser pago (comportamento pré-existente, mantido intencionalmente por não estar no escopo pedido).
6. **Itens do audit original marcados como "não verificado"** continuam não verificados por dependerem de acesso a produção/configuração de plataforma que não existe ainda: rate limiting do login, TLS/HSTS reais na borda, comportamento de Content-Type do Storage em produção, XML/DANFE do Focus NFe (sem conta real conectada).

## Declaração final

O sistema está **significativamente mais seguro** do que estava na auditoria original — em particular, a falha crítica de manipulação de preço (SEC-001) foi eliminada e validada com testes de exploração reais, não apenas revisão de código. Não declaro o sistema "100% seguro": os riscos residuais acima são reais e devem ser monitorados, e esta foi uma revisão de código + testes funcionais, não um penetration test completo com ferramentas dinâmicas (ZAP/Burp) nem uma auditoria de infraestrutura de produção (que ainda não existe, pois nada foi deployado).
