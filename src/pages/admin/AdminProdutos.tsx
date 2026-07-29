/* Listagem de produtos no admin - criar/editar/ativar/excluir */
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useProducts } from "@/hooks/useProducts";
import { useProductMutations } from "@/hooks/useProductMutations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const AdminProdutos = () => {
  const { data: products = [], isLoading } = useProducts(false);
  const { updateProduct, deleteProduct } = useProductMutations();

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Excluir "${name}" permanentemente?`)) return;
    deleteProduct.mutate(id, {
      onSuccess: () => toast.success("Produto excluído."),
      onError: () => toast.error("Falha ao excluir produto."),
    });
  };

  const handleToggleActive = (id: string, is_active: boolean) => {
    updateProduct.mutate(
      { id, is_active },
      { onError: () => toast.error("Falha ao atualizar produto.") }
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-semibold">Produtos</h1>
        <Button asChild className="gap-2">
          <Link to="/admin/produtos/novo">
            <Plus size={16} />
            Novo produto
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
                <TableHead>Preço</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <img src={product.image} alt="" className="w-10 h-10 rounded-md object-cover" />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{product.category}</Badge>
                  </TableCell>
                  <TableCell>R$ {product.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={product.is_active}
                      onCheckedChange={(checked) => handleToggleActive(product.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="icon">
                      <Link to={`/admin/produtos/${product.id}/editar`}>
                        <Pencil size={16} />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id, product.name)}>
                      <Trash2 size={16} className="text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum produto cadastrado ainda.
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

export default AdminProdutos;
