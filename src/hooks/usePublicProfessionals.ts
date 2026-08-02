import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { PublicProfessional } from "@/types/barber";

/* Site público: nunca lê a tabela professionals diretamente (a RLS não libera
 * select público desde a migration 0022, justamente pra não vazar o telefone
 * pessoal do profissional) - sempre via RPC security definer com colunas
 * seguras só. */
export function usePublicProfessionals() {
  return useQuery({
    queryKey: ["public-professionals"],
    queryFn: async (): Promise<PublicProfessional[]> => {
      const { data, error } = await supabase.rpc("get_public_professionals");
      if (error) throw error;
      return data as PublicProfessional[];
    },
  });
}
