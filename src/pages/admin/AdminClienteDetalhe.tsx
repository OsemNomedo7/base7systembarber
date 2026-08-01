/* Detalhe do cliente: dados, endereços, histórico de pedidos e total gasto */
import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCustomer, useCustomerMutations } from "@/hooks/useCustomers";
import { useCustomerAddresses, useCustomerAddressMutations } from "@/hooks/useCustomerAddresses";
import { useOrders } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const AddressForm = ({ customerId, onSaved }: { customerId: string; onSaved: () => void }) => {
  const { createAddress } = useCustomerAddressMutations(customerId);
  const [fields, setFields] = useState({
    label: "",
    zip_code: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });

  const update = (field: string, value: string) => setFields((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAddress.mutate(
      {
        label: fields.label || null,
        zip_code: fields.zip_code || null,
        street: fields.street || null,
        number: fields.number || null,
        complement: fields.complement || null,
        neighborhood: fields.neighborhood || null,
        city: fields.city || null,
        state: fields.state || null,
        is_default: false,
      },
      {
        onSuccess: () => {
          toast.success("Endereço adicionado.");
          onSaved();
        },
        onError: () => toast.error("Falha ao salvar endereço."),
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="addr-label">Identificação (ex: Casa, Trabalho)</Label>
        <Input id="addr-label" value={fields.label} onChange={(e) => update("label", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="addr-zip">CEP</Label>
          <Input id="addr-zip" value={fields.zip_code} onChange={(e) => update("zip_code", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="addr-state">UF</Label>
          <Input id="addr-state" value={fields.state} onChange={(e) => update("state", e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="addr-street">Rua</Label>
        <Input id="addr-street" value={fields.street} onChange={(e) => update("street", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="addr-number">Número</Label>
          <Input id="addr-number" value={fields.number} onChange={(e) => update("number", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="addr-complement">Complemento</Label>
          <Input id="addr-complement" value={fields.complement} onChange={(e) => update("complement", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="addr-neighborhood">Bairro</Label>
          <Input id="addr-neighborhood" value={fields.neighborhood} onChange={(e) => update("neighborhood", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="addr-city">Cidade</Label>
          <Input id="addr-city" value={fields.city} onChange={(e) => update("city", e.target.value)} />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={createAddress.isPending}>
        {createAddress.isPending ? "Salvando..." : "Salvar endereço"}
      </Button>
    </form>
  );
};

const AdminClienteDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(id);
  const { setCustomerActive, deleteCustomer } = useCustomerMutations();
  const { data: addresses = [] } = useCustomerAddresses(id);
  const { deleteAddress } = useCustomerAddressMutations(id ?? "");
  const { data: orders = [], isLoading: ordersLoading } = useOrders({ customerId: id });
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);

  if (isLoading) return <p className="text-muted-foreground text-sm">Carregando...</p>;
  if (!customer) return <p className="text-muted-foreground text-sm">Cliente não encontrado.</p>;

  const totalSpent = orders
    .filter((o) => o.payment_status === "pago")
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="max-w-4xl">
      <Link
        to="/admin/clientes"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} />
        Voltar
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-semibold flex items-center gap-3">
            {customer.name}
            <Badge variant={customer.is_active ? "default" : "secondary"}>
              {customer.is_active ? "Ativo" : "Inativo"}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{customer.phone}</p>
          {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
          {customer.document && <p className="text-sm text-muted-foreground">Doc: {customer.document}</p>}
          {customer.notes && <p className="text-sm text-muted-foreground mt-2 italic">{customer.notes}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/clientes/${customer.id}/editar`}>
              <Pencil size={14} className="mr-2" />
              Editar
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCustomerActive.mutate(
                { id: customer.id, is_active: !customer.is_active },
                {
                  onSuccess: () => toast.success(customer.is_active ? "Cliente inativado." : "Cliente reativado."),
                }
              )
            }
          >
            {customer.is_active ? "Inativar" : "Reativar"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 size={14} className="mr-2" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir cliente definitivamente?</AlertDialogTitle>
                <AlertDialogDescription>
                  O histórico de pedidos deste cliente é mantido (com os dados de nome/telefone da época da
                  compra), mas o cadastro deixa de existir e não poderá mais ser associado a novos pedidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    deleteCustomer.mutate(customer.id, {
                      onSuccess: () => {
                        toast.success("Cliente excluído.");
                        navigate("/admin/clientes");
                      },
                      onError: () => toast.error("Falha ao excluir cliente."),
                    })
                  }
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs text-muted-foreground">Pedidos</p>
          <p className="text-2xl font-serif font-semibold">{orders.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs text-muted-foreground">Total gasto (pago)</p>
          <p className="text-2xl font-serif font-semibold">R$ {totalSpent.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs text-muted-foreground">Endereços cadastrados</p>
          <p className="text-2xl font-serif font-semibold">{addresses.length}</p>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-lg font-semibold">Endereços de entrega</h2>
          <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus size={14} className="mr-2" />
                Adicionar endereço
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo endereço</DialogTitle>
              </DialogHeader>
              {id && <AddressForm customerId={id} onSaved={() => setAddressDialogOpen(false)} />}
            </DialogContent>
          </Dialog>
        </div>
        {addresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {addresses.map((addr) => (
              <div key={addr.id} className="rounded-lg border border-border bg-background p-3 text-sm relative">
                <button
                  onClick={() => deleteAddress.mutate(addr.id)}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                  aria-label="Remover endereço"
                >
                  <Trash2 size={14} />
                </button>
                {addr.label && <p className="font-medium mb-1">{addr.label}</p>}
                <p className="text-muted-foreground">
                  {[addr.street, addr.number].filter(Boolean).join(", ")}
                  {addr.complement ? ` - ${addr.complement}` : ""}
                </p>
                <p className="text-muted-foreground">
                  {[addr.neighborhood, addr.city, addr.state].filter(Boolean).join(" - ")}
                </p>
                {addr.zip_code && <p className="text-muted-foreground">CEP: {addr.zip_code}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-serif text-lg font-semibold mb-3">Histórico de pedidos</h2>
        {ordersLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>#{order.order_number}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs">
                      {order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}
                    </TableCell>
                    <TableCell className="font-medium">R$ {order.total.toFixed(2)}</TableCell>
                    <TableCell className="capitalize">{order.payment_status}</TableCell>
                    <TableCell className="capitalize">{order.status}</TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum pedido registrado para este cliente.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminClienteDetalhe;
