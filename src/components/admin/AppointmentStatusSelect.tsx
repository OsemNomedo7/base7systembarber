/* Select de status dos agendamentos */
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AppointmentStatus } from "@/types/barber";

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  aguardando: "Aguardando",
  confirmado: "Confirmado",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
  nao_compareceu: "Não compareceu",
};

interface AppointmentStatusSelectProps {
  value: AppointmentStatus;
  onChange: (status: AppointmentStatus) => void;
  triggerClassName?: string;
}

const AppointmentStatusSelect = ({ value, onChange, triggerClassName = "w-40 h-8 text-xs" }: AppointmentStatusSelectProps) => (
  <Select value={value} onValueChange={(v) => onChange(v as AppointmentStatus)}>
    <SelectTrigger className={triggerClassName}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {(Object.keys(STATUS_LABELS) as AppointmentStatus[]).map((status) => (
        <SelectItem key={status} value={status}>
          {STATUS_LABELS[status]}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default AppointmentStatusSelect;
