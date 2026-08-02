/* Página de Contato - WhatsApp, telefone, endereço e mapa */
import { Phone, MapPin, Instagram, MessageCircle, Clock } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useWhatsappNumber } from "@/hooks/useWhatsappNumber";
import { usePageTitle } from "@/hooks/usePageTitle";
import type { BrandInfo } from "@/types/content";
import RevealOnScroll from "@/components/RevealOnScroll";

const Contato = () => {
  usePageTitle("Contato — Navalha Barbearia");
  const { data: brand } = useSiteContent<BrandInfo>("brand_info");
  const whatsappNumber = useWhatsappNumber();
  const phoneDisplay = whatsappNumber.replace(/^55/, "").replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");

  return (
    <main className="pt-32 pb-16 min-h-screen">
      <section className="pb-16">
        <div className="container mx-auto px-4 text-center max-w-xl">
          <RevealOnScroll>
            <p className="font-mono text-xs tracking-[0.3em] uppercase text-primary mb-4">Fale com a gente</p>
            <h1 className="font-display text-4xl md:text-6xl font-semibold text-foreground mb-4">Contato</h1>
            <div className="rule-brass mx-auto" />
          </RevealOnScroll>
        </div>
      </section>

      <section className="py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <RevealOnScroll className="space-y-8">
              <div>
                <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                  Chame no <span className="text-primary">WhatsApp</span>
                </h2>
                <p className="text-muted-foreground mb-8">
                  Fala com a gente pra agendar seu horário ou tirar dúvidas sobre os serviços.
                </p>
              </div>

              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-hero inline-flex items-center gap-2"
              >
                <MessageCircle size={18} />
                Chamar no WhatsApp
              </a>

              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone size={18} className="text-primary shrink-0" />
                  <span className="text-sm">{phoneDisplay}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <MapPin size={18} className="text-primary shrink-0" />
                  <span className="text-sm">{brand?.address || "Em breve"}</span>
                </div>
                {brand?.instagramUrl && (
                  <a
                    href={brand.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Instagram size={18} className="text-primary shrink-0" />
                    <span className="text-sm">Instagram</span>
                  </a>
                )}
                <div className="flex items-start gap-3 text-muted-foreground">
                  <Clock size={18} className="text-primary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    {(brand?.hoursLines?.length ? brand.hoursLines : ["Segunda a Sábado: 9h - 19h"]).map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={0.1}>
              <div className="rounded-lg overflow-hidden border border-border h-[400px] md:h-full min-h-[300px]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d470476.40319508285!2d-47.658165977976886!3d-22.89134458307801!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94c8c61de74b6325%3A0x17e53a6a2178c22a!2sCampinas%2C%20SP!5e0!3m2!1spt-BR!2sbr!4v1771345973153!5m2!1spt-BR!2sbr"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Localização"
                />
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Contato;
