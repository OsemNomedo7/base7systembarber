import { useEffect } from "react";
import { useSiteContent } from "@/hooks/useSiteContent";
import type { BrandInfo } from "@/types/content";

/* Troca o favicon pelo logo configurado no admin (Conteúdo -> Marca & Local),
 * só no site público (chamado a partir de PublicLayout - o admin nunca roda
 * este hook, então o favicon dele nunca é alterado). Sem logo configurado,
 * não mexe em nada - o navegador continua usando o /favicon.ico estático. */
export function useFavicon() {
  const { data: brand } = useSiteContent<BrandInfo>("brand_info");
  const logo = brand?.logo;

  useEffect(() => {
    if (!logo) return;

    const existing = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    const link = existing ?? document.createElement("link");
    const isNew = !existing;
    if (isNew) {
      link.rel = "icon";
      document.head.appendChild(link);
    }
    const previousHref = existing?.href;
    link.href = logo;

    return () => {
      if (isNew) {
        link.remove();
      } else if (previousHref) {
        link.href = previousHref;
      }
    };
  }, [logo]);
}
