/* Salva as credenciais Focus NFe do lojista (token da própria conta/empresa
 * dele, criada em focusnfe.com.br - fora do nosso sistema, com CNPJ e
 * certificado digital A1 já cadastrados lá). Só quem está autenticado como
 * admin (não anônimo) pode chamar esta função. Valida o token direto na API
 * do Focus NFe antes de salvar. */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { focusNfeAuthHeader } from "../_shared/focusnfe.ts";

interface SaveCredentialsBody {
  api_token: string;
  ambiente: "homologacao" | "producao";
  cnpj_emitente: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user || user.is_anonymous || user.app_metadata?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Não autorizado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { api_token, ambiente, cnpj_emitente } = (await req.json()) as SaveCredentialsBody;
    const cnpj = cnpj_emitente?.replace(/\D/g, "") ?? "";

    if (!api_token?.trim() || !cnpj || (ambiente !== "homologacao" && ambiente !== "producao")) {
      return new Response(JSON.stringify({ error: "Preencha Token, Ambiente e CNPJ do emitente." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Valida o token direto na API do Focus NFe antes de salvar - pega erro de
    // digitação na hora, em vez de descobrir só na primeira emissão.
    const baseUrl = ambiente === "producao" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
    const checkResponse = await fetch(`${baseUrl}/v2/empresas`, {
      headers: { Authorization: focusNfeAuthHeader(api_token.trim()) },
    });

    if (!checkResponse.ok) {
      return new Response(JSON.stringify({ error: "Token inválido - confira se copiou corretamente." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: upsertError } = await serviceClient.from("focusnfe_credentials").upsert({
      id: 1,
      api_token: api_token.trim(),
      ambiente,
      cnpj_emitente: cnpj,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (upsertError) {
      console.error("Falha ao salvar credenciais do Focus NFe:", upsertError.message);
      return new Response(JSON.stringify({ error: "Falha ao salvar a conexão." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro inesperado no focusnfe-save-credentials:", err);
    return new Response(JSON.stringify({ error: "Erro inesperado." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
