import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Appointment, AppointmentStatus } from "@/types/barber";

export interface AppointmentFilters {
  professionalId?: string;
  status?: AppointmentStatus;
  dateFrom?: string; // ISO date (yyyy-mm-dd)
  dateTo?: string; // ISO date (yyyy-mm-dd)
  search?: string; // nome ou telefone do cliente
}

export function useAppointments(filters: AppointmentFilters = {}) {
  const { professionalId, status, dateFrom, dateTo, search } = filters;
  return useQuery({
    queryKey: ["appointments", filters],
    queryFn: async (): Promise<Appointment[]> => {
      let query = supabase.from("appointments").select("*").order("starts_at", { ascending: true });

      if (professionalId) query = query.eq("professional_id", professionalId);
      if (status) query = query.eq("status", status);
      if (dateFrom) query = query.gte("starts_at", `${dateFrom}T00:00:00`);
      if (dateTo) query = query.lte("starts_at", `${dateTo}T23:59:59`);
      if (search?.trim()) {
        const term = search.trim();
        query = query.or(`customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Appointment[];
    },
  });
}
