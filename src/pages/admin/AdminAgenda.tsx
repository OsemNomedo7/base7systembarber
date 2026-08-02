/* Agenda: agendamentos de um dia, com filtro por profissional/status, criação
 * de novo agendamento (walk-in / por telefone) e remarcação. */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { useAppointments } from "@/hooks/useAppointments";
import { useAppointmentMutations } from "@/hooks/useAppointmentMutations";
import { useAvailableSlots } from "@/hooks/useAvailableSlots";
import { useProfessionals } from "@/hooks/useProfessionals";
import { useProfessionalServiceIds } from "@/hooks/useProfessional";
import { useServices } from "@/hooks/useServices";
import type { Appointment, AppointmentStatus } from "@/types/barber";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import AppointmentStatusSelect from "@/components/admin/AppointmentStatusSelect";

const ANY = "todos";

const todayLocalDate = () => new Date().toLocaleDateString("sv-SE"); // yyyy-mm-dd, fuso local do navegador

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const toISODate = (d: Date) => d.toLocaleDateString("sv-SE"); // yyyy-mm-dd, fuso local

const addDaysISO = (isoDate: string, days: number) => {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
};

/* Segunda-feira como início da semana (padrão de expediente do resto do sistema). */
const startOfWeekISO = (isoDate: string) => {
  const d = new Date(`${isoDate}T00:00:00`);
  const weekday = d.getDay(); // 0 = domingo
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
  return addDaysISO(isoDate, diffToMonday);
};

