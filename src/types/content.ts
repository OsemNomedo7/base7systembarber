/* Tipos do conteúdo institucional editável (tabela site_content) */
export interface HomeHeroSlide {
  image: string;
  subtitle: string;
  title: string;
  highlight: string;
  description: string;
  ctaLabel: string;
  ctaLink: string;
  ctaSecondaryLabel?: string;
  ctaSecondaryLink?: string;
}

export interface HomeInstitutional {
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
