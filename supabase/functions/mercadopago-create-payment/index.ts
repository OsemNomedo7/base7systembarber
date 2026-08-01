/* Cria um pagamento Pix no Mercado Pago (via API Orders, POST /v1/orders) para um
 * pedido já existente (criado via RPC create_order) e devolve o QR code para o
 * checkout exibir. Chamada pública (o comprador não está logado), mas nunca expõe
 * o access_token do lojista.
 *
 * Usamos a API Orders (não a API Pagamentos clássica) porque é o caminho oficialmente
 * documentado e testado pelo Mercado Pago para Pix no Checkout Transparente, com
 * suporte de simulação em sandbox (payer.first_name = "APRO" força aprovação
 * automática em contas de teste - nunca usado aqui, só documentado pra referência
 * de quem for testar manualmente). */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getValidAccessToken } from "../_shared/mercadopago.ts";

interface CreatePaymentBody {
  order_id: string;
  payer: { email: string; cpf: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { order_id, payer } = (await req.json()) as CreatePaymentBody;
    if (!order_id || !payer?.email || !payer?.cpf) {
      return new Response(JSON.stringify({ error: "Dados do pedido/pagador incompletos." }), {
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
      .select("id, order_number, total, customer_name, mp_payment_id")
      .eq("id", order_id)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.mp_payment_id) {
      return new Response(JSON.stringify({ error: "Este pedido já tem um pagamento Pix gerado." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getValidAccessToken(serviceClient);
    const amount = order.total.toFixed(2);
    const firstName = (order.customer_name ?? "Cliente").trim().split(/\s+/)[0] || "Cliente";

    const orderResponse = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": order.id,
      },
      body: JSON.stringify({
        type: "online",
        external_reference: order.id,
        total_amount: amount,
        processing_mode: "automatic",
        payer: {
          email: payer.email,
          first_name: firstName,
        },
        transactions: {
          payments: [
            {
              amount,
              payment_method: { id: "pix", type: "bank_transfer" },
            },
          ],
        },
      }),
    });

    if (!orderResponse.ok) {
      const errorBody = await orderResponse.text();
      console.error("Falha ao criar order Pix:", errorBody);
      return new Response(JSON.stringify({ error: "Falha ao criar o pagamento Pix." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpOrder = await orderResponse.json();
    const paymentInfo = mpOrder.transactions?.payments?.[0];
    const paymentMethod = paymentInfo?.payment_method;

    await serviceClient
      .from("orders")
      .update({ mp_payment_id: String(mpOrder.id), mp_status_detail: mpOrder.status_detail ?? null })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({
        payment_id: mpOrder.id,
        status: mpOrder.status,
        qr_code: paymentMethod?.qr_code ?? null,
        qr_code_base64: paymentMethod?.qr_code_base64 ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro inesperado no create-payment:", err);
    return new Response(JSON.stringify({ error: "Erro inesperado." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
