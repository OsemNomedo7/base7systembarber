import { describe, it, expect } from "vitest";
import {
  aggregateAppointmentSummary,
  aggregateAppointmentsByPeriod,
  aggregateTopServices,
  aggregateProfessionalPerformance,
} from "./appointmentReports";
import type { Appointment, AppointmentStatus } from "@/types/barber";

const makeAppointment = (overrides: Partial<Appointment> = {}): Appointment => ({
  id: crypto.randomUUID(),
  customer_id: null,
  customer_name: "Cliente Teste",
  customer_phone: "11999999999",
  professional_id: "prof-1",
  professional_name: "Marcos Silva",
  service_id: "serv-1",
  service_name: "Corte",
  service_price: 60,
  service_duration_minutes: 30,
  starts_at: "2026-08-03T10:00:00-03:00",
  ends_at: "2026-08-03T10:30:00-03:00",
  status: "concluido",
  notes: null,
  created_at: "2026-08-01T00:00:00-03:00",
  updated_at: "2026-08-01T00:00:00-03:00",
  ...overrides,
});

describe("aggregateAppointmentSummary", () => {
  it("só conta faturamento e ticket médio de agendamentos concluídos", () => {
    const appointments = [
      makeAppointment({ status: "concluido", service_price: 60 }),
      makeAppointment({ status: "concluido", service_price: 100 }),
      makeAppointment({ status: "cancelado", service_price: 999 }),
      makeAppointment({ status: "nao_compareceu", service_price: 999 }),
      makeAppointment({ status: "aguardando", service_price: 999 }),
    ];

    const summary = aggregateAppointmentSummary(appointments);

    expect(summary.total).toBe(5);
    expect(summary.concluded).toBe(2);
    expect(summary.cancelled).toBe(1);
    expect(summary.noShow).toBe(1);
    expect(summary.revenue).toBe(160);
    expect(summary.avgTicket).toBe(80);
  });

  it("não divide por zero quando não há nenhum concluído", () => {
    const summary = aggregateAppointmentSummary([makeAppointment({ status: "cancelado" })]);
    expect(summary.concluded).toBe(0);
    expect(summary.revenue).toBe(0);
    expect(summary.avgTicket).toBe(0);
  });

  it("lida com lista vazia", () => {
    const summary = aggregateAppointmentSummary([]);
    expect(summary).toEqual({ total: 0, concluded: 0, cancelled: 0, noShow: 0, revenue: 0, avgTicket: 0 });
  });
});

describe("aggregateAppointmentsByPeriod", () => {
  it("agrupa por dia quando o intervalo é curto", () => {
    const appointments = [
      makeAppointment({ starts_at: "2026-08-01T10:00:00-03:00" }),
      makeAppointment({ starts_at: "2026-08-01T14:00:00-03:00" }),
      makeAppointment({ starts_at: "2026-08-02T09:00:00-03:00" }),
    ];

    const points = aggregateAppointmentsByPeriod(appointments, "2026-08-01", "2026-08-02");

    expect(points).toEqual([
      { label: "2026-08-01", agendamentos: 2 },
      { label: "2026-08-02", agendamentos: 1 },
    ]);
  });

  it("agrupa por mês quando o intervalo é longo (> 62 dias)", () => {
    const appointments = [
      makeAppointment({ starts_at: "2026-01-15T10:00:00-03:00" }),
      makeAppointment({ starts_at: "2026-01-20T10:00:00-03:00" }),
      makeAppointment({ starts_at: "2026-03-01T10:00:00-03:00" }),
    ];

    const points = aggregateAppointmentsByPeriod(appointments, "2026-01-01", "2026-04-01");

    expect(points).toEqual([
      { label: "2026-01", agendamentos: 2 },
      { label: "2026-03", agendamentos: 1 },
    ]);
  });
});

describe("aggregateTopServices", () => {
  it("ignora agendamentos não concluídos e ordena por quantidade", () => {
    const appointments = [
      makeAppointment({ service_id: "corte", service_name: "Corte", service_price: 60, status: "concluido" }),
      makeAppointment({ service_id: "corte", service_name: "Corte", service_price: 60, status: "concluido" }),
      makeAppointment({ service_id: "barba", service_name: "Barba", service_price: 50, status: "concluido" }),
      makeAppointment({ service_id: "corte", service_name: "Corte", service_price: 60, status: "cancelado" }),
    ];

    const top = aggregateTopServices(appointments);

    expect(top).toEqual([
      { serviceId: "corte", name: "Corte", quantity: 2, revenue: 120 },
      { serviceId: "barba", name: "Barba", quantity: 1, revenue: 50 },
    ]);
  });

  it("respeita o limite", () => {
    const services: AppointmentStatus[] = ["concluido"];
    const appointments = ["a", "b", "c"].map((id) =>
      makeAppointment({ service_id: id, service_name: id, status: services[0] })
    );
    expect(aggregateTopServices(appointments, 2)).toHaveLength(2);
  });
});

describe("aggregateProfessionalPerformance", () => {
  it("ordena por faturamento e só conta atendimentos concluídos", () => {
    const appointments = [
      makeAppointment({ professional_id: "p1", professional_name: "Marcos", service_price: 60, status: "concluido" }),
      makeAppointment({ professional_id: "p2", professional_name: "Rafael", service_price: 200, status: "concluido" }),
      makeAppointment({ professional_id: "p1", professional_name: "Marcos", service_price: 999, status: "aguardando" }),
    ];

    const performance = aggregateProfessionalPerformance(appointments);

    expect(performance).toEqual([
      { professionalId: "p2", name: "Rafael", concludedCount: 1, revenue: 200 },
      { professionalId: "p1", name: "Marcos", concludedCount: 1, revenue: 60 },
    ]);
  });
});
