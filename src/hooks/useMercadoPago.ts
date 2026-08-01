import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface MercadoPagoStatus {
  is_connected: boolean;
  live_mode: boolean | null;
  connected_at: string | null;
}

export function useMercadoPagoStatus() {
  return useQuery({
    queryKey: ["mercadopago-status"],
    queryFn: async (): Promise<MercadoPagoStatus> => {
      const { data, error } = await supabase.rpc("get_mercadopago_status").single();
      if (error) throw error;
      return data as MercadoPagoStatus;
    },
  });
}

export interface SaveCredentialsInput {
  access_token: string;
  public_key: string;
  webhook_secret: string;
}

/* Salva as credenciais do lojista (Access Token/Public Key da aplicação própria
 * dele no Mercado Pago + segredo do webhook) - modelo direto, sem OAuth. */
export function useSaveMercadoPagoCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveCredentialsInput) => {
      const { data, error } = await supabase.functions.invoke("mercadopago-save-credentials", {
        body: input,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mercadopago-status"] }),
  });
}

/* URL que o lojista deve cadastrar como webhook no painel do Mercado Pago. */
export function getMercadoPagoWebhookUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  return `${supabaseUrl}/functions/v1/mercadopago-webhook`;
}
