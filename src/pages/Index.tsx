/* Home do site público - Hero, Sobre, Serviços (Razor Rail), Profissionais,
 * Galeria, Avaliações, Produtos em destaque, Localização, CTA final. */
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { ArrowRight, MapPin, Clock, Phone } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useServices } from "@/hooks/useServices";
import { usePublicProfessionals } from "@/hooks/usePublicProfessionals";
import { useTestimonials } from "@/hooks/useTestimonials";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useWhatsappNumber } from "@/hooks/useWhatsappNumber";
import { usePageTitle } from "@/hooks/usePageTitle";
import type { HomeHero, HomeAbout, BrandInfo } from "@/types/content";
import type { Service } from "@/types/barber";
import RevealOnScroll from "@/components/RevealOnScroll";
import ServiceTicket from "@/components/ServiceTicket";
import ProfessionalCard from "@/components/ProfessionalCard";
import TestimonialCard from "@/components/TestimonialCard";
import ProductCard from "@/components/ProductCard";

/* Trilha de serviços: rolagem horizontal comum, sem "prender" o scroll da
 * página. Passando o mouse por cima e girando a roda, o gesto vertical vira
 * scroll horizontal só dentro da trilha (preventDefault precisa ser nativo -
 * o `onWheel` do React é registrado como passivo e ignora preventDefault);
 * tirando o mouse de cima, a página volta a rolar verticalmente normal. No
 * touch, o swipe horizontal nativo já funciona sem nenhum listener extra. A
 * barra de rolagem nativa fica escondida (some visualmente, o scroll continua
 * funcionando por trás). */
