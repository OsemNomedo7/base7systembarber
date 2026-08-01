/* Listagem dos métodos de entrega configurados (Configurações → Entregas) */
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useDeliveryMethods, useDeliveryMethodMutations } from "@/hooks/useDeliveryMethods";
import type { DeliveryMethodType } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const TYPE_LABELS: Record<DeliveryMethodType, string> = {
  retirada: "Retirada na loja",
  entrega_propria: "Entrega própria",
  frete_fixo: "Frete fixo",
  correios: "Correios",
  transportadora: "Transportadora",
};

const formatEta = (min: number | null, max: number | null) => {
  if (min == null && max == null) return "—";
  if (min != null && max != null) return min === max ? `${min} dia(s)` : `${min} a ${max} dias`;
  return `${min ?? max} dia(s)`;
};

const AdminEntregas = () => {
  const { data: methods = [], isLoading } = useDeliveryMethods();
  const { setMethodActive, deleteMethod } = useDeliveryMethodMutations();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-semibold">Entregas</h1>
        <Button asChild>
          <Link to="/admin/entregas/novo">
            <Plus size={16} className="mr-2" />
            Novo método
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {methods.map((method) => (
                <TableRow key={method.id}>
                  <TableCell className="font-medium">{method.name}</TableCell>
                  <TableCell className="text-muted-foreground">{TYPE_LABELS[method.type]}</TableCell>
                  <TableCell>{method.price === 0 ? "Grátis" : `R$ ${method.price.toFixed(2)}`}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatEta(method.estimated_days_min, method.estimated_days_max)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={method.is_active ? "default" : "secondary"}>
                      {method.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/admin/entregas/${method.id}/editar`}>Editar</Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setMethodActive.mutate({ id: method.id, is_active: !method.is_active })
                        }
                      >
                        {method.is_active ? "Inativar" : "Ativar"}
                      </Button>
                      {method.type !== "retirada" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Excluir o método "${method.name}"?`)) {
                              deleteMethod.mutate(method.id, {
                                onError: () => toast.error("Falha ao excluir método."),
                              });
                            }
                          }}
                        >
                          Excluir
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {methods.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum método de entrega cadastrado.
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

export default AdminEntregas;
