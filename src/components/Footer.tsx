/* Rodapé com contatos e redes sociais - dados vêm do CMS (brand_info) */
import { Instagram, Phone, MapPin, Clock } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useWhatsappNumber } from "@/hooks/useWhatsappNumber";
import type { BrandInfo } from "@/types/content";
import BrandWordmark from "@/components/BrandWordmark";

const Footer = () => {
  const { data: brand } = useSiteContent<BrandInfo>("brand_info");
  const whatsappNumber = useWhatsappNumber();

  const phoneDisplay = whatsappNumber
    ? whatsappNumber.replace(/^55/, "").replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
    : "";

  return (
    <footer className="border-t border-border relative overflow-hidden bg-card">
      <div className="container mx-auto px-4 py-12 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Marca */}
          <div>
            <BrandWordmark className="text-lg mb-4 block" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {brand?.tagline || "Corte, barba e acabamento com precisão de navalha."}
            </p>
          </div>

          {/* Contato */}
          <div>
            <h4 className="font-display text-lg font-medium text-foreground mb-4">Contato</h4>
            <div className="space-y-3 text-sm text-muted-foreground">
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-primary transition-all duration-300 group"
                >
                  <Phone size={16} className="group-hover:scale-110 transition-transform" />
                  {phoneDisplay}
                </a>
              )}
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                {brand?.address || "Em breve"}
              </div>
              {brand?.instagramUrl && (
                <a
                  href={brand.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-primary transition-all duration-300 group"
                >
                  <Instagram size={16} className="group-hover:scale-110 transition-transform" />
                  Instagram
                </a>
              )}
            </div>
          </div>

          {/* Horário */}
          <div>
            <h4 className="font-display text-lg font-medium text-foreground mb-4 flex items-center gap-2">
              <Clock size={16} />
              Horário
            </h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              {(brand?.hoursLines?.length ? brand.hoursLines : ["Segunda a Sábado: 9h - 19h"]).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} <BrandWordmark className="text-xs" /> — Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
