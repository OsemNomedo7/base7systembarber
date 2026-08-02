/* Form de criação/edição de serviço */
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useService } from "@/hooks/useService";
import { useServiceMutations } from "@/hooks/useServiceMutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import ImageUploader from "@/components/admin/ImageUploader";

const AdminServicoForm = () => {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { data: existing, isLoading } = useService(id);
  const { createService, updateService } = useServiceMutations();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setPrice(String(existing.price));
    setDurationMinutes(String(existing.duration_minutes));
    setCategory(existing.category ?? "");
    setDescription(existing.description ?? "");
    setImage(existing.image ?? "");
    setIsActive(existing.is_active);
  }, [existing]);

  if (isEditing && isLoading) {
    return <p className="text-muted-foreground text-sm">Carregando...</p>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name,
      price: Number(price),
      duration_minutes: Math.max(1, Math.round(Number(durationMinutes))),
      category: category.trim() || null,
      description: description.trim() || null,
      image: image || null,
      is_active: isActive,
    };

    const onError = () => toast.error("Falha ao salvar serviço.");

    if (isEditing && id) {
      updateService.mutate(
        { id, ...payload },
        {
          onSuccess: () => {
            toast.success("Serviço atualizado.");
            navigate("/admin/servicos");
          },
          onError,
        }
      );
    } else {
      createService.mutate(payload, {
        onSuccess: () => {
          toast.success("Serviço criado.");
          navigate("/admin/servicos");
        },
        onError,
      });
    }
  };

  const saving = createService.isPending || updateService.isPending;

  return (
    <div className="max-w-2xl">
      <Link
        to="/admin/servicos"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} />
        Voltar
      </Link>

      <h1 className="font-serif text-2xl font-semibold mb-6">
        {isEditing ? "Editar serviço" : "Novo serviço"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="price">Preço (R$)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="duration">Duração (min)</Label>
            <Input
              id="duration"
              type="number"
              step="5"
              min="5"
              required
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">Categoria</Label>
            <Input
              id="category"
              placeholder="Ex: Cabelo, Barba"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <ImageUploader value={image} onChange={setImage} folder="services" label="Imagem" />

        <div className="flex items-center gap-3">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <Label>Serviço ativo (visível pra agendamento)</Label>
        </div>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar serviço"}
        </Button>
      </form>
    </div>
  );
};

export default AdminServicoForm;
