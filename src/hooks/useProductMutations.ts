import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/data/products";

export function useProductMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["products"] });

  const createProduct = useMutation({
    mutationFn: async (product: Omit<Product, "id">) => {
      const { data, error } = await supabase.from("products").insert(product).select("id").single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: invalidate,
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...product }: Partial<Product> & { id: string }) => {
      const { error } = await supabase.from("products").update(product).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { createProduct, updateProduct, deleteProduct };
}
