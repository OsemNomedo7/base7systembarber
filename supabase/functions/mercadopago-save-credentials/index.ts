/* Salva as credenciais Mercado Pago do lojista (Access Token + Public Key da
 * aplicação PRÓPRIA dele, criada na conta dele) + o segredo do webhook. Só quem
 * está autenticado como admin (não anônimo) pode chamar esta função. Valida o
 * Access Token direto na API do Mercado Pago antes de salvar (pega erro de
 * copiar/colar na hora, com feedback claro) e nunca devolve os valores salvos
 * de volta ao frontend. */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface SaveCredentialsBody {
  access_token: string;
  public_key: string;
  webhook_secret: string;
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

    const { access_token, public_key, webhook_secret } = (await req.json()) as SaveCredentialsBody;
    if (!access_token?.trim() || !public_key?.trim() || !webhook_secret?.trim()) {
      return new Response(JSON.stringify({ error: "Preencha Access Token, Public Key e segredo do webhook." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Valida o token direto na API do MP antes de salvar - pega erro de digitação
    // na hora, com uma mensagem clara, em vez de descobrir só no primeiro pagamento.
    const meResponse = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${access_token.trim()}` },
    });

    if (!meResponse.ok) {
      return new Response(JSON.stringify({ error: "Access Token inválido - confira se copiou corretamente." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const me = await meResponse.json();

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: upsertError } = await serviceClient.from("mercadopago_credentials").upsert({
      id: 1,
      mp_user_id: me.id ?? null,
      access_token: access_token.trim(),
      public_key: public_key.trim(),
      webhook_secret: webhook_secret.trim(),
      refresh_token: null,
      scope: null,
      live_mode: me.live_mode ?? null,
      token_expires_at: null,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (upsertError) {
      console.error("Falha ao salvar credenciais do Mercado Pago:", upsertError.message);
      return new Response(JSON.stringify({ error: "Falha ao salvar a conexão." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro inesperado no save-credentials:", err);
    return new Response(JSON.stringify({ error: "Erro inesperado." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
