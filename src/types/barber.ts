/* Tipos das tabelas do domínio de agendamento (services, professionals,
 * professional_services, professional_schedules, professional_time_off,
 * appointments) — migrations 0018 a 0020 */

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  image: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Professional {
  id: string;
  name: string;
  photo: string | null;
  bio: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/* Subconjunto seguro de colunas exposto ao site público (RPCs
 * get_public_professionals[_for_service], migration 0022) - nunca inclui
 * phone, que é dado interno do profissional. */
export type PublicProfessional = Pick<Professional, "id" | "name" | "photo" | "bio">;

export interface ProfessionalService {
  professional_id: string;
  service_id: string;
}

export interface ProfessionalSchedule {
  id: string;
  professional_id: string;
  weekday: number; // 0 = domingo ... 6 = sábado (extract(dow))
  start_time: string; // "HH:MM:SS"
  end_time: string; // "HH:MM:SS"
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalTimeOff {
  id: string;
  professional_id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  created_at: string;
}

export type AppointmentStatus =
  | "aguardando"
  | "confirmado"
  | "em_atendimento"
  | "concluido"
  | "cancelado"
  | "nao_compareceu";

export interface Appointment {
  id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  professional_id: string;
  professional_name: string;
  service_id: string;
  service_name: string;
  service_price: number;
  service_duration_minutes: number;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AvailableSlot {
  slot_start: string;
  slot_end: string;
}

export type TestimonialStatus = "pendente" | "aprovada" | "rejeitada";

export interface Testimonial {
  id: string;
  professional_id: string | null;
  customer_name: string;
  rating: number;
  comment: string | null;
  status: TestimonialStatus;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
}
