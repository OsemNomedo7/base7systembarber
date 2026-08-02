import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AppointmentStatus } from "@/types/barber";

export function useAppointmentMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["appointments"] });

  /* Preço/duração NUNCA são enviados pelo cliente - create_appointment relê tudo de
   * services/professionals e valida expediente/bloqueios/conflito no backend
   * (mesmo modelo de segurança do create_order do e-commerce). Usado tanto pelo
   * admin (agendamento por telefone/balcão) quanto, futuramente, pelo site público. */
  const createAppointment = useMutation({
    mutationFn: async (params: {
      customerName: string;
      customerPhone: string;
      professionalId: string;
      serviceId: string;
      startsAt: string; // ISO
      notes?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("create_appointment", {
        p_customer_name: params.customerName,
        p_customer_phone: params.customerPhone,
        p_professional_id: params.professionalId,
        p_service_id: params.serviceId,
        p_starts_at: params.startsAt,
        p_notes: params.notes ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: invalidate,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /* Remarcar: só muda starts_at - o trigger appointments_set_ends_at recalcula ends_at,
   * e a exclusion constraint (appointments_no_overlap) barra qualquer conflito. */
  const reschedule = useMutation({
    mutationFn: async ({ id, startsAt }: { id: string; startsAt: string }) => {
      const { error } = await supabase.from("appointments").update({ starts_at: startsAt }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string | null }) => {
      const { error } = await supabase.from("appointments").update({ notes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { createAppointment, updateStatus, reschedule, updateNotes };
}
