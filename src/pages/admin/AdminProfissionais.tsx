/* Listagem de profissionais no admin - criar/editar/ativar/excluir */
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useProfessionals } from "@/hooks/useProfessionals";
import { useProfessionalMutations } from "@/hooks/useProfessionalMutations";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const AdminProfissionais = () => {
  const { data: professionals = [], isLoading } = useProfessionals(false);
  const { updateProfessional, deleteProfessional } = useProfessionalMutations();

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Excluir "${name}" permanentemente? Isso falha se ele tiver agendamentos.`)) return;
    deleteProfessional.mutate(id, {
      onSuccess: () => toast.success("Profissional excluído."),
      onError: () => toast.error("Falha ao excluir — desative-o em vez de excluir se ele já teve agendamentos."),
    });
  };

  const handleToggleActive = (id: string, is_active: boolean) => {
    updateProfessional.mutate({ id, is_active }, { onError: () => toast.error("Falha ao atualizar profissional.") });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-semibold">Profissionais</h1>
        <Button asChild className="gap-2">
          <Link to="/admin/profissionais/novo">
            <Plus size={16} />
            Novo profissional
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
                <TableHead>Telefone</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {professionals.map((professional) => (
                <TableRow key={professional.id}>
                  <TableCell>
                    {professional.photo ? (
                      <img src={professional.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{professional.name}</TableCell>
                  <TableCell>{professional.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={professional.is_active}
                      onCheckedChange={(checked) => handleToggleActive(professional.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="icon">
                      <Link to={`/admin/profissionais/${professional.id}/editar`}>
                        <Pencil size={16} />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(professional.id, professional.name)}
                    >
                      <Trash2 size={16} className="text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {professionals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum profissional cadastrado ainda.
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

export default AdminProfissionais;
