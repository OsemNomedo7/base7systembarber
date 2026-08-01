import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface FocusNfeStatus {
  is_connected: boolean;
  ambiente: "homologacao" | "producao";
  connected_at: string | null;
}

export function useFocusNfeStatus() {
  return useQuery({
    queryKey: ["focusnfe-status"],
    queryFn: async (): Promise<FocusNfeStatus> => {
      const { data, error } = await supabase.rpc("get_focusnfe_status").single();
      if (error) throw error;
      return data as FocusNfeStatus;
    },
  });
}

export interface SaveFocusNfeCredentialsInput {
  api_token: string;
  ambiente: "homologacao" | "producao";
  cnpj_emitente: string;
}

/* Salva o token da conta do lojista no Focus NFe (própria conta dele, criada
 * fora do nosso sistema, com CNPJ e certificado digital já configurados lá). */
export function useSaveFocusNfeCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveFocusNfeCredentialsInput) => {
      const { data, error } = await supabase.functions.invoke("focusnfe-save-credentials", {
        body: input,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["focusnfe-status"] }),
  });
}

export interface EmitNfceResult {
  status: "autorizado" | "erro";
  danfe_url?: string | null;
  mensagem_sefaz?: string | null;
}

export function useEmitNfce() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (order_id: string): Promise<EmitNfceResult> => {
      const { data, error } = await supabase.functions.invoke("focusnfe-emit-nfce", {
        body: { order_id },
      });
      if (error) throw error;
      return data as EmitNfceResult;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useCancelNfce() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { order_id: string; justificativa: string }) => {
      const { data, error } = await supabase.functions.invoke("focusnfe-cancel-nfce", {
        body: input,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });
}
