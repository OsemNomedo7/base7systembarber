/* Form de criação/edição de produto */
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, X } from "lucide-react";
import { toast } from "sonner";
import { useProduct } from "@/hooks/useProduct";
import { useProductMutations } from "@/hooks/useProductMutations";
import { useProductStockByProduct, useProductStockMutations } from "@/hooks/useProductStock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import ImageUploader from "@/components/admin/ImageUploader";

/* Chave usada no mapa de estoque para produto sem variação de tamanho */
const NO_SIZE_KEY = "";

const AdminProdutoForm = () => {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { data: existing, isLoading } = useProduct(id);
  const { createProduct, updateProduct } = useProductMutations();
  const { data: existingStock } = useProductStockByProduct(id);
  const { upsertStock } = useProductStockMutations();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [sizesInput, setSizesInput] = useState("");
  const [image, setImage] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [stockQuantities, setStockQuantities] = useState<Record<string, string>>({});
  const [ncm, setNcm] = useState("");
  const [cfop, setCfop] = useState("5102");
  const [unidadeComercial, setUnidadeComercial] = useState("UN");
  const [icmsOrigem, setIcmsOrigem] = useState("0");
  const [icmsSituacaoTributaria, setIcmsSituacaoTributaria] = useState("102");

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
    setNcm(existing.ncm ?? "");
    setCfop(existing.cfop ?? "5102");
    setUnidadeComercial(existing.unidade_comercial ?? "UN");
    setIcmsOrigem(existing.icms_origem ?? "0");
    setIcmsSituacaoTributaria(existing.icms_situacao_tributaria ?? "102");
  }, [existing]);

  useEffect(() => {
    if (!existingStock) return;
    setStockQuantities((prev) => {
      const next = { ...prev };
      for (const row of existingStock) {
        const key = row.size ?? NO_SIZE_KEY;
        if (next[key] === undefined) next[key] = String(row.quantity);
      }
      return next;
    });
  }, [existingStock]);

  const sizesList = sizesInput.trim()
    ? sizesInput.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const stockKeys = sizesList.length > 0 ? sizesList : [NO_SIZE_KEY];

  const updateStockQuantity = (key: string, value: string) =>
    setStockQuantities((prev) => ({ ...prev, [key]: value }));

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
      ncm: ncm.trim() || null,
      cfop: cfop.trim(),
      unidade_comercial: unidadeComercial.trim(),
      icms_origem: icmsOrigem.trim(),
      icms_situacao_tributaria: icmsSituacaoTributaria.trim(),
    };

    const saveStock = (productId: string) => {
      for (const key of stockKeys) {
        const quantity = Math.max(0, Number(stockQuantities[key]) || 0);
        upsertStock.mutate({ productId, size: key === NO_SIZE_KEY ? null : key, quantity });
      }
    };

    const onError = () => toast.error("Falha ao salvar produto.");

    if (isEditing && id) {
      updateProduct.mutate(
        { id, ...payload },
        {
          onSuccess: () => {
            saveStock(id);
            toast.success("Produto atualizado.");
            navigate("/admin/produtos");
          },
          onError,
        }
      );
    } else {
      createProduct.mutate(payload, {
        onSuccess: (data) => {
          saveStock(data.id);
          toast.success("Produto criado.");
          navigate("/admin/produtos");
        },
        onError,
      });
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

        <div className="space-y-2">
          <span className="text-sm font-medium block">Estoque</span>
          <div className="grid grid-cols-2 gap-3">
            {stockKeys.map((key) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`stock-${key}`}>{key === NO_SIZE_KEY ? "Quantidade" : `Tam. ${key}`}</Label>
                <Input
                  id={`stock-${key}`}
                  type="number"
                  min={0}
                  value={stockQuantities[key] ?? ""}
                  onChange={(e) => updateStockQuantity(key, e.target.value)}
                  placeholder="0"
                />
              </div>
            ))}
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

        <div className="space-y-3 rounded-lg border border-border p-4">
          <div>
            <span className="text-sm font-medium block">Dados fiscais (NFC-e)</span>
            <p className="text-xs text-muted-foreground">
              Necessários pra emitir nota fiscal deste produto. Os padrões cobrem venda dentro
              do estado no Simples Nacional - ajuste se não for o seu caso.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ncm">NCM</Label>
              <Input
                id="ncm"
                placeholder="Ex: 61099090"
                value={ncm}
                onChange={(e) => setNcm(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfop">CFOP</Label>
              <Input id="cfop" value={cfop} onChange={(e) => setCfop(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="unidade">Unidade Comercial</Label>
              <Input id="unidade" value={unidadeComercial} onChange={(e) => setUnidadeComercial(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="icms-origem">Origem ICMS</Label>
              <Input id="icms-origem" value={icmsOrigem} onChange={(e) => setIcmsOrigem(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="icms-cst">CST/CSOSN</Label>
              <Input
                id="icms-cst"
                value={icmsSituacaoTributaria}
                onChange={(e) => setIcmsSituacaoTributaria(e.target.value)}
              />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar produto"}
        </Button>
      </form>
    </div>
  );
};

export default AdminProdutoForm;
