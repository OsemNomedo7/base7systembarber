/* Listagem de serviços no admin - criar/editar/ativar/excluir */
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServices } from "@/hooks/useServices";
import { useServiceMutations } from "@/hooks/useServiceMutations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const AdminServicos = () => {
  const { data: services = [], isLoading } = useServices(false);
  const { updateService, deleteService } = useServiceMutations();

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Excluir "${name}" permanentemente?`)) return;
    deleteService.mutate(id, {
      onSuccess: () => toast.success("Serviço excluído."),
      onError: () => toast.error("Falha ao excluir serviço."),
    });
  };

  const handleToggleActive = (id: string, is_active: boolean) => {
    updateService.mutate({ id, is_active }, { onError: () => toast.error("Falha ao atualizar serviço.") });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-semibold">Serviços</h1>
        <Button asChild className="gap-2">
          <Link to="/admin/servicos/novo">
            <Plus size={16} />
            Novo serviço
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
                <TableHead></TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>
                    {service.image ? (
                      <img src={service.image} alt="" className="w-10 h-10 rounded-md object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-muted" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>
                    {service.category ? <Badge variant="secondary">{service.category}</Badge> : null}
                  </TableCell>
                  <TableCell>{service.duration_minutes} min</TableCell>
                  <TableCell>R$ {service.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={service.is_active}
                      onCheckedChange={(checked) => handleToggleActive(service.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="icon">
                      <Link to={`/admin/servicos/${service.id}/editar`}>
                        <Pencil size={16} />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(service.id, service.name)}>
                      <Trash2 size={16} className="text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {services.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum serviço cadastrado ainda.
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

export default AdminServicos;
