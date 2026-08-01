/* Configurações → Pagamentos: credenciais Mercado Pago do lojista (modelo direto,
 * sem OAuth - cada lojista cria sua própria aplicação e cola Access Token/Public
 * Key aqui). O token nunca aparece de volta na tela depois de salvo. */
import { useState } from "react";
import { Wallet, CheckCircle2, XCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  useMercadoPagoStatus,
  useSaveMercadoPagoCredentials,
  getMercadoPagoWebhookUrl,
} from "@/hooks/useMercadoPago";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const AdminPagamentos = () => {
  const { data: status, isLoading } = useMercadoPagoStatus();
  const saveCredentials = useSaveMercadoPagoCredentials();
  const webhookUrl = getMercadoPagoWebhookUrl();

  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  const copyWebhookUrl = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    toast.success("URL copiada!");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveCredentials.mutate(
      { access_token: accessToken, public_key: publicKey, webhook_secret: webhookSecret },
      {
        onSuccess: () => {
          toast.success("Credenciais salvas com sucesso!");
          setAccessToken("");
          setPublicKey("");
          setWebhookSecret("");
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
      <h1 className="font-serif text-2xl font-semibold">Pagamentos</h1>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Wallet size={18} className="text-primary" />
          <CardTitle className="text-base font-medium">Mercado Pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : status?.is_connected ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-600" />
              <span className="font-medium">Conectado</span>
              {status.connected_at && (
                <span className="text-sm text-muted-foreground">
                  desde {new Date(status.connected_at).toLocaleString("pt-BR")}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <XCircle size={18} />
              <span>Nenhuma conta Mercado Pago conectada ainda.</span>
            </div>
          )}

          <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
            <p className="font-medium">Como configurar:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>
                Acesse{" "}
                <span className="font-mono text-xs">suas.integracoes.mercadopago.com.br</span>, crie (ou
                use) sua própria aplicação e copie o <strong>Access Token</strong> e a{" "}
                <strong>Public Key</strong> de produção.
              </li>
              <li>
                Em "Webhooks → Configurar notificações", cadastre a URL abaixo e copie a{" "}
                <strong>chave secreta</strong> gerada.
              </li>
              <li>Cole os três valores no formulário e salve.</li>
            </ol>
            <div className="flex items-center gap-2 pt-1">
              <code className="flex-1 text-xs bg-background rounded px-2 py-1.5 truncate">{webhookUrl}</code>
              <Button type="button" variant="outline" size="sm" onClick={copyWebhookUrl}>
                <Copy size={14} />
              </Button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="access-token">Access Token</Label>
              <Input
                id="access-token"
                type="password"
                required
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="APP_USR-..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="public-key">Public Key</Label>
              <Input
                id="public-key"
                required
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="APP_USR-..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="webhook-secret">Chave secreta do webhook</Label>
              <Input
                id="webhook-secret"
                type="password"
                required
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
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

export default AdminPagamentos;
