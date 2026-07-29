/* Listagem de pedidos da loja recebidos via checkout */
import { useOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import StatusSelect from "@/components/admin/StatusSelect";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const AdminPedidos = () => {
  const { data: orders = [], isLoading } = useOrders();
  const updateStatus = useUpdateOrderStatus();

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold mb-6">Pedidos</h1>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <p className="font-medium">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs">
                    {order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}
                  </TableCell>
                  <TableCell className="font-medium">R$ {order.total.toFixed(2)}</TableCell>
                  <TableCell className="capitalize">{order.delivery_type}</TableCell>
                  <TableCell className="capitalize">{order.payment_method}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <StatusSelect
                      value={order.status}
                      onChange={(status) => updateStatus.mutate({ id: order.id, status })}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum pedido recebido ainda.
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
