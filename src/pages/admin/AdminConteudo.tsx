/* Edição do conteúdo institucional do site (hero da Home, seção institucional,
 * página Sobre, galeria, marca/contato, WhatsApp) */
import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useSiteContent, useUpdateSiteContent } from "@/hooks/useSiteContent";
import type { HomeHero, HomeAbout, SobrePageContent, BrandInfo, BrandColors } from "@/types/content";
import { hslStringToHex, hexToHslString } from "@/lib/color";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ImageUploader from "@/components/admin/ImageUploader";

const EMPTY_HERO: HomeHero = {
  image: "",
  subtitle: "",
  title: "",
  highlight: "",
  description: "",
  ctaLabel: "",
  ctaLink: "/agendar",
};

const HeroTab = () => {
  const { data } = useSiteContent<HomeHero>("home_hero");
  const update = useUpdateSiteContent<HomeHero>("home_hero");
  const [hero, setHero] = useState<HomeHero>(EMPTY_HERO);

  useEffect(() => {
    if (data) setHero(data);
  }, [data]);

  const handleSave = () => {
    update.mutate(hero, {
      onSuccess: () => toast.success("Hero da Home atualizado."),
      onError: () => toast.error("Falha ao salvar."),
    });
  };

  return (
    <div className="space-y-4 max-w-lg">
      <ImageUploader
        value={hero.image}
        onChange={(url) => setHero({ ...hero, image: url })}
        folder="content"
        label="Imagem de fundo"
      />

      <div className="space-y-1.5">
        <Label>Subtítulo (acima do título)</Label>
        <Input value={hero.subtitle} onChange={(e) => setHero({ ...hero, subtitle: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Título</Label>
          <Input value={hero.title} onChange={(e) => setHero({ ...hero, title: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Destaque (cor latão)</Label>
          <Input value={hero.highlight} onChange={(e) => setHero({ ...hero, highlight: e.target.value })} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Textarea rows={3} value={hero.description} onChange={(e) => setHero({ ...hero, description: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Texto do botão</Label>
          <Input value={hero.ctaLabel} onChange={(e) => setHero({ ...hero, ctaLabel: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Link do botão</Label>
          <Input value={hero.ctaLink} onChange={(e) => setHero({ ...hero, ctaLink: e.target.value })} />
        </div>
      </div>

      <Button onClick={handleSave} disabled={update.isPending} className="w-full">
        {update.isPending ? "Salvando..." : "Salvar hero da Home"}
      </Button>
    </div>
  );
};

const AboutTab = () => {
  const { data } = useSiteContent<HomeAbout>("home_about");
  const update = useUpdateSiteContent<HomeAbout>("home_about");
  const [form, setForm] = useState<HomeAbout>({ title: "", highlight: "", description: "" });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const handleSave = () => {
    update.mutate(form, {
      onSuccess: () => toast.success("Seção \"sobre\" da Home atualizada."),
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
        <Label>Destaque (cor latão)</Label>
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
        {update.isPending ? "Salvando..." : "Salvar seção \"sobre\" da Home"}
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

const GalleryTab = () => {
  const { data } = useSiteContent<string[]>("gallery_images");
  const update = useUpdateSiteContent<string[]>("gallery_images");
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    if (data) setImages(data);
  }, [data]);

  const handleSave = () => {
    update.mutate(images, {
      onSuccess: () => toast.success("Galeria atualizada."),
      onError: () => toast.error("Falha ao salvar."),
    });
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Fotos do ambiente, cortes e equipe, exibidas na seção "Experiência" da Home. A primeira imagem aparece
        em destaque (maior).
      </p>
      <div className="flex flex-wrap gap-3">
        {images.map((url, i) => (
          <div key={i} className="relative w-32 h-32 rounded-lg overflow-hidden border border-border">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/90 flex items-center justify-center hover:bg-background"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <ImageUploader value="" onChange={(url) => setImages((prev) => [...prev, url])} folder="content" label="" />
      </div>
      <Button onClick={handleSave} disabled={update.isPending} className="w-full">
        {update.isPending ? "Salvando..." : "Salvar galeria"}
      </Button>
    </div>
  );
};

const EMPTY_BRAND: BrandInfo = { name: "", tagline: "", instagramUrl: "", address: "", hoursLines: [], logo: "" };

const BrandTab = () => {
  const { data } = useSiteContent<BrandInfo>("brand_info");
  const update = useUpdateSiteContent<BrandInfo>("brand_info");
  const [form, setForm] = useState<BrandInfo>(EMPTY_BRAND);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const handleSave = () => {
    update.mutate(form, {
      onSuccess: () => toast.success("Dados da marca atualizados."),
      onError: () => toast.error("Falha ao salvar."),
    });
  };

  const updateHourLine = (i: number, value: string) => {
    const hoursLines = [...form.hoursLines];
    hoursLines[i] = value;
    setForm({ ...form, hoursLines });
  };

  return (
    <div className="space-y-4 max-w-lg">
      <ImageUploader
        value={form.logo || ""}
        onChange={(url) => setForm({ ...form, logo: url })}
        folder="content"
        label="Logotipo"
      />
      <p className="text-xs text-muted-foreground -mt-2">
        Aparece na navbar, rodapé, favicon do site público e na barra lateral do admin. Sem logo, o nome da
        barbearia é exibido em texto no lugar dela. Prefira uma imagem quadrada ou horizontal, com fundo
        transparente (PNG).
      </p>

      <div className="space-y-1.5">
        <Label>Nome da barbearia</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Navalha Barbearia" />
      </div>
      <div className="space-y-1.5">
        <Label>Frase de efeito (rodapé)</Label>
        <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Endereço</Label>
        <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Link do Instagram</Label>
        <Input
          value={form.instagramUrl}
          onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })}
          placeholder="https://instagram.com/..."
        />
      </div>

      <div className="space-y-2">
        <Label>Horário de funcionamento (uma linha por período)</Label>
        {form.hoursLines.map((line, i) => (
          <div key={i} className="flex gap-2">
            <Input value={line} onChange={(e) => updateHourLine(i, e.target.value)} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setForm({ ...form, hoursLines: form.hoursLines.filter((_, idx) => idx !== i) })}
            >
              <Trash2 size={16} className="text-destructive" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setForm({ ...form, hoursLines: [...form.hoursLines, ""] })}
        >
          <Plus size={14} />
          Adicionar linha
        </Button>
      </div>

      <Button onClick={handleSave} disabled={update.isPending} className="w-full">
        {update.isPending ? "Salvando..." : "Salvar marca"}
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

/* Valores atuais de index.css (.site-public) - usados como padrão/reset. */
const DEFAULT_COLORS: BrandColors = {
  ink: "30 12% 7%",
  brass: "36 38% 55%",
  paper: "40 24% 90%",
};

const COLOR_FIELDS: { key: keyof BrandColors; label: string; hint: string }[] = [
  { key: "ink", label: "Fundo", hint: "Cor de fundo do site público inteiro." },
  { key: "brass", label: "Destaque", hint: "Botões, links, preços e detalhes - a cor da marca." },
  { key: "paper", label: "Texto", hint: "Cor do texto principal sobre o fundo." },
];

const ColorsTab = () => {
  const { data } = useSiteContent<BrandColors>("brand_colors");
  const update = useUpdateSiteContent<BrandColors>("brand_colors");
  const [colors, setColors] = useState<BrandColors>(DEFAULT_COLORS);

  useEffect(() => {
    if (data) setColors(data);
  }, [data]);

  const handleSave = () => {
    update.mutate(colors, {
      onSuccess: () => toast.success("Cores do site atualizadas."),
      onError: () => toast.error("Falha ao salvar."),
    });
  };

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-sm text-muted-foreground">
        Paleta do site público. As variações de tom (detalhes mais claros/escuros) continuam calculadas
        automaticamente a partir dessas três cores.
      </p>

      {COLOR_FIELDS.map(({ key, label, hint }) => (
        <div key={key} className="flex items-center gap-3">
          <input
            type="color"
            value={hslStringToHex(colors[key])}
            onChange={(e) => setColors({ ...colors, [key]: hexToHslString(e.target.value) })}
            className="h-10 w-14 shrink-0 cursor-pointer rounded border border-input bg-transparent p-1"
            aria-label={label}
          />
          <div className="flex-1 space-y-0.5">
            <Label>{label}</Label>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
        </div>
      ))}

      <div
        className="rounded-lg border border-border p-6 flex items-center justify-between"
        style={{ background: `hsl(${colors.ink})`, color: `hsl(${colors.paper})` }}
      >
        <span className="font-medium">Pré-visualização</span>
        <span
          className="rounded-md px-4 py-2 text-sm font-medium"
          style={{ background: `hsl(${colors.brass})`, color: `hsl(${colors.ink})` }}
        >
          Agendar horário
        </span>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={update.isPending} className="flex-1">
          {update.isPending ? "Salvando..." : "Salvar cores"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setColors(DEFAULT_COLORS)}>
          Restaurar padrão
        </Button>
      </div>
    </div>
  );
};

const AdminConteudo = () => {
  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold mb-6">Conteúdo do site</h1>

      <Tabs defaultValue="hero">
        <TabsList>
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="about">Sobre (Home)</TabsTrigger>
          <TabsTrigger value="sobre">Página Sobre</TabsTrigger>
          <TabsTrigger value="galeria">Galeria</TabsTrigger>
          <TabsTrigger value="marca">Marca & Local</TabsTrigger>
          <TabsTrigger value="cores">Cores</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>
        <TabsContent value="hero" className="mt-6">
          <HeroTab />
        </TabsContent>
        <TabsContent value="about" className="mt-6">
          <AboutTab />
        </TabsContent>
        <TabsContent value="sobre" className="mt-6">
          <SobreTab />
        </TabsContent>
        <TabsContent value="galeria" className="mt-6">
          <GalleryTab />
        </TabsContent>
        <TabsContent value="marca" className="mt-6">
          <BrandTab />
        </TabsContent>
        <TabsContent value="cores" className="mt-6">
          <ColorsTab />
        </TabsContent>
        <TabsContent value="whatsapp" className="mt-6">
          <WhatsappTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminConteudo;
