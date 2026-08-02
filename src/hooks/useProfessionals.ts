import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Professional } from "@/types/barber";

/* activeOnly=false é usado só no admin (RLS libera ver tudo pra quem está autenticado) */
export function useProfessionals(activeOnly = true) {
  return useQuery({
    queryKey: ["professionals", { activeOnly }],
    queryFn: async (): Promise<Professional[]> => {
      let query = supabase.from("professionals").select("*").order("name", { ascending: true });
      if (activeOnly) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw error;
      return data as Professional[];
    },
  });
}
