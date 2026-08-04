/* Recebe notificações do Mercado Pago (API Orders). Deploy desta função precisa
 * ser feito com verify_jwt = false (ver supabase/config.toml), já que o Mercado
 * Pago chama esta URL diretamente, sem token do Supabase - por isso validamos a
 * assinatura HMAC manualmente e, mais importante ainda, NUNCA confiamos no corpo
 * da notificação: sempre reconsultamos a order direto na API do Mercado Pago antes
 * de marcar qualquer pedido como pago. */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getValidAccessToken } from "../_shared/mercadopago.ts";

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* Avisa o BASE7 CARE (monitoramento externo) que um webhook real e assinado
 * corretamente foi recebido - padrão "dead man's snitch" (o CARE não
 * consegue "puxar" webhooks, só sabe que estão vivos por esse aviso). Nunca
 * deve derrubar o processamento do webhook em si: erro aqui só vira log. */
async function pingCareWebhook(): Promise<void> {
  const url = Deno.env.get("CARE_WEBHOOK_INGEST_URL");
  if (!url) return;
  try {
    await fetch(url, { method: "POST" });
  } catch (err) {
    console.error("Falha ao avisar o BASE7 CARE do webhook:", err);
  }
}

/* Status possíveis de uma Order na API Orders do Mercado Pago:
 * created/processing/action_required = ainda em andamento; processed = pago;
 * failed = recusado; cancelled/expired = nunca foi pago e não vai mais;
 * refunded/charged_back = estornado. */
function mapMpStatus(mpStatus: string): "pago" | "recusado" | "estornado" | "pendente" {
  if (mpStatus === "processed") return "pago";
  if (mpStatus === "failed" || mpStatus === "cancelled" || mpStatus === "expired") return "recusado";
  if (mpStatus === "refunded" || mpStatus === "charged_back") return "estornado";
  return "pendente";
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    let dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

    // A API Orders costuma mandar o id só no corpo (não na query string).
    let body: Record<string, unknown> | null = null;
    if (!dataId && req.method === "POST") {
      body = await req.json().catch(() => null);
      const data = body?.data as { id?: string } | undefined;
      dataId = data?.id ?? null;
    }

    const xSignature = req.headers.get("x-signature");
    const xRequestId = req.headers.get("x-request-id");

    if (!dataId || !xSignature || !xRequestId) {
      return new Response("bad request", { status: 400 });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // O segredo do webhook fica salvo no banco (junto das outras credenciais do
    // lojista), não como secret de Edge Function - cada instalação é de um
    // lojista só, então o mesmo nível de proteção (RLS zero policies) se aplica.
    const { data: creds } = await serviceClient
      .from("mercadopago_credentials")
      .select("webhook_secret")
      .eq("id", 1)
      .maybeSingle();
    const webhookSecret = creds?.webhook_secret;
    if (!webhookSecret) {
      console.error("Webhook secret não configurado.");
      return new Response("not configured", { status: 400 });
    }

    const parts = Object.fromEntries(
      xSignature.split(",").map((p) => p.split("=").map((s) => s.trim())) as [string, string][]
    );
    const ts = parts.ts;
    const v1 = parts.v1;
    if (!ts || !v1) return new Response("bad signature format", { status: 400 });

    const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
    const expected = await hmacSha256Hex(webhookSecret, manifest);

    if (!timingSafeEqual(expected, v1)) {
      console.error("Assinatura de webhook inválida.");
      return new Response("invalid signature", { status: 401 });
    }

    // Reconsulta a order direto na API do MP - a fonte da verdade nunca é o
    // corpo da notificação, mesmo com assinatura válida.
    const accessToken = await getValidAccessToken(serviceClient);
    const orderResponse = await fetch(`https://api.mercadopago.com/v1/orders/${dataId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!orderResponse.ok) {
      console.error("Falha ao consultar order no Mercado Pago:", await orderResponse.text());
      return new Response("ok", { status: 200 }); // não é erro do MP, evita retry infinito
    }

    const mpOrder = await orderResponse.json();
    const mpStatus = mpOrder.status as string;

    // Idempotência: se já processamos esta combinação order+status, não refaz nada.
    const { error: dedupError } = await serviceClient
      .from("payment_webhook_events")
      .insert({ mp_payment_id: String(dataId), mp_status: mpStatus });

    if (dedupError) {
      // violação de unicidade = já processado antes; responde 200 sem reprocessar
      await pingCareWebhook();
      return new Response("ok", { status: 200 });
    }

    await serviceClient
      .from("orders")
      .update({
        payment_status: mapMpStatus(mpStatus),
        mp_status_detail: mpOrder.status_detail ?? null,
      })
      .eq("mp_payment_id", String(dataId));

    await pingCareWebhook();
    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("Erro inesperado no webhook:", err);
    return new Response("error", { status: 500 });
  }
});
