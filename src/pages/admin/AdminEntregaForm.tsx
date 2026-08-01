/* Form de criação/edição de método de entrega + áreas atendidas (só disponível editando,
 * já que uma área precisa de um delivery_method_id existente) */
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useDeliveryMethod,
  useDeliveryMethodMutations,
  useDeliveryMethodAreas,
  useDeliveryMethodAreaMutations,
} from "@/hooks/useDeliveryMethods";
import type { DeliveryMethodType } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const TYPE_OPTIONS: { value: DeliveryMethodType; label: string }[] = [
  { value: "retirada", label: "Retirada na loja" },
  { value: "entrega_propria", label: "Entrega própria" },
  { value: "frete_fixo", label: "Frete fixo" },
  { value: "correios", label: "Correios" },
  { value: "transportadora", label: "Transportadora" },
];

const AreaForm = ({ methodId, onSaved }: { methodId: string; onSaved: () => void }) => {
  const { createArea } = useDeliveryMethodAreaMutations(methodId);
  const [ruleType, setRuleType] = useState<"regiao" | "cep">("regiao");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipStart, setZipStart] = useState("");
  const [zipEnd, setZipEnd] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload =
      ruleType === "regiao"
        ? { city: city || null, state: state.toUpperCase() }
        : { zip_range_start: zipStart.replace(/\D/g, ""), zip_range_end: zipEnd.replace(/\D/g, "") };

    createArea.mutate(payload as never, {
      onSuccess: () => {
        toast.success("Área adicionada.");
        onSaved();
      },
      onError: () => toast.error("Falha ao salvar área. Confira os campos (UF com 2 letras, CEP com 8 dígitos)."),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={ruleType === "regiao" ? "default" : "outline"}
          onClick={() => setRuleType("regiao")}
        >
          Cidade/UF
        </Button>
        <Button
          type="button"
          size="sm"
          variant={ruleType === "cep" ? "default" : "outline"}
          onClick={() => setRuleType("cep")}
        >
          Faixa de CEP
        </Button>
      </div>

      {ruleType === "regiao" ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="area-city">Cidade (opcional)</Label>
            <Input id="area-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Toda a UF se vazio" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="area-state">UF</Label>
            <Input id="area-state" required maxLength={2} value={state} onChange={(e) => setState(e.target.value)} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="area-zip-start">CEP inicial</Label>
            <Input id="area-zip-start" required value={zipStart} onChange={(e) => setZipStart(e.target.value)} placeholder="00000-000" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="area-zip-end">CEP final</Label>
            <Input id="area-zip-end" required value={zipEnd} onChange={(e) => setZipEnd(e.target.value)} placeholder="00000-000" />
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={createArea.isPending}>
        {createArea.isPending ? "Salvando..." : "Adicionar área"}
      </Button>
    </form>
  );
};

const AdminEntregaForm = () => {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { data: existing, isLoading } = useDeliveryMethod(id);
  const { createMethod, updateMethod } = useDeliveryMethodMutations();
  const { data: areas = [] } = useDeliveryMethodAreas(id);
  const { deleteArea } = useDeliveryMethodAreaMutations(id ?? "");
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);

  const [type, setType] = useState<DeliveryMethodType>("entrega_propria");
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [price, setPrice] = useState("0");
  const [minOrderValue, setMinOrderValue] = useState("");
  const [freeAboveValue, setFreeAboveValue] = useState("");
  const [etaMin, setEtaMin] = useState("");
  const [etaMax, setEtaMax] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!existing) return;
    setType(existing.type);
    setName(existing.name);
    setIsActive(existing.is_active);
    setPrice(String(existing.price));
    setMinOrderValue(existing.min_order_value != null ? String(existing.min_order_value) : "");
    setFreeAboveValue(existing.free_above_value != null ? String(existing.free_above_value) : "");
    setEtaMin(existing.estimated_days_min != null ? String(existing.estimated_days_min) : "");
    setEtaMax(existing.estimated_days_max != null ? String(existing.estimated_days_max) : "");
    setNotes(existing.notes ?? "");
  }, [existing]);

  if (isEditing && isLoading) {
    return <p className="text-muted-foreground text-sm">Carregando...</p>;
  }

  const isRetirada = type === "retirada";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      type,
      name,
      is_active: isActive,
      price: isRetirada ? 0 : Number(price) || 0,
      min_order_value: minOrderValue.trim() ? Number(minOrderValue) : null,
      free_above_value: freeAboveValue.trim() ? Number(freeAboveValue) : null,
      estimated_days_min: etaMin.trim() ? Number(etaMin) : null,
      estimated_days_max: etaMax.trim() ? Number(etaMax) : null,
      notes: notes || null,
      sort_order: existing?.sort_order ?? 0,
    };

    const onSuccess = () => {
      toast.success(isEditing ? "Método atualizado." : "Método criado.");
      navigate("/admin/entregas");
    };
    const onError = () => toast.error("Falha ao salvar método de entrega.");

    if (isEditing && id) {
      updateMethod.mutate({ id, ...payload }, { onSuccess, onError });
    } else {
      createMethod.mutate(payload, { onSuccess, onError });
    }
  };

  const saving = createMethod.isPending || updateMethod.isPending;

  return (
    <div className="max-w-2xl">
      <Link
        to="/admin/entregas"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} />
        Voltar
      </Link>

      <h1 className="font-serif text-2xl font-semibold mb-6">
        {isEditing ? "Editar método de entrega" : "Novo método de entrega"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={type} onValueChange={(v) => setType(v as DeliveryMethodType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="price">Valor do frete (R$)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              disabled={isRetirada}
              value={isRetirada ? "0" : price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="free-above">Frete grátis acima de (opcional)</Label>
            <Input
              id="free-above"
              type="number"
              step="0.01"
              min="0"
              disabled={isRetirada}
              value={freeAboveValue}
              onChange={(e) => setFreeAboveValue(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="min-order">Pedido mínimo (opcional)</Label>
            <Input
              id="min-order"
              type="number"
              step="0.01"
              min="0"
              value={minOrderValue}
              onChange={(e) => setMinOrderValue(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eta-min">Prazo mín. (dias)</Label>
            <Input id="eta-min" type="number" min="0" value={etaMin} onChange={(e) => setEtaMin(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eta-max">Prazo máx. (dias)</Label>
            <Input id="eta-max" type="number" min="0" value={etaMax} onChange={(e) => setEtaMax(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Observações (opcional)</Label>
          <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <Label>Método ativo (visível no checkout)</Label>
        </div>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar método"}
        </Button>
      </form>

      {isEditing && id && !isRetirada && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg font-semibold">Áreas atendidas</h2>
            <Dialog open={areaDialogOpen} onOpenChange={setAreaDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus size={14} className="mr-2" />
                  Adicionar área
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova área atendida</DialogTitle>
                </DialogHeader>
                <AreaForm methodId={id} onSaved={() => setAreaDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Sem nenhuma área cadastrada, este método fica disponível para qualquer CEP (nacional).
          </p>
          {areas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma área cadastrada (disponível nacionalmente).</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {areas.map((area) => (
                <div key={area.id} className="rounded-lg border border-border bg-background p-3 text-sm relative">
                  <button
                    onClick={() => deleteArea.mutate(area.id)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                    aria-label="Remover área"
                  >
                    <Trash2 size={14} />
                  </button>
                  {area.state ? (
                    <p>
                      {area.city ? `${area.city} - ` : "Toda a UF "}
                      {area.state}
                    </p>
                  ) : (
                    <p>
                      CEP {area.zip_range_start} a {area.zip_range_end}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminEntregaForm;
