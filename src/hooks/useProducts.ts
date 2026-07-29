import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/data/products";

/* activeOnly=false é usado só no admin (RLS libera ver tudo pra quem está autenticado) */
export function useProducts(activeOnly = true) {
  return useQuery({
    queryKey: ["products", { activeOnly }],
    queryFn: async (): Promise<Product[]> => {
      let query = supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: true });
      if (activeOnly) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });
}
