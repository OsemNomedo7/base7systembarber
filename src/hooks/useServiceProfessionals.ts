import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { PublicProfessional } from "@/types/barber";

/* Profissionais ativos que realizam um serviço - usado no fluxo de agendamento
 * pra filtrar a etapa de escolha de profissional. Site público, então via RPC
 * security definer com colunas seguras só (nunca phone - ver migration 0022). */
export function useServiceProfessionals(serviceId: string | undefined) {
  return useQuery({
    queryKey: ["service-professionals", serviceId],
    queryFn: async (): Promise<PublicProfessional[]> => {
      const { data, error } = await supabase.rpc("get_public_professionals_for_service", {
        p_service_id: serviceId,
      });
      if (error) throw error;
      return data as PublicProfessional[];
    },
    enabled: !!serviceId,
  });
}
