/* Login do admin - único usuário, sem cadastro público */
import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const AdminLogin = () => {
  const { session, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (session && !session.user.is_anonymous) {
    const from = (location.state as { from?: Location })?.from?.pathname || "/admin";
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast.error("Não foi possível entrar. Confira e-mail e senha.");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 section-rose">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="items-center text-center">
          <img src="/imagem/logo-base7web.png" alt="BASE7WEB System Moda" className="w-full max-w-[280px] h-auto mb-2" />
          <CardTitle className="font-serif">Admin — BASE7WEB System Moda</CardTitle>
          <CardDescription>Entre para gerenciar o site.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default AdminLogin;
