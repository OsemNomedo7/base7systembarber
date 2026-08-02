import { useEffect } from "react";

/* document.title dinâmico por página - sem depender de nenhuma lib de SEO/head */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