const AdminAgenda = () => {
  const [view, setView] = useState<"dia" | "semana">("dia");
  const [date, setDate] = useState(todayLocalDate());
  const [professionalId, setProfessionalId] = useState<string>(ANY);
  const [status, setStatus] = useState<string>(ANY);
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  const weekStart = useMemo(() => startOfWeekISO(date), [date]);
  const weekEnd = useMemo(() => addDaysISO(weekStart, 6), [weekStart]);

  const { data: professionals = [] } = useProfessionals(false);
  const { data: appointments = [], isLoading } = useAppointments({
    dateFrom: view === "semana" ? weekStart : date,
    dateTo: view === "semana" ? weekEnd : date,
    professionalId: professionalId === ANY ? undefined : professionalId,
    status: status === ANY ? undefined : (status as AppointmentStatus),
  });
  const { updateStatus } = useAppointmentMutations();

  const handleStatusChange = (appointmentId: string, newStatus: AppointmentStatus) =>
    updateStatus.mutate(
      { id: appointmentId, status: newStatus },
      { onError: () => toast.error("Falha ao atualizar status.") }
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-semibold">Agenda</h1>
        <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={16} />
              Novo agendamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo agendamento</DialogTitle>
            </DialogHeader>
            <NewAppointmentForm defaultDate={date} onCreated={() => setNewDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div className="space-y-1.5">
          <Label>Visão</Label>
          <div className="flex gap-2">
            <Button variant={view === "dia" ? "default" : "outline"} size="sm" onClick={() => setView("dia")}>
              Diária
            </Button>
            <Button variant={view === "semana" ? "default" : "outline"} size="sm" onClick={() => setView("semana")}>
              Semanal
            </Button>
          </div>
        </div>

        {view === "semana" ? (
          <div className="space-y-1.5">
            <Label>Semana</Label>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => setDate(addDaysISO(date, -7))} title="Semana anterior">
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm text-muted-foreground w-40 text-center">
                {new Date(`${weekStart}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                {" – "}
                {new Date(`${weekEnd}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
              </span>
              <Button variant="outline" size="icon" onClick={() => setDate(addDaysISO(date, 7))} title="Próxima semana">
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Profissional</Label>
          <Select value={professionalId} onValueChange={setProfessionalId}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Todos</SelectItem>
              {professionals.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Todos</SelectItem>
              <SelectItem value="aguardando">Aguardando</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
              <SelectItem value="em_atendimento">Em atendimento</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
              <SelectItem value="nao_compareceu">Não compareceu</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : view === "semana" ? (
        <WeekView weekStart={weekStart} appointments={appointments} onStatusChange={handleStatusChange} />
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Horário</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>
                    {formatTime(appointment.starts_at)} – {formatTime(appointment.ends_at)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{appointment.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{appointment.customer_phone}</div>
                  </TableCell>
                  <TableCell>{appointment.service_name}</TableCell>
                  <TableCell>{appointment.professional_name}</TableCell>
                  <TableCell>
                    <AppointmentStatusSelect
                      value={appointment.status}
                      onChange={(newStatus) => handleStatusChange(appointment.id, newStatus)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <RescheduleButton appointment={appointment} />
                  </TableCell>
                </TableRow>
              ))}
              {appointments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum agendamento neste dia.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

const WeekView = ({
  weekStart,
  appointments,
  onStatusChange,
}: {
  weekStart: string;
  appointments: Appointment[];
  onStatusChange: (appointmentId: string, status: AppointmentStatus) => void;
}) => {
  const today = todayLocalDate();
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const day of days) map.set(day, []);
    for (const appointment of appointments) {
      const day = toISODate(new Date(appointment.starts_at));
      map.get(day)?.push(appointment);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, weekStart]);

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-7 gap-2 min-w-[980px]">
        {days.map((day) => {
          const isToday = day === today;
          const dayAppointments = byDay.get(day) ?? [];
          return (
            <div key={day} className="rounded-lg border border-border bg-background flex flex-col">
              <div
                className={`px-2 py-2 text-xs font-medium border-b border-border text-center ${
                  isToday ? "text-primary bg-primary/5" : ""
                }`}
              >
                {new Date(`${day}T00:00:00`).toLocaleDateString("pt-BR", { weekday: "short" })}
                <span className="block text-muted-foreground font-normal">
                  {new Date(`${day}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                </span>
              </div>
              <div className="flex-1 p-1.5 space-y-1.5 min-h-[120px]">
                {dayAppointments.map((appointment) => (
                  <div key={appointment.id} className="rounded border border-border p-1.5 text-[11px] space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono">{formatTime(appointment.starts_at)}</span>
                      <RescheduleButton appointment={appointment} compact />
                    </div>
                    <p className="font-medium truncate" title={appointment.customer_name}>
                      {appointment.customer_name}
                    </p>
                    <p className="text-muted-foreground truncate" title={`${appointment.service_name} · ${appointment.professional_name}`}>
                      {appointment.service_name} · {appointment.professional_name}
                    </p>
                    <AppointmentStatusSelect
                      value={appointment.status}
                      onChange={(newStatus) => onStatusChange(appointment.id, newStatus)}
                      triggerClassName="w-full h-6 text-[10px] px-1.5"
                    />
                  </div>
                ))}
                {dayAppointments.length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-6">—</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RescheduleButton = ({ appointment, compact = false }: { appointment: Appointment; compact?: boolean }) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(() => appointment.starts_at.slice(0, 16));
  const { reschedule } = useAppointmentMutations();

  const handleConfirm = () => {
    if (!value) return;
    reschedule.mutate(
      { id: appointment.id, startsAt: new Date(value).toISOString() },
      {
        onSuccess: () => {
          toast.success("Agendamento remarcado.");
          setOpen(false);
        },
        onError: () => toast.error("Não foi possível remarcar (horário indisponível para este profissional)."),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Remarcar"
          className={compact ? "h-5 w-5" : undefined}
        >
          <CalendarClock size={compact ? 12 : 16} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remarcar agendamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Novo horário</Label>
            <Input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleConfirm} disabled={reschedule.isPending}>
            Confirmar remarcação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const NewAppointmentForm = ({ defaultDate, onCreated }: { defaultDate: string; onCreated: () => void }) => {
  const { data: professionals = [] } = useProfessionals(true);
  const { data: services = [] } = useServices(true);
  const { createAppointment } = useAppointmentMutations();

  const [professionalId, setProfessionalId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  const { data: professionalServiceIds } = useProfessionalServiceIds(professionalId || undefined);
  const availableServices = services.filter((s) => (professionalServiceIds ?? []).includes(s.id));

  const { data: slots = [], isLoading: loadingSlots } = useAvailableSlots(
    professionalId || undefined,
    serviceId || undefined,
    date || undefined
  );

  const handleCreate = () => {
    if (!professionalId || !serviceId || !selectedSlot) {
      toast.error("Escolha profissional, serviço e horário.");
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("Informe nome e telefone do cliente.");
      return;
    }
    createAppointment.mutate(
      {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        professionalId,
        serviceId,
        startsAt: selectedSlot,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success("Agendamento criado.");
          onCreated();
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : "";
          toast.error(
            message.includes("no longer available")
              ? "Esse horário acabou de ficar indisponível — escolha outro."
              : "Falha ao criar agendamento."
          );
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Profissional</Label>
          <Select
            value={professionalId}
            onValueChange={(v) => {
              setProfessionalId(v);
              setServiceId("");
              setSelectedSlot(null);
            }}
          >
            <SelectTrigger><SelectValue placeholder="Escolha..." /></SelectTrigger>
            <SelectContent>
              {professionals.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Serviço</Label>
          <Select
            value={serviceId}
            onValueChange={(v) => {
              setServiceId(v);
              setSelectedSlot(null);
            }}
            disabled={!professionalId}
          >
            <SelectTrigger><SelectValue placeholder="Escolha..." /></SelectTrigger>
            <SelectContent>
              {availableServices.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min)</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Data</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setSelectedSlot(null);
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Horário disponível</Label>
        {!professionalId || !serviceId ? (
          <p className="text-sm text-muted-foreground">Escolha profissional e serviço primeiro.</p>
        ) : loadingSlots ? (
          <p className="text-sm text-muted-foreground">Carregando horários...</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum horário livre nesse dia.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <Button
                key={slot.slot_start}
                type="button"
                size="sm"
                variant={selectedSlot === slot.slot_start ? "default" : "outline"}
                onClick={() => setSelectedSlot(slot.slot_start)}
              >
                {formatTime(slot.slot_start)}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Nome do cliente</Label>
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Telefone</Label>
          <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Observações (opcional)</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <Button className="w-full" onClick={handleCreate} disabled={createAppointment.isPending}>
        {createAppointment.isPending ? "Criando..." : "Criar agendamento"}
      </Button>
    </div>
  );
};

export default AdminAgenda;
