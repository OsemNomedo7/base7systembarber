/* Wordmark tipográfica da marca (lê brand_info.name via CMS, com fallback) -
 * substitui a logo em imagem que não existe pra esta instalação ainda. */
import { useSiteContent } from "@/hooks/useSiteContent";
import type { BrandInfo } from "@/types/content";
import { cn } from "@/lib/utils";

const FALLBACK_NAME = "Navalha Barbearia";

interface BrandWordmarkProps {
  className?: string;
}

const BrandWordmark = ({ className }: BrandWordmarkProps) => {
  const { data: brand } = useSiteContent<BrandInfo>("brand_info");
  const name = brand?.name || FALLBACK_NAME;

  /* Logo em imagem, quando configurada (Conteúdo -> Marca & Local). O
   * tamanho é relativo ao font-size herdado do `className` recebido (ex:
   * text-lg vs text-xs) - assim a logo escala igual em qualquer um dos
   * lugares que já usam este componente (navbar, rodapé, sidebar do admin),
   * sem precisar de uma prop de tamanho separada. */
  if (brand?.logo) {
    return (
      <span className={cn("inline-flex items-center leading-none", className)}>
        <img src={brand.logo} alt={name} className="h-[1.8em] w-auto object-contain" />
      </span>
    );
  }

  return (
    <span className={cn("font-display font-semibold uppercase tracking-[0.08em] leading-none", className)}>
      {name}
    </span>
  );
};

export default BrandWordmark;
