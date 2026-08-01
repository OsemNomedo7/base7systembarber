/* Select de status de pagamento dos pedidos */
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PaymentStatus } from "@/types/db";

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pendente: "Pendente",
  pago: "Pago",
  recusado: "Recusado",
  estornado: "Estornado",
};

interface PaymentStatusSelectProps {
  value: PaymentStatus;
  onChange: (status: PaymentStatus) => void;
}

const PaymentStatusSelect = ({ value, onChange }: PaymentStatusSelectProps) => (
  <Select value={value} onValueChange={(v) => onChange(v as PaymentStatus)}>
    <SelectTrigger className="w-32 h-8 text-xs">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {(Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).map((status) => (
        <SelectItem key={status} value={status}>
          {PAYMENT_STATUS_LABELS[status]}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default PaymentStatusSelect;
