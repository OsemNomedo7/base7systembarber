/* Layout das páginas públicas - header/footer/whatsapp fixos + tracking de visita */
import { Outlet } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import ChatWidget from "@/components/ChatWidget";
import { usePageView } from "@/hooks/usePageView";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useFavicon } from "@/hooks/useFavicon";
import type { BrandColors } from "@/types/content";
import type { CSSProperties } from "react";

const PublicLayout = () => {
  usePageView();
  useFavicon();
  const { data: colors } = useSiteContent<BrandColors>("brand_colors");

  /* Sobrescreve os tokens de marca só quando o admin já salvou uma paleta -
   * sem isso, os valores fixos de index.css continuam valendo (default). */
  const colorStyle: CSSProperties | undefined = colors
    ? ({
        "--ink": colors.ink,
        "--brass": colors.brass,
        "--paper": colors.paper,
      } as CSSProperties)
    : undefined;

  return (
    <div className="site-public" style={colorStyle}>
      <Header />
      <Outlet />
      <Footer />
      <WhatsAppButton />
      <ChatWidget />
    </div>
  );
};

export default PublicLayout;
