/* Cancela uma NFC-e já autorizada (DELETE /v2/nfce/{ref}). A SEFAZ só aceita
 * cancelamento em até 30 minutos após a emissão - o frontend já bloqueia o
 * botão fora dessa janela, mas o Focus NFe também valida isso do lado dele. */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getFocusNfeConfig, focusNfeAuthHeader } from "../_shared/focusnfe.ts";

interface CancelBody {
  order_id: string;
  justificativa: string;
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

    const { order_id, justificativa } = (await req.json()) as CancelBody;
    if (!order_id || !justificativa || justificativa.trim().length < 15 || justificativa.trim().length > 255) {
      return new Response(JSON.stringify({ error: "Justificativa precisa ter entre 15 e 255 caracteres." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error: orderError } = await serviceClient
      .from("orders")
      .select("id, nfce_status, nfce_ref")
      .eq("id", order_id)
      .maybeSingle();

    if (orderError || !order || order.nfce_status !== "autorizado" || !order.nfce_ref) {
      return new Response(JSON.stringify({ error: "Este pedido não tem uma NFC-e autorizada pra cancelar." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token, baseUrl } = await getFocusNfeConfig(serviceClient);

    const cancelResponse = await fetch(`${baseUrl}/v2/nfce/${order.nfce_ref}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: focusNfeAuthHeader(token),
      },
      body: JSON.stringify({ justificativa: justificativa.trim() }),
    });

    const cancelBody = await cancelResponse.json().catch(() => null);

    if (!cancelResponse.ok || cancelBody?.status !== "cancelado") {
      const mensagem = cancelBody?.mensagem_sefaz ?? "Não foi possível cancelar a NFC-e.";
      return new Response(JSON.stringify({ error: mensagem }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await serviceClient
      .from("orders")
      .update({ nfce_status: "cancelado", nfce_mensagem_sefaz: cancelBody.mensagem_sefaz ?? null })
      .eq("id", order.id);

    return new Response(JSON.stringify({ status: "cancelado" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro inesperado no focusnfe-cancel-nfce:", err);
    const message = err instanceof Error ? err.message : "Erro inesperado.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
