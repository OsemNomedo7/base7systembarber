import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ProductReview, ReviewStatus } from "@/types/db";

/* Avaliações aprovadas de um produto - usado na página pública do produto */
export function useProductReviews(productId: string | undefined) {
  return useQuery({
    queryKey: ["product_reviews", productId],
    enabled: !!productId,
    queryFn: async (): Promise<ProductReview[]> => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("status", "aprovada")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProductReview[];
    },
  });
}

/* Envio público de uma nova avaliação - sempre entra como "pendente" */
export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (review: { product_id: string; customer_name: string; rating: number; comment: string }) => {
      const { error } = await supabase.from("product_reviews").insert({ ...review, status: "pendente" });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product_reviews", variables.product_id] });
    },
  });
}

/* Todas as avaliações (qualquer status) - usado no admin */
export function useAdminReviews() {
  return useQuery({
    queryKey: ["admin_reviews"],
    queryFn: async (): Promise<(ProductReview & { product_name: string | null })[]> => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*, products(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map(({ products, ...review }) => ({
        ...review,
        product_name: products?.name ?? null,
      }));
    },
  });
}

export function useUpdateReviewStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReviewStatus }) => {
      const { error } = await supabase.from("product_reviews").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin_reviews"] }),
  });
}

export function useReplyToReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, admin_reply }: { id: string; admin_reply: string }) => {
      const { error } = await supabase.from("product_reviews").update({ admin_reply }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin_reviews"] }),
  });
}
