/* Tipos do conteúdo institucional editável (tabela site_content) */
export interface HomeHero {
  image: string;
  subtitle: string;
  title: string;
  highlight: string;
  description: string;
  ctaLabel: string;
  ctaLink: string;
}

export interface HomeAbout {
  title: string;
  highlight: string;
  description: string;
}

export interface SobrePageContent {
  heroTitle: string;
  heroHighlight: string;
  historiaTitle: string;
  historiaHighlight: string;
  paragraphs: string[];
  missao: string;
  visao: string;
  valores: string;
}

export interface BrandInfo {
  name: string;
  tagline: string;
  instagramUrl: string;
  address: string;
  hoursLines: string[];
  /* URL da logo (Storage) - opcional. Sem logo, navbar/rodapé/admin/favicon
   * caem para a wordmark em texto (nome da marca) e o favicon.ico estático. */
  logo?: string;
}

/* Galeria (site_content, chave "gallery_images") é armazenada como string[] pura,
 * mesmo padrão de "whatsapp_number" (sem wrapper) - usar useSiteContent<string[]>. */

/* Paleta de marca (site_content, chave "brand_colors") - cada valor é um
 * triplet HSL puro ("H S% L%", sem "hsl()" em volta), o mesmo formato das
 * CSS custom properties em index.css. Sobrescreve --ink/--brass/--paper de
 * `.site-public` em runtime (ver PublicLayout.tsx); as demais variáveis do
 * tema (card, popover, secondary, etc.) continuam fixas por design - ver
 * seção "Cores" do admin. */
export interface BrandColors {
  ink: string;
  brass: string;
  paper: string;
}
