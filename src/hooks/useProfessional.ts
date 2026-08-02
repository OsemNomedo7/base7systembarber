import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Professional } from "@/types/barber";

export function useProfessional(id: string | undefined) {
  return useQuery({
    queryKey: ["professionals", id],
    queryFn: async (): Promise<Professional | null> => {
      const { data, error } = await supabase.from("professionals").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Professional | null;
    },
    enabled: !!id,
  });
}

/* ids dos serviços que este profissional realiza (usado para popular os checkboxes no form) */
export function useProfessionalServiceIds(professionalId: string | undefined) {
  return useQuery({
    queryKey: ["professional-services", professionalId],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("professional_services")
        .select("service_id")
        .eq("professional_id", professionalId);
      if (error) throw error;
      return (data as { service_id: string }[]).map((row) => row.service_id);
    },
    enabled: !!professionalId,
  });
}
