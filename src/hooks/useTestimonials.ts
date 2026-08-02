import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Testimonial, TestimonialStatus } from "@/types/barber";

/* Depoimentos aprovados sobre a barbearia/atendimento - usado no site público */
export function useTestimonials() {
  return useQuery({
    queryKey: ["testimonials"],
    queryFn: async (): Promise<Testimonial[]> => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("status", "aprovada")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Testimonial[];
    },
  });
}

/* Envio público de um novo depoimento - sempre entra como "pendente" */
export function useCreateTestimonial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (testimonial: {
      customer_name: string;
      rating: number;
      comment: string;
      professional_id?: string | null;
    }) => {
      const { error } = await supabase.from("testimonials").insert({ ...testimonial, status: "pendente" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["testimonials"] }),
  });
}

interface AdminTestimonialRow extends Testimonial {
  professional_name: string | null;
}

/* Todos os depoimentos (qualquer status) - usado no admin */
export function useAdminTestimonials() {
  return useQuery({
    queryKey: ["admin_testimonials"],
    queryFn: async (): Promise<AdminTestimonialRow[]> => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*, professionals(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as (Testimonial & { professionals: { name: string } | null })[]).map(
        ({ professionals, ...testimonial }) => ({
          ...testimonial,
          professional_name: professionals?.name ?? null,
        })
      );
    },
  });
}

export function useUpdateTestimonialStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TestimonialStatus }) => {
      const { error } = await supabase.from("testimonials").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin_testimonials"] }),
  });
}

export function useReplyToTestimonial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, admin_reply }: { id: string; admin_reply: string }) => {
      const { error } = await supabase.from("testimonials").update({ admin_reply }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin_testimonials"] }),
  });
}
