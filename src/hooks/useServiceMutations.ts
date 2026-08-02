import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Service } from "@/types/barber";

export function useServiceMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["services"] });

  const createService = useMutation({
    mutationFn: async (service: Omit<Service, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase.from("services").insert(service).select("id").single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: invalidate,
  });

  const updateService = useMutation({
    mutationFn: async ({ id, ...service }: Partial<Service> & { id: string }) => {
      const { error } = await supabase.from("services").update(service).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { createService, updateService, deleteService };
}
