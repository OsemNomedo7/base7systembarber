import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AvailableSlot } from "@/types/barber";

/* Único jeito de descobrir disponibilidade: professional_schedules e
 * professional_time_off não têm leitura pública (ver migration 0019) - só esta
 * função (get_available_slots, security definer) devolve os horários já calculados. */
export function useAvailableSlots(professionalId: string | undefined, serviceId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ["available-slots", professionalId, serviceId, date],
    queryFn: async (): Promise<AvailableSlot[]> => {
      const { data, error } = await supabase.rpc("get_available_slots", {
        p_professional_id: professionalId,
        p_service_id: serviceId,
        p_date: date,
      });
      if (error) throw error;
      return data as AvailableSlot[];
    },
    enabled: !!professionalId && !!serviceId && !!date,
  });
}
