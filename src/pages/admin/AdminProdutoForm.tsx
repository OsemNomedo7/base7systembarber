/* Form de criação/edição de produto */
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, X } from "lucide-react";
import { toast } from "sonner";
import { useProduct } from "@/hooks/useProduct";
import { useProductMutations } from "@/hooks/useProductMutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import ImageUploader from "@/components/admin/ImageUploader";

const AdminProdutoForm = () => {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { data: existing, isLoading } = useProduct(id);
  const { createProduct, updateProduct } = useProductMutations();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [sizesInput, setSizesInput] = useState("");
  const [image, setImage] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setPrice(String(existing.price));
    setCategory(existing.category);
    setDescription(existing.description ?? "");
    setSizesInput((existing.sizes ?? []).join(", "));
    setImage(existing.image);
    setGallery(existing.images ?? []);
    setIsActive(existing.is_active ?? true);
  }, [existing]);

  if (isEditing && isLoading) {
    return <p className="text-muted-foreground text-sm">Carregando...</p>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!image) {
      toast.error("Envie a imagem principal do produto.");
      return;
    }

    const payload = {
      name,
      price: Number(price),
      category,
      description: description || undefined,
      sizes: sizesInput.trim() ? sizesInput.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      image,
      images: gallery.length > 0 ? gallery : [image],
      is_active: isActive,
    };

    const onSuccess = () => {
      toast.success(isEditing ? "Produto atualizado." : "Produto criado.");
      navigate("/admin/produtos");
    };
    const onError = () => toast.error("Falha ao salvar produto.");

    if (isEditing && id) {
      updateProduct.mutate({ id, ...payload }, { onSuccess, onError });
    } else {
      createProduct.mutate(payload, { onSuccess, onError });
    }
  };

  const saving = createProduct.isPending || updateProduct.isPending;

  return (
    <div className="max-w-2xl">
      <Link
        to="/admin/produtos"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} />
        Voltar
      </Link>

      <h1 className="font-serif text-2xl font-semibold mb-6">
        {isEditing ? "Editar produto" : "Novo produto"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
            <Label htmlFor="category">Categoria</Label>
            <Input id="category" required value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sizes">Tamanhos (separados por vírgula, opcional)</Label>
          <Input
            id="sizes"
            placeholder="P, M, G, GG"
            value={sizesInput}
            onChange={(e) => setSizesInput(e.target.value)}
          />
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

        <ImageUploader value={image} onChange={setImage} folder="products" label="Imagem principal" />

        <div className="space-y-2">
          <span className="text-sm font-medium block">Galeria (opcional)</span>
          <div className="flex flex-wrap gap-3">
            {gallery.map((url, i) => (
              <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setGallery((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/90 flex items-center justify-center hover:bg-background"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <ImageUploader
              value=""
              onChange={(url) => setGallery((prev) => [...prev, url])}
              folder="products"
              label=""
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <Label>Produto ativo (visível na loja)</Label>
        </div>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar produto"}
        </Button>
      </form>
    </div>
  );
};

export default AdminProdutoForm;
