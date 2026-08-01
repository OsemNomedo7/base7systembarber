/* Controle de estoque: quantidade por produto/tamanho, com ajuste manual */
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useAllProductStock, useProductStockMutations } from "@/hooks/useProductStock";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const StockQuantityCell = ({ id, quantity }: { id: string; quantity: number }) => {
  const [value, setValue] = useState(String(quantity));
  const { setQuantity } = useProductStockMutations();

  const commit = () => {
    const parsed = Math.max(0, Number(value) || 0);
    setValue(String(parsed));
    if (parsed !== quantity) {
      setQuantity.mutate({ id, quantity: parsed });
    }
  };

  return (
    <Input
      type="number"
      min={0}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      className="w-24 h-8"
    />
  );
};

const AdminEstoque = () => {
  const { data: rows = [], isLoading } = useAllProductStock();

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold mb-6">Estoque</h1>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const low = row.quantity <= row.low_stock_threshold;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.product_name}</TableCell>
                    <TableCell className="text-muted-foreground">{row.product_category}</TableCell>
                    <TableCell>{row.size ?? "Único"}</TableCell>
                    <TableCell>
                      <StockQuantityCell id={row.id} quantity={row.quantity} />
                    </TableCell>
                    <TableCell>
                      {low ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle size={12} />
                          Estoque baixo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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

export default AdminEstoque;
