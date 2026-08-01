/* Cria um pagamento com cartão de crédito no Mercado Pago (via API Orders,
 * POST /v1/orders) para um pedido já existente (criado via RPC create_order).
 * O token do cartão já vem pronto do Brick <CardPayment> (@mercadopago/sdk-react)
 * rodando no navegador do comprador - o número/CVV do cartão nunca chega aqui,
 * só o token gerado pelo SDK do Mercado Pago.
 *
 * Diferente do Pix, cartão aprova/recusa na hora (síncrono), então esta função
 * já atualiza o payment_status do pedido direto na resposta - o webhook continua
 * ativo como rede de segurança para qualquer mudança de status assíncrona
 * (estorno etc.), sem precisar de nenhuma mudança nele. */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getValidAccessToken } from "../_shared/mercadopago.ts";

interface CreateCardPaymentBody {
  order_id: string;
  token: string;
  payment_method_id: string;
  installments: number;
  payer: { email: string; cpf: string };
}

function mapMpStatus(mpStatus: string): "pago" | "recusado" | "estornado" | "pendente" {
  if (mpStatus === "processed") return "pago";
  if (mpStatus === "failed" || mpStatus === "cancelled" || mpStatus === "expired") return "recusado";
  if (mpStatus === "refunded" || mpStatus === "charged_back") return "estornado";
  return "pendente";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { order_id, token, payment_method_id, installments, payer } =
      (await req.json()) as CreateCardPaymentBody;

    if (!order_id || !token || !payment_method_id || !installments || !payer?.email || !payer?.cpf) {
      return new Response(JSON.stringify({ error: "Dados do pedido/pagamento incompletos." }), {
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
      .select("id, total, mp_payment_id")
      .eq("id", order_id)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.mp_payment_id) {
      return new Response(JSON.stringify({ error: "Este pedido já tem um pagamento gerado." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getValidAccessToken(serviceClient);
    const amount = order.total.toFixed(2);

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
          identification: { type: "CPF", number: payer.cpf.replace(/\D/g, "") },
        },
        transactions: {
          payments: [
            {
              amount,
              payment_method: {
                id: payment_method_id,
                type: "credit_card",
                token,
                installments,
              },
            },
          ],
        },
      }),
    });

    if (!orderResponse.ok) {
      const errorBody = await orderResponse.text();
      console.error("Falha ao criar order de cartão:", errorBody);
      return new Response(JSON.stringify({ error: "Falha ao processar o pagamento." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpOrder = await orderResponse.json();
    const paymentInfo = mpOrder.transactions?.payments?.[0];
    const paymentStatus = mapMpStatus(mpOrder.status as string);

    await serviceClient
      .from("orders")
      .update({
        mp_payment_id: String(mpOrder.id),
        mp_status_detail: mpOrder.status_detail ?? null,
        payment_status: paymentStatus,
        card_brand: paymentInfo?.payment_method?.id ?? payment_method_id,
        card_last_four: paymentInfo?.card?.last_four_digits ?? null,
        card_installments: installments,
      })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({
        status: mpOrder.status,
        status_detail: mpOrder.status_detail ?? null,
        payment_status: paymentStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro inesperado no create-card-payment:", err);
    return new Response(JSON.stringify({ error: "Erro inesperado." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