const ServicesRail = ({ services }: { services: Service[] }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 pl-[6vw] pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
        shouldReduceMotion ? "" : "scroll-smooth"
      }`}
    >
      {services.map((service, i) => (
        <ServiceTicket key={service.id} service={service} index={i} className="snap-start" />
      ))}
    </div>
  );
};

const Index = () => {
  usePageTitle("Navalha Barbearia — Corte e barba com hora marcada");

  const { data: hero } = useSiteContent<HomeHero>("home_hero");
  const { data: about } = useSiteContent<HomeAbout>("home_about");
  const { data: brand } = useSiteContent<BrandInfo>("brand_info");
  const { data: gallery = [] } = useSiteContent<string[]>("gallery_images");
  const { data: services = [] } = useServices(true);
  const { data: professionals = [] } = usePublicProfessionals();
  const { data: testimonials = [] } = useTestimonials();
  const { data: products = [] } = useProducts();
  const whatsappNumber = useWhatsappNumber();
  const featuredProducts = products.slice(0, 4);

  return (
    <main>
      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex items-end md:items-center overflow-hidden">
        <div className="absolute inset-0">
          {hero?.image && (
            <img src={hero.image} alt="" className="w-full h-full object-cover grayscale-[15%]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/25 md:bg-gradient-to-r md:from-background md:via-background/70 md:to-background/10" />
        </div>

        <div className="relative z-10 container mx-auto px-4 pb-24 pt-40 md:py-0">
          <div className="max-w-xl">
            {hero?.subtitle && (
              <p className="font-mono text-xs tracking-[0.3em] uppercase text-primary mb-4">{hero.subtitle}</p>
            )}
            <h1 className="font-display text-5xl md:text-7xl font-black leading-[0.95] text-foreground mb-6">
              {hero?.title}
              <br />
              <span className="text-primary">{hero?.highlight}</span>
            </h1>
            {hero?.description && (
              <p className="text-muted-foreground text-base md:text-lg mb-8 leading-relaxed max-w-md">
                {hero.description}
              </p>
            )}
            <Link to={hero?.ctaLink || "/agendar"} className="btn-hero">
              {hero?.ctaLabel || "Agendar horário"}
              <ArrowRight size={16} className="ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== SOBRE (BREVE) ===== */}
      <RevealOnScroll>
        <section className="py-24">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <div className="rule-brass mx-auto mb-6" />
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-6">
              {about?.title} <span className="text-primary">{about?.highlight}</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">{about?.description}</p>
          </div>
        </section>
      </RevealOnScroll>

      {/* ===== SERVIÇOS - RAZOR RAIL (parallax horizontal) ===== */}
      {services.length > 0 && (
        <section className="py-16 bg-card/40">
          <RevealOnScroll className="container mx-auto px-4 mb-12">
            <p className="font-mono text-xs tracking-[0.3em] uppercase text-primary mb-3">Serviços</p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground max-w-lg">
              Cada corte, uma comanda. Cada comanda, um compromisso.
            </h2>
          </RevealOnScroll>
          <ServicesRail services={services} />
        </section>
      )}

      {/* ===== PROFISSIONAIS ===== */}
      {professionals.length > 0 && (
        <section className="py-24">
          <div className="container mx-auto px-4">
            <RevealOnScroll className="mb-12 max-w-lg">
              <p className="font-mono text-xs tracking-[0.3em] uppercase text-primary mb-3">Time</p>
              <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground">
                Quem segura a navalha
              </h2>
            </RevealOnScroll>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {professionals.map((professional, i) => (
                <RevealOnScroll key={professional.id} delay={i * 0.08} className={i % 2 === 1 ? "md:mt-10" : ""}>
                  <ProfessionalCard professional={professional} />
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== GALERIA ===== */}
      {gallery.length > 0 && (
        <section className="py-24 bg-card/40">
          <div className="container mx-auto px-4">
            <RevealOnScroll className="mb-12 max-w-lg">
              <p className="font-mono text-xs tracking-[0.3em] uppercase text-primary mb-3">Experiência</p>
              <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground">
                Ambiente, detalhes e ofício
              </h2>
            </RevealOnScroll>
            <RevealOnScroll delay={0.1}>
              <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-2 gap-2 h-[70vh] md:h-[80vh]">
                {gallery.slice(0, 5).map((image, i) => (
                  <div
                    key={image}
                    className={`overflow-hidden rounded-lg ${
                      i === 0 ? "col-span-2 row-span-2" : "col-span-1 row-span-1"
                    }`}
                  >
                    <img src={image} alt="" className="w-full h-full object-cover grayscale-[20%] hover:grayscale-0 hover:scale-105 transition-all duration-700" />
                  </div>
                ))}
              </div>
            </RevealOnScroll>
          </div>
        </section>
      )}

      {/* ===== AVALIAÇÕES ===== */}
      {testimonials.length > 0 && (
        <section className="py-24">
          <div className="container mx-auto px-4">
            <RevealOnScroll className="mb-12 max-w-lg">
              <p className="font-mono text-xs tracking-[0.3em] uppercase text-primary mb-3">Depoimentos</p>
              <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground">
                Quem já sentou na cadeira
              </h2>
            </RevealOnScroll>
          </div>
          <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 px-4 md:px-[calc((100vw-1152px)/2)]">
            {testimonials.map((testimonial) => (
              <TestimonialCard key={testimonial.id} testimonial={testimonial} />
            ))}
          </div>
        </section>
      )}

      {/* ===== PRODUTOS EM DESTAQUE ===== */}
      {featuredProducts.length > 0 && (
        <section className="py-24 bg-card/40">
          <div className="container mx-auto px-4">
            <RevealOnScroll className="mb-12 flex items-end justify-between max-w-3xl">
              <div>
                <p className="font-mono text-xs tracking-[0.3em] uppercase text-primary mb-3">Loja</p>
                <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground">
                  Pra continuar o cuidado em casa
                </h2>
              </div>
              <Link to="/produtos" className="hidden md:inline-flex items-center gap-1.5 text-sm text-primary hover:gap-2.5 transition-all">
                Ver todos <ArrowRight size={14} />
              </Link>
            </RevealOnScroll>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {featuredProducts.map((product, i) => (
                <RevealOnScroll key={product.id} delay={i * 0.06}>
                  <ProductCard product={product} />
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== LOCALIZAÇÃO ===== */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            <RevealOnScroll>
              <p className="font-mono text-xs tracking-[0.3em] uppercase text-primary mb-3">Onde estamos</p>
              <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-8">
                Localização e horário
              </h2>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-primary shrink-0" />
                  {brand?.address || "Em breve"}
                </div>
                {whatsappNumber && (
                  <a
                    href={`https://wa.me/${whatsappNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 hover:text-primary transition-colors"
                  >
                    <Phone size={18} className="text-primary shrink-0" />
                    Chamar no WhatsApp
                  </a>
                )}
                <div className="flex items-start gap-3">
                  <Clock size={18} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    {(brand?.hoursLines?.length ? brand.hoursLines : ["Segunda a Sábado: 9h - 19h"]).map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            </RevealOnScroll>
            <RevealOnScroll delay={0.1}>
              <div className="rounded-lg overflow-hidden border border-border h-[350px] md:h-[420px]">
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

      {/* ===== CTA FINAL ===== */}
      <RevealOnScroll>
        <section className="py-28 bg-card/40 text-center">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-4">
              Sua próxima navalha já tem hora marcada?
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Escolha o serviço, o barbeiro e o horário — em menos de um minuto.
            </p>
            <Link to="/agendar" className="btn-hero group">
              Agendar horário
              <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </section>
      </RevealOnScroll>
    </main>
  );
};

export default Index;
