/* Select de status dos pedidos */
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OrderStatus } from "@/types/db";

const STATUS_LABELS: Record<OrderStatus, string> = {
  novo: "Novo",
  contatado: "Contatado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

interface StatusSelectProps {
  value: OrderStatus;
  onChange: (status: OrderStatus) => void;
}

const StatusSelect = ({ value, onChange }: StatusSelectProps) => (
  <Select value={value} onValueChange={(v) => onChange(v as OrderStatus)}>
    <SelectTrigger className="w-36 h-8 text-xs">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((status) => (
        <SelectItem key={status} value={status}>
          {STATUS_LABELS[status]}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default StatusSelect;
