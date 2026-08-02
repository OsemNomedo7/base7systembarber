import type { Appointment } from "@/types/barber";

export interface AppointmentSummary {
  total: number;
  concluded: number;
  cancelled: number;
  noShow: number;
  revenue: number;
  avgTicket: number;
}

/* Faturamento e ticket médio só contam atendimentos "concluido" - agendamento
 * aguardando/confirmado ainda não é uma venda realizada, e cancelado/não
 * compareceu não gerou receita. */
export function aggregateAppointmentSummary(appointments: Appointment[]): AppointmentSummary {
  const concludedList = appointments.filter((a) => a.status === "concluido");
  const revenue = concludedList.reduce((sum, a) => sum + a.service_price, 0);
  return {
    total: appointments.length,
    concluded: concludedList.length,
    cancelled: appointments.filter((a) => a.status === "cancelado").length,
    noShow: appointments.filter((a) => a.status === "nao_compareceu").length,
    revenue,
    avgTicket: concludedList.length > 0 ? revenue / concludedList.length : 0,
  };
}

export interface AppointmentPeriodPoint {
  label: string;
  agendamentos: number;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function aggregateAppointmentsByPeriod(
  appointments: Appointment[],
  dateFrom?: string,
  dateTo?: string
): AppointmentPeriodPoint[] {
  const byMonth = (() => {
    if (!dateFrom || !dateTo) return false;
    const days = (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / MS_PER_DAY;
    return days > 62;
  })();

  const buckets = new Map<string, number>();
  for (const appointment of appointments) {
    const date = new Date(appointment.starts_at);
    const key = byMonth
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      : date.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, agendamentos]) => ({ label, agendamentos }));
}

export interface TopService {
  serviceId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export function aggregateTopServices(appointments: Appointment[], limit = 10): TopService[] {
  const buckets = new Map<string, TopService>();
  for (const a of appointments) {
    if (a.status !== "concluido") continue;
    const entry = buckets.get(a.service_id) ?? {
      serviceId: a.service_id,
      name: a.service_name,
      quantity: 0,
      revenue: 0,
    };
    entry.quantity += 1;
    entry.revenue += a.service_price;
    buckets.set(a.service_id, entry);
  }
  return Array.from(buckets.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

export interface ProfessionalPerformance {
  professionalId: string;
  name: string;
  concludedCount: number;
  revenue: number;
}

export function aggregateProfessionalPerformance(
  appointments: Appointment[],
  limit = 10
): ProfessionalPerformance[] {
  const buckets = new Map<string, ProfessionalPerformance>();
  for (const a of appointments) {
    if (a.status !== "concluido") continue;
    const entry = buckets.get(a.professional_id) ?? {
      professionalId: a.professional_id,
      name: a.professional_name,
      concludedCount: 0,
      revenue: 0,
    };
    entry.concludedCount += 1;
    entry.revenue += a.service_price;
    buckets.set(a.professional_id, entry);
  }
  return Array.from(buckets.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}
