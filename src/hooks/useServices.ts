import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Service } from "@/types/barber";

/* activeOnly=false é usado só no admin (RLS libera ver tudo pra quem está autenticado) */
export function useServices(activeOnly = true) {
  return useQuery({
    queryKey: ["services", { activeOnly }],
    queryFn: async (): Promise<Service[]> => {
      let query = supabase
        .from("services")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (activeOnly) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw error;
      return data as Service[];
    },
  });
}
