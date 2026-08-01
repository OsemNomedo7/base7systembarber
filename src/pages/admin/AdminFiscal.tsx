/* Configurações → Fiscal: credenciais Focus NFe do lojista (modelo direto,
 * igual ao Mercado Pago - o lojista cria a própria conta no Focus NFe, com
 * CNPJ e certificado digital A1 já cadastrados lá, e cola o token aqui). */
import { useState } from "react";
import { FileText, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useFocusNfeStatus, useSaveFocusNfeCredentials } from "@/hooks/useFocusNfe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const AdminFiscal = () => {
  const { data: status, isLoading } = useFocusNfeStatus();
  const saveCredentials = useSaveFocusNfeCredentials();

  const [apiToken, setApiToken] = useState("");
  const [ambiente, setAmbiente] = useState<"homologacao" | "producao">("homologacao");
  const [cnpjEmitente, setCnpjEmitente] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveCredentials.mutate(
      { api_token: apiToken, ambiente, cnpj_emitente: cnpjEmitente },
      {
        onSuccess: () => {
          toast.success("Credenciais salvas com sucesso!");
          setApiToken("");
          setCnpjEmitente("");
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : "Falha ao salvar credenciais.";
          toast.error(message);
        },
      }
    );
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-serif text-2xl font-semibold">Fiscal</h1>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <FileText size={18} className="text-primary" />
          <CardTitle className="text-base font-medium">Focus NFe (NFC-e)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : status?.is_connected ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-600" />
              <span className="font-medium">Conectado</span>
              <span className="text-sm text-muted-foreground capitalize">({status.ambiente})</span>
              {status.connected_at && (
                <span className="text-sm text-muted-foreground">
                  desde {new Date(status.connected_at).toLocaleString("pt-BR")}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <XCircle size={18} />
              <span>Nenhuma conta Focus NFe conectada ainda.</span>
            </div>
          )}

          <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
            <p className="font-medium">Como configurar:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>
                Crie uma conta em <span className="font-mono text-xs">focusnfe.com.br</span>, cadastre a
                empresa (CNPJ) e envie o certificado digital A1 no painel deles.
              </li>
              <li>Copie o <strong>token de acesso</strong> gerado lá.</li>
              <li>
                Escolha o ambiente: <strong>Homologação</strong> pra testar (notas sem validade fiscal) ou{" "}
                <strong>Produção</strong> pra emitir de verdade.
              </li>
            </ol>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="api-token">Token de API</Label>
              <Input
                id="api-token"
                type="password"
                required
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ambiente">Ambiente</Label>
              <select
                id="ambiente"
                value={ambiente}
                onChange={(e) => setAmbiente(e.target.value as "homologacao" | "producao")}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="homologacao">Homologação (teste, sem validade fiscal)</option>
                <option value="producao">Produção</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cnpj-emitente">CNPJ do emitente</Label>
              <Input
                id="cnpj-emitente"
                required
                placeholder="00.000.000/0000-00"
                value={cnpjEmitente}
                onChange={(e) => setCnpjEmitente(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={saveCredentials.isPending} className="w-full">
              {saveCredentials.isPending ? "Validando e salvando..." : "Salvar credenciais"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFiscal;
