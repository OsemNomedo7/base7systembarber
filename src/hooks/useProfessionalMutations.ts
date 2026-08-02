import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Professional } from "@/types/barber";

export function useProfessionalMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["professionals"] });

  const createProfessional = useMutation({
    mutationFn: async (professional: Omit<Professional, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase.from("professionals").insert(professional).select("id").single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: invalidate,
  });

  const updateProfessional = useMutation({
    mutationFn: async ({ id, ...professional }: Partial<Professional> & { id: string }) => {
      const { error } = await supabase.from("professionals").update(professional).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteProfessional = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("professionals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /* Substitui o conjunto inteiro de serviços que o profissional realiza (usado
   * pelo form, que edita a seleção via checkboxes e salva tudo de uma vez). */
  const setProfessionalServices = useMutation({
    mutationFn: async ({ professionalId, serviceIds }: { professionalId: string; serviceIds: string[] }) => {
      const { error: deleteError } = await supabase
        .from("professional_services")
        .delete()
        .eq("professional_id", professionalId);
      if (deleteError) throw deleteError;

      if (serviceIds.length > 0) {
        const { error: insertError } = await supabase
          .from("professional_services")
          .insert(serviceIds.map((serviceId) => ({ professional_id: professionalId, service_id: serviceId })));
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_data, { professionalId }) => {
      queryClient.invalidateQueries({ queryKey: ["professional-services", professionalId] });
    },
  });

  return { createProfessional, updateProfessional, deleteProfessional, setProfessionalServices };
}
