import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ProductStock } from "@/types/db";

/* Estoque de todos os produtos, com nome/categoria do produto anexados para a tela /admin/estoque */
export interface ProductStockRow extends ProductStock {
  product_name: string;
  product_category: string;
}

interface ProductStockJoinRow extends ProductStock {
  products: { name: string; category: string } | null;
}

export function useAllProductStock() {
  return useQuery({
    queryKey: ["product-stock"],
    queryFn: async (): Promise<ProductStockRow[]> => {
      const { data, error } = await supabase
        .from("product_stock")
        .select("*, products(name, category)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data as ProductStockJoinRow[]).map(({ products, ...row }) => ({
        ...row,
        product_name: products?.name ?? "",
        product_category: products?.category ?? "",
      }));
    },
  });
}

export function useProductStockByProduct(productId?: string) {
  return useQuery({
    queryKey: ["product-stock", "by-product", productId],
    enabled: !!productId,
    queryFn: async (): Promise<ProductStock[]> => {
      const { data, error } = await supabase
        .from("product_stock")
        .select("*")
        .eq("product_id", productId);
      if (error) throw error;
      return data as ProductStock[];
    },
  });
}

export function useProductStockMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["product-stock"] });

  /* Ajuste manual de quantidade (tela de Estoque) */
  const setQuantity = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const { error } = await supabase.from("product_stock").update({ quantity }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /* Cria/atualiza a linha de estoque de um tamanho específico do produto (usado no
   * form de produto). Não dá pra usar upsert com onConflict aqui porque o índice único
   * de product_stock é uma expressão (coalesce(size, '')), que o PostgREST não casa
   * como alvo de ON CONFLICT — por isso o find-then-update/insert manual abaixo. */
  const upsertStock = useMutation({
    mutationFn: async ({
      productId,
      size,
      quantity,
    }: {
      productId: string;
      size: string | null;
      quantity: number;
    }) => {
      let findQuery = supabase.from("product_stock").select("id").eq("product_id", productId);
      findQuery = size === null ? findQuery.is("size", null) : findQuery.eq("size", size);
      const { data: existing, error: findError } = await findQuery.maybeSingle();
      if (findError) throw findError;

      if (existing) {
        const { error } = await supabase
          .from("product_stock")
          .update({ quantity })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("product_stock")
          .insert({ product_id: productId, size, quantity });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  return { setQuantity, upsertStock };
}
