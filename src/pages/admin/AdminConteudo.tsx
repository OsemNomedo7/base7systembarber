/* Edição do conteúdo institucional do site (hero da Home, seção institucional, página Sobre) */
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSiteContent, useUpdateSiteContent } from "@/hooks/useSiteContent";
import type { HomeHeroSlide, HomeInstitutional, SobrePageContent } from "@/types/content";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ImageUploader from "@/components/admin/ImageUploader";

const EMPTY_SLIDE: HomeHeroSlide = {
  image: "",
  subtitle: "",
  title: "",
  highlight: "",
  description: "",
  ctaLabel: "",
  ctaLink: "/loja",
  ctaSecondaryLabel: "",
  ctaSecondaryLink: "",
};

const HeroSlidesTab = () => {
  const { data } = useSiteContent<HomeHeroSlide[]>("home_hero_slides");
  const update = useUpdateSiteContent<HomeHeroSlide[]>("home_hero_slides");
  const [slides, setSlides] = useState<HomeHeroSlide[]>([]);

  useEffect(() => {
    if (data) setSlides(data);
  }, [data]);

  const updateSlide = (index: number, patch: Partial<HomeHeroSlide>) => {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const handleSave = () => {
    update.mutate(slides, {
      onSuccess: () => toast.success("Hero da Home atualizado."),
      onError: () => toast.error("Falha ao salvar."),
    });
  };

  return (
    <div className="space-y-6">
      {slides.map((slide, i) => (
        <div key={i} className="rounded-lg border border-border p-5 space-y-4 relative">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Slide {i + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSlides((prev) => prev.filter((_, idx) => idx !== i))}
            >
              <Trash2 size={16} className="text-destructive" />
            </Button>
          </div>

          <ImageUploader
            value={slide.image}
            onChange={(url) => updateSlide(i, { image: url })}
            folder="content"
            label="Imagem de fundo"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Subtítulo</Label>
              <Input value={slide.subtitle} onChange={(e) => updateSlide(i, { subtitle: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Destaque (cor dourada)</Label>
              <Input value={slide.highlight} onChange={(e) => updateSlide(i, { highlight: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={slide.title} onChange={(e) => updateSlide(i, { title: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              rows={2}
              value={slide.description}
              onChange={(e) => updateSlide(i, { description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Texto botão principal</Label>
              <Input value={slide.ctaLabel} onChange={(e) => updateSlide(i, { ctaLabel: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Link botão principal</Label>
              <Input value={slide.ctaLink} onChange={(e) => updateSlide(i, { ctaLink: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Texto botão secundário (opcional)</Label>
              <Input
                value={slide.ctaSecondaryLabel ?? ""}
                onChange={(e) => updateSlide(i, { ctaSecondaryLabel: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Link botão secundário (opcional)</Label>
              <Input
                value={slide.ctaSecondaryLink ?? ""}
                onChange={(e) => updateSlide(i, { ctaSecondaryLink: e.target.value })}
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        className="gap-2"
        onClick={() => setSlides((prev) => [...prev, { ...EMPTY_SLIDE }])}
      >
        <Plus size={16} />
        Adicionar slide
      </Button>

      <Button onClick={handleSave} disabled={update.isPending} className="w-full">
        {update.isPending ? "Salvando..." : "Salvar hero da Home"}
      </Button>
    </div>
  );
};

const InstitutionalTab = () => {
  const { data } = useSiteContent<HomeInstitutional>("home_institutional");
  const update = useUpdateSiteContent<HomeInstitutional>("home_institutional");
  const [form, setForm] = useState<HomeInstitutional>({ title: "", highlight: "", description: "" });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const handleSave = () => {
    update.mutate(form, {
      onSuccess: () => toast.success("Seção institucional atualizada."),
      onError: () => toast.error("Falha ao salvar."),
    });
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div className="space-y-1.5">
        <Label>Título</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Destaque (cor rosa)</Label>
        <Input value={form.highlight} onChange={(e) => setForm({ ...form, highlight: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Textarea
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <Button onClick={handleSave} disabled={update.isPending} className="w-full">
        {update.isPending ? "Salvando..." : "Salvar seção institucional"}
      </Button>
    </div>
  );
};

const SobreTab = () => {
  const { data } = useSiteContent<SobrePageContent>("sobre_page");
  const update = useUpdateSiteContent<SobrePageContent>("sobre_page");
  const [form, setForm] = useState<SobrePageContent | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (!form) return <p className="text-muted-foreground text-sm">Carregando...</p>;

  const handleSave = () => {
    update.mutate(form, {
      onSuccess: () => toast.success("Página Sobre atualizada."),
      onError: () => toast.error("Falha ao salvar."),
    });
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Título do topo</Label>
          <Input value={form.heroTitle} onChange={(e) => setForm({ ...form, heroTitle: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Destaque do topo</Label>
          <Input
            value={form.heroHighlight}
            onChange={(e) => setForm({ ...form, heroHighlight: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Título da história</Label>
          <Input
            value={form.historiaTitle}
            onChange={(e) => setForm({ ...form, historiaTitle: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Destaque da história</Label>
          <Input
            value={form.historiaHighlight}
            onChange={(e) => setForm({ ...form, historiaHighlight: e.target.value })}
          />
        </div>
      </div>

      {form.paragraphs.map((paragraph, i) => (
        <div key={i} className="space-y-1.5">
          <Label>Parágrafo {i + 1}</Label>
          <Textarea
            rows={3}
            value={paragraph}
            onChange={(e) => {
              const paragraphs = [...form.paragraphs];
              paragraphs[i] = e.target.value;
              setForm({ ...form, paragraphs });
            }}
          />
        </div>
      ))}

      <div className="space-y-1.5">
        <Label>Missão</Label>
        <Textarea rows={2} value={form.missao} onChange={(e) => setForm({ ...form, missao: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Visão</Label>
        <Textarea rows={2} value={form.visao} onChange={(e) => setForm({ ...form, visao: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Valores</Label>
        <Textarea rows={2} value={form.valores} onChange={(e) => setForm({ ...form, valores: e.target.value })} />
      </div>

      <Button onClick={handleSave} disabled={update.isPending} className="w-full">
        {update.isPending ? "Salvando..." : "Salvar página Sobre"}
      </Button>
    </div>
  );
};

const WHATSAPP_REGEX = /^\d{10,15}$/;

const WhatsappTab = () => {
  const { data } = useSiteContent<string>("whatsapp_number");
  const update = useUpdateSiteContent<string>("whatsapp_number");
  const [number, setNumber] = useState("");

  useEffect(() => {
    if (data) setNumber(data);
  }, [data]);

  const handleSave = () => {
    if (!WHATSAPP_REGEX.test(number)) {
      toast.error("Número inválido. Use só dígitos, com código do país (ex: 5519999999999).");
      return;
    }
    update.mutate(number, {
      onSuccess: () => toast.success("Número de WhatsApp atualizado."),
      onError: () => toast.error("Falha ao salvar."),
    });
  };

  return (
    <div className="space-y-4 max-w-sm">
      <div className="space-y-1.5">
        <Label>Número (DDI + DDD + número, só dígitos)</Label>
        <Input
          value={number}
          onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
          placeholder="5519999999999"
        />
        <p className="text-xs text-muted-foreground">
          Usado no botão flutuante, no carrinho e nos agendamentos. Sem espaços, traços ou "+".
        </p>
      </div>
      <Button onClick={handleSave} disabled={update.isPending} className="w-full">
        {update.isPending ? "Salvando..." : "Salvar número"}
      </Button>
    </div>
  );
};

const AdminConteudo = () => {
  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold mb-6">Conteúdo do site</h1>

      <Tabs defaultValue="hero">
        <TabsList>
          <TabsTrigger value="hero">Hero Home</TabsTrigger>
          <TabsTrigger value="institucional">Institucional Home</TabsTrigger>
          <TabsTrigger value="sobre">Página Sobre</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>
        <TabsContent value="hero" className="mt-6">
          <HeroSlidesTab />
        </TabsContent>
        <TabsContent value="institucional" className="mt-6">
          <InstitutionalTab />
        </TabsContent>
        <TabsContent value="sobre" className="mt-6">
          <SobreTab />
        </TabsContent>
        <TabsContent value="whatsapp" className="mt-6">
          <WhatsappTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminConteudo;
