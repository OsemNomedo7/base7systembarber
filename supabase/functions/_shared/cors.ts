/* Correção SEC-007 (audit de segurança): CORS deixou de ser wildcard ("*").
 * Cada instalação do Base7 tem UM frontend próprio, então basta configurar
 * a origem real via secret (`supabase secrets set ALLOWED_ORIGIN=https://seu-dominio.com`)
 * antes de ir pra produção. Sem a secret configurada, cai no localhost do
 * dev server (vite roda em :8080), então nada quebra em desenvolvimento. */
const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "http://localhost:8080";

export const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
