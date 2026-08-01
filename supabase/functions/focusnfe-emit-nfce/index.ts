/* Emite a NFC-e de um pedido via Focus NFe (POST /v2/nfce). Chamada só pelo
 * admin autenticado (nunca pública) - o lojista revisa o pedido e decide
 * emitir, dado o peso legal/fiscal de uma nota (diferente do Pix/cartão, não
 * é automático ao confirmar pagamento). A emissão de NFC-e é síncrona: a
 * própria resposta já traz "autorizado" ou "erro_autorizacao". */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getFocusNfeConfig, focusNfeAuthHeader } from "../_shared/focusnfe.ts";

interface EmitBody {
  order_id: string;
}

interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  size: string | null;
}

function mapPaymentMethod(method: string): string {
  if (method === "credito") return "03";
  if (method === "debito") return "04";
  if (method === "pix") return "17";
  return "99";
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

    const { order_id } = (await req.json()) as EmitBody;
    if (!order_id) {
      return new Response(JSON.stringify({ error: "Pedido não informado." }), {
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
      .select("id, items, total, payment_method, delivery_type, nfce_status")
      .eq("id", order_id)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.nfce_status === "autorizado") {
      return new Response(JSON.stringify({ error: "Este pedido já tem uma NFC-e autorizada." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items = order.items as OrderItem[];
    const productIds = [...new Set(items.map((i) => i.product_id))];
    const { data: products, error: productsError } = await serviceClient
      .from("products")
      .select("id, ncm, cfop, unidade_comercial, icms_origem, icms_situacao_tributaria")
      .in("id", productIds);

    if (productsError) {
      return new Response(JSON.stringify({ error: "Falha ao buscar dados fiscais dos produtos." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productsById = new Map((products ?? []).map((p) => [p.id, p]));
    const missingNcm = items.find((i) => !productsById.get(i.product_id)?.ncm);
    if (missingNcm) {
      return new Response(
        JSON.stringify({ error: `Produto "${missingNcm.name}" sem NCM cadastrado. Preencha os dados fiscais dele antes de emitir.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { token, baseUrl, cnpjEmitente } = await getFocusNfeConfig(serviceClient);

    const nfceItems = items.map((item, index) => {
      const product = productsById.get(item.product_id)!;
      const valorBruto = item.price * item.quantity;
      return {
        numero_item: String(index + 1),
        codigo_ncm: product.ncm,
        codigo_produto: item.product_id,
        descricao: item.name,
        quantidade_comercial: item.quantity,
        quantidade_tributavel: item.quantity,
        cfop: product.cfop,
        valor_unitario_comercial: item.price,
        valor_unitario_tributavel: item.price,
        valor_bruto: valorBruto,
        unidade_comercial: product.unidade_comercial,
        unidade_tributavel: product.unidade_comercial,
        icms_origem: product.icms_origem,
        icms_situacao_tributaria: product.icms_situacao_tributaria,
      };
    });

    const payload = {
      cnpj_emitente: cnpjEmitente,
      data_emissao: new Date().toISOString(),
      presenca_comprador: order.delivery_type === "retirada" ? "1" : "2",
      modalidade_frete: "9",
      local_destino: "1",
      natureza_operacao: "Venda ao consumidor",
      items: nfceItems,
      formas_pagamento: [
        { forma_pagamento: mapPaymentMethod(order.payment_method), valor_pagamento: order.total },
      ],
    };

    const nfceResponse = await fetch(`${baseUrl}/v2/nfce?ref=${order.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: focusNfeAuthHeader(token),
      },
      body: JSON.stringify(payload),
    });

    const nfceBody = await nfceResponse.json().catch(() => null);

    if (!nfceBody) {
      return new Response(JSON.stringify({ error: "Resposta inesperada do Focus NFe." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (nfceBody.status === "autorizado") {
      await serviceClient
        .from("orders")
        .update({
          nfce_status: "autorizado",
          nfce_ref: String(order.id),
          nfce_chave: nfceBody.chave_nfe ?? null,
          nfce_numero: nfceBody.numero ?? null,
          nfce_serie: nfceBody.serie ?? null,
          nfce_danfe_url: nfceBody.caminho_danfe ?? null,
          nfce_mensagem_sefaz: nfceBody.mensagem_sefaz ?? null,
          nfce_emitted_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      return new Response(
        JSON.stringify({ status: "autorizado", danfe_url: nfceBody.caminho_danfe ?? null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mensagem = nfceBody.mensagem_sefaz ?? "Falha desconhecida ao emitir a NFC-e.";
    await serviceClient
      .from("orders")
      .update({
        nfce_status: "erro",
        nfce_ref: String(order.id),
        nfce_mensagem_sefaz: mensagem,
      })
      .eq("id", order.id);

    return new Response(JSON.stringify({ status: "erro", mensagem_sefaz: mensagem }), {
      status: 422,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro inesperado no focusnfe-emit-nfce:", err);
    const message = err instanceof Error ? err.message : "Erro inesperado.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
