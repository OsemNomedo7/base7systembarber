import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Service } from "@/types/barber";

export function useService(id: string | undefined) {
  return useQuery({
    queryKey: ["services", id],
    queryFn: async (): Promise<Service | null> => {
      const { data, error } = await supabase.from("services").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Service | null;
    },
    enabled: !!id,
  });
}
