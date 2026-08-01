/* Histórico de Vendas: listagem de pedidos recebidos via checkout, com filtros */
import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useOrders, useUpdateOrderStatus, useUpdateOrderPaymentStatus, type OrderFilters } from "@/hooks/useOrders";
import { useEmitNfce, useCancelNfce } from "@/hooks/useFocusNfe";
import type { Order } from "@/types/db";
import StatusSelect from "@/components/admin/StatusSelect";
import PaymentStatusSelect from "@/components/admin/PaymentStatusSelect";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const ANY = "todos";
const CANCEL_WINDOW_MS = 30 * 60 * 1000;

/* Ações de NFC-e por pedido: emitir, ver DANFE, cancelar (só até 30 min após
 * a emissão - a própria SEFAZ não aceita cancelar depois disso). Emissão é
 * sempre manual, nunca automática, dado o peso fiscal/legal de uma nota. */
const NotaFiscalCell = ({ order }: { order: Order }) => {
  const emitNfce = useEmitNfce();
  const cancelNfce = useCancelNfce();
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [justificativa, setJustificativa] = useState("");

  const withinCancelWindow =
    !!order.nfce_emitted_at && Date.now() - new Date(order.nfce_emitted_at).getTime() < CANCEL_WINDOW_MS;

  const handleEmit = () => {
    emitNfce.mutate(order.id, {
      onSuccess: (data) => {
        if (data.status === "autorizado") toast.success("NFC-e autorizada!");
        else toast.error(data.mensagem_sefaz ?? "Falha ao autorizar a NFC-e.");
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Falha ao emitir NFC-e.");
      },
    });
  };

  const handleCancel = () => {
    if (justificativa.trim().length < 15) {
      toast.error("A justificativa precisa ter pelo menos 15 caracteres.");
      return;
    }
    cancelNfce.mutate(
      { order_id: order.id, justificativa },
      {
        onSuccess: () => {
          toast.success("NFC-e cancelada.");
          setShowCancelForm(false);
          setJustificativa("");
        },
        onError: (err: unknown) => {
          toast.error(err instanceof Error ? err.message : "Falha ao cancelar NFC-e.");
        },
      }
    );
  };

  if (order.nfce_status === "autorizado") {
    return (
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-green-600 font-medium">Autorizada</span>
          {order.nfce_danfe_url && (
            <a href={order.nfce_danfe_url} target="_blank" rel="noreferrer" className="underline text-primary">
              DANFE
            </a>
          )}
        </div>
        {withinCancelWindow &&
          (showCancelForm ? (
            <div className="space-y-1.5 w-48">
              <Textarea
                rows={2}
                placeholder="Justificativa (mín. 15 caracteres)"
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                className="text-xs"
              />
              <div className="flex gap-1">
                <Button size="sm" variant="destructive" disabled={cancelNfce.isPending} onClick={handleCancel}>
                  {cancelNfce.isPending ? <Loader2 size={12} className="animate-spin" /> : "Confirmar"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCancelForm(false)}>
                  Voltar
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCancelForm(true)}
              className="text-destructive/70 hover:text-destructive underline"
            >
              Cancelar
            </button>
          ))}
      </div>
    );
  }

  if (order.nfce_status === "cancelado") {
    return <span className="text-xs text-muted-foreground">Cancelada</span>;
  }

  return (
    <div className="space-y-1 text-xs">
      {order.nfce_status === "erro" && order.nfce_mensagem_sefaz && (
        <p className="text-destructive max-w-[180px]">{order.nfce_mensagem_sefaz}</p>
      )}
      <Button size="sm" variant="outline" disabled={emitNfce.isPending} onClick={handleEmit}>
        {emitNfce.isPending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : order.nfce_status === "erro" ? (
          "Tentar de novo"
        ) : (
          "Emitir NFC-e"
        )}
      </Button>
    </div>
  );
};

const AdminPedidos = () => {
  const [filters, setFilters] = useState<OrderFilters>({});
  const [search, setSearch] = useState("");

  const { data: orders = [], isLoading } = useOrders({ ...filters, search });
  const updateStatus = useUpdateOrderStatus();
  const updatePaymentStatus = useUpdateOrderPaymentStatus();

  const updateFilter = <K extends keyof OrderFilters>(key: K, value: OrderFilters[K] | typeof ANY) =>
    setFilters((prev) => ({ ...prev, [key]: value === ANY ? undefined : value }));

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold mb-6">Pedidos</h1>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative w-56">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nº do pedido, nome ou telefone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Input
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(e) => updateFilter("dateFrom", e.target.value || undefined)}
          className="h-9 w-40"
        />
        <span className="text-muted-foreground text-sm">até</span>
        <Input
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(e) => updateFilter("dateTo", e.target.value || undefined)}
          className="h-9 w-40"
        />

        <Select value={filters.status ?? ANY} onValueChange={(v) => updateFilter("status", v as OrderFilters["status"])}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Status: todos</SelectItem>
            <SelectItem value="novo">Novo</SelectItem>
            <SelectItem value="contatado">Contatado</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.paymentStatus ?? ANY}
          onValueChange={(v) => updateFilter("paymentStatus", v as OrderFilters["paymentStatus"])}
        >
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Pagamento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Pagamento: todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="recusado">Recusado</SelectItem>
            <SelectItem value="estornado">Estornado</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.paymentMethod ?? ANY}
          onValueChange={(v) => updateFilter("paymentMethod", v as OrderFilters["paymentMethod"])}
        >
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Forma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Forma: todas</SelectItem>
            <SelectItem value="pix">Pix</SelectItem>
            <SelectItem value="credito">Crédito</SelectItem>
            <SelectItem value="debito">Débito</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.deliveryType ?? ANY}
          onValueChange={(v) => updateFilter("deliveryType", v as OrderFilters["deliveryType"])}
        >
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Recebimento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Recebimento: todos</SelectItem>
            <SelectItem value="entrega">Entrega</SelectItem>
            <SelectItem value="retirada">Retirada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Frete</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status pagamento</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Nota Fiscal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">#{order.order_number}</TableCell>
                  <TableCell>
                    <p className="font-medium">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs">
                    {order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {order.discount_amount > 0 ? `R$ ${order.discount_amount.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {order.shipping_fee > 0 ? `R$ ${order.shipping_fee.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell className="font-medium">R$ {order.total.toFixed(2)}</TableCell>
                  <TableCell className="max-w-xs">
                    <p className="capitalize">{order.delivery_type}</p>
                    {order.shipping_label && (
                      <p className="text-xs text-muted-foreground">
                        {order.shipping_label}
                        {order.shipping_eta ? ` · ${order.shipping_eta}` : ""}
                      </p>
                    )}
                    {order.address && (
                      <p className="text-xs text-muted-foreground whitespace-normal break-words">
                        {order.address}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">
                    {order.payment_method}
                    {order.payment_method === "credito" && order.card_last_four && (
                      <p className="text-xs text-muted-foreground normal-case">
                        {order.card_brand ? `${order.card_brand} ` : ""}
                        •••• {order.card_last_four}
                        {order.card_installments ? ` · ${order.card_installments}x` : ""}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <PaymentStatusSelect
                      value={order.payment_status}
                      onChange={(paymentStatus) => updatePaymentStatus.mutate({ id: order.id, paymentStatus })}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <StatusSelect
                      value={order.status}
                      onChange={(status) => updateStatus.mutate({ id: order.id, status })}
                    />
                  </TableCell>
                  <TableCell>
                    <NotaFiscalCell order={order} />
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                    Nenhum pedido encontrado para os filtros selecionados.
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

export default AdminPedidos;
