import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ProfessionalSchedule, ProfessionalTimeOff } from "@/types/barber";

export function useProfessionalSchedules(professionalId: string | undefined) {
  return useQuery({
    queryKey: ["professional-schedules", professionalId],
    queryFn: async (): Promise<ProfessionalSchedule[]> => {
      const { data, error } = await supabase
        .from("professional_schedules")
        .select("*")
        .eq("professional_id", professionalId)
        .order("weekday", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data as ProfessionalSchedule[];
    },
    enabled: !!professionalId,
  });
}

export function useProfessionalTimeOff(professionalId: string | undefined) {
  return useQuery({
    queryKey: ["professional-time-off", professionalId],
    queryFn: async (): Promise<ProfessionalTimeOff[]> => {
      const { data, error } = await supabase
        .from("professional_time_off")
        .select("*")
        .eq("professional_id", professionalId)
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return data as ProfessionalTimeOff[];
    },
    enabled: !!professionalId,
  });
}

export function useProfessionalScheduleMutations() {
  const queryClient = useQueryClient();

  const addSchedule = useMutation({
    mutationFn: async (schedule: Omit<ProfessionalSchedule, "id" | "created_at" | "updated_at">) => {
      const { error } = await supabase.from("professional_schedules").insert(schedule);
      if (error) throw error;
    },
    onSuccess: (_data, { professional_id }) =>
      queryClient.invalidateQueries({ queryKey: ["professional-schedules", professional_id] }),
  });

  const removeSchedule = useMutation({
    mutationFn: async ({ id }: { id: string; professional_id: string }) => {
      const { error } = await supabase.from("professional_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { professional_id }) =>
      queryClient.invalidateQueries({ queryKey: ["professional-schedules", professional_id] }),
  });

  const addTimeOff = useMutation({
    mutationFn: async (timeOff: Omit<ProfessionalTimeOff, "id" | "created_at">) => {
      const { error } = await supabase.from("professional_time_off").insert(timeOff);
      if (error) throw error;
    },
    onSuccess: (_data, { professional_id }) =>
      queryClient.invalidateQueries({ queryKey: ["professional-time-off", professional_id] }),
  });

  const removeTimeOff = useMutation({
    mutationFn: async ({ id }: { id: string; professional_id: string }) => {
      const { error } = await supabase.from("professional_time_off").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { professional_id }) =>
      queryClient.invalidateQueries({ queryKey: ["professional-time-off", professional_id] }),
  });

  return { addSchedule, removeSchedule, addTimeOff, removeTimeOff };
}
