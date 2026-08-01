import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const HOMOLOGACAO_URL = "https://homologacao.focusnfe.com.br";
const PRODUCAO_URL = "https://api.focusnfe.com.br";

export interface FocusNfeConfig {
  token: string;
  baseUrl: string;
  cnpjEmitente: string;
}

/* Lê o token do lojista salvo em focusnfe_credentials (modelo direto, igual
 * ao Mercado Pago - cada lojista cria a própria conta no Focus NFe e cola o
 * token aqui). A mesma credencial serve pros dois ambientes; só a baseUrl
 * muda (homologação não tem validade fiscal, produção tem). */
export async function getFocusNfeConfig(serviceClient: SupabaseClient): Promise<FocusNfeConfig> {
  const { data: creds, error } = await serviceClient
    .from("focusnfe_credentials")
    .select("api_token, ambiente, cnpj_emitente")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(`Falha ao ler credenciais: ${error.message}`);
  if (!creds?.api_token) throw new Error("Focus NFe não está conectado.");
  if (!creds?.cnpj_emitente) throw new Error("CNPJ do emitente não configurado.");

  return {
    token: creds.api_token as string,
    baseUrl: creds.ambiente === "producao" ? PRODUCAO_URL : HOMOLOGACAO_URL,
    cnpjEmitente: creds.cnpj_emitente as string,
  };
}

/* Basic Auth do Focus NFe: usuário = token, senha vazia. */
export function focusNfeAuthHeader(token: string): string {
  return `Basic ${btoa(`${token}:`)}`;
}
