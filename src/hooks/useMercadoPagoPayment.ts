import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface CreatePixPaymentInput {
  order_id: string;
  payer: { email: string; cpf: string };
}

export interface PixPaymentResult {
  payment_id: number;
  status: string;
  qr_code: string | null;
  qr_code_base64: string | null;
}

export function useCreatePixPayment() {
  return useMutation({
    mutationFn: async (input: CreatePixPaymentInput): Promise<PixPaymentResult> => {
      const { data, error } = await supabase.functions.invoke("mercadopago-create-payment", {
        body: input,
      });
      if (error) throw error;
      return data as PixPaymentResult;
    },
  });
}

export interface CreateCardPaymentInput {
  order_id: string;
  token: string;
  payment_method_id: string;
  installments: number;
  payer: { email: string; cpf: string };
}

export interface CardPaymentResult {
  status: string;
  status_detail: string | null;
  payment_status: "pendente" | "pago" | "recusado" | "estornado";
}

export function useCreateCardPayment() {
  return useMutation({
    mutationFn: async (input: CreateCardPaymentInput): Promise<CardPaymentResult> => {
      const { data, error } = await supabase.functions.invoke("mercadopago-create-card-payment", {
        body: input,
      });
      if (error) throw error;
      return data as CardPaymentResult;
    },
  });
}

/* Public key é seguro expor (equivalente à publishable key do Stripe) - o
 * checkout precisa dela pra inicializar o SDK/Brick do Mercado Pago no cliente. */
export function useMercadoPagoPublicKey() {
  return useQuery({
    queryKey: ["mercadopago-public-key"],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.rpc("get_mercadopago_public_key");
      if (error) throw error;
      return data as string | null;
    },
  });
}

const TERMINAL_STATUSES = new Set(["pago", "recusado", "estornado"]);

/* Fica perguntando o status do pedido de tempos em tempos até o pagamento ser
 * confirmado (ou recusado) pelo backend/Mercado Pago - nunca confia em nada que
 * o próprio navegador "ache" que aconteceu. */
export function usePollOrderPaymentStatus(orderId: string | null) {
  return useQuery({
    queryKey: ["order-payment-status", orderId],
    enabled: !!orderId,
    refetchInterval: (query) => {
      const status = query.state.data?.payment_status;
      return status && TERMINAL_STATUSES.has(status) ? false : 3000;
    },
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_order_payment_status", { p_order_id: orderId })
        .single();
      if (error) throw error;
      return data as { payment_status: string; status: string };
    },
  });
}
