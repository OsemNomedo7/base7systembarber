/* Form de criação/edição manual de cliente */
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useCustomer, useCustomerMutations } from "@/hooks/useCustomers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const AdminClienteForm = () => {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { data: existing, isLoading } = useCustomer(id);
  const { createCustomer, updateCustomer } = useCustomerMutations();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setPhone(existing.phone);
    setEmail(existing.email ?? "");
    setDocument(existing.document ?? "");
    setNotes(existing.notes ?? "");
    setIsActive(existing.is_active);
  }, [existing]);

  if (isEditing && isLoading) {
    return <p className="text-muted-foreground text-sm">Carregando...</p>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name,
      phone,
      email: email || null,
      document: document || null,
      notes: notes || null,
      is_active: isActive,
    };

    const onSuccess = () => {
      toast.success(isEditing ? "Cliente atualizado." : "Cliente cadastrado.");
      navigate(isEditing ? `/admin/clientes/${id}` : "/admin/clientes");
    };
    const onError = () => toast.error("Falha ao salvar cliente. Verifique se o telefone já não está cadastrado.");

    if (isEditing && id) {
      updateCustomer.mutate({ id, ...payload }, { onSuccess, onError });
    } else {
      createCustomer.mutate(payload, { onSuccess, onError });
    }
  };

  const saving = createCustomer.isPending || updateCustomer.isPending;

  return (
    <div className="max-w-2xl">
      <Link
        to="/admin/clientes"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} />
        Voltar
      </Link>

      <h1 className="font-serif text-2xl font-semibold mb-6">
        {isEditing ? "Editar cliente" : "Novo cliente"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail (opcional)</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="document">CPF/CNPJ (opcional)</Label>
          <Input id="document" value={document} onChange={(e) => setDocument(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Observações (opcional)</Label>
          <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <Label>Cliente ativo</Label>
        </div>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar cliente"}
        </Button>
      </form>
    </div>
  );
};

export default AdminClienteForm;
