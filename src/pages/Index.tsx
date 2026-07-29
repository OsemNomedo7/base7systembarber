/* Página inicial - Hero Carrossel, produtos em destaque, sobre breve */
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Heart, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useSiteContent } from "@/hooks/useSiteContent";
import type { HomeHeroSlide, HomeInstitutional } from "@/types/content";

const Index = () => {
  const { data: products = [] } = useProducts();
  const featuredProducts = products.slice(0, 4);
  const { data: heroSlidesData } = useSiteContent<HomeHeroSlide[]>("home_hero_slides");
  const heroSlides = heroSlidesData ?? [];
  const { data: institutional } = useSiteContent<HomeInstitutional>("home_institutional");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  /* Autoplay do carrossel */
  const goToSlide = useCallback((index: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSlide(index);
      setIsTransitioning(false);
    }, 400);
  }, []);

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % heroSlides.length);
  }, [currentSlide, goToSlide, heroSlides.length]);

  const prevSlide = useCallback(() => {
    goToSlide((currentSlide - 1 + heroSlides.length) % heroSlides.length);
  }, [currentSlide, goToSlide, heroSlides.length]);

  useEffect(() => {
    if (heroSlides.length === 0) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide, heroSlides.length]);

  const slide = heroSlides[currentSlide];

  if (!slide) {
    return <main className="min-h-screen" />;
  }

  return (
    <main>
      {/* ===== HERO CARROSSEL ===== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Imagem de fundo com transição */}
        <div className="absolute inset-0">
          <img
            key={currentSlide}
            src={slide.image}
            alt="BASE7WEB System Moda"
            className={`w-full h-full object-cover transition-all duration-1000 ${
              isTransitioning ? "scale-110 opacity-0" : "scale-100 opacity-100"
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 via-foreground/40 to-transparent" />
          {/* Partículas decorativas */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-gold-light/30 animate-float"
                style={{
                  left: `${15 + i * 15}%`,
                  top: `${20 + (i % 3) * 25}%`,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: `${3 + i * 0.5}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="relative z-10 container mx-auto px-4 text-center md:text-left">
          <div className="max-w-xl">
            <p
              className={`text-gold-light text-sm tracking-[0.3em] uppercase mb-4 transition-all duration-700 ${
                isTransitioning ? "opacity-0 -translate-y-4" : "opacity-100 translate-y-0"
              }`}
            >
              {slide.subtitle}
            </p>
            <h1
              className={`font-serif text-4xl md:text-6xl lg:text-7xl font-bold text-background leading-tight mb-6 transition-all duration-700 delay-100 ${
                isTransitioning ? "opacity-0 -translate-y-4" : "opacity-100 translate-y-0"
              }`}
            >
              {slide.title}
              <br />
              <span className="text-gradient-gold">{slide.highlight}</span>
            </h1>
            <p
              className={`text-background/80 text-base md:text-lg mb-8 leading-relaxed transition-all duration-700 delay-200 ${
                isTransitioning ? "opacity-0 -translate-y-4" : "opacity-100 translate-y-0"
              }`}
            >
              {slide.description}
            </p>
            <div
              className={`flex flex-col sm:flex-row gap-4 justify-center md:justify-start transition-all duration-700 delay-300 ${
                isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
              }`}
            >
              <div style={{ marginTop: "550px", display: "flex", justifyContent: "center", gap: "12px" }}>
              <Link to={slide.ctaLink} className="btn-hero">
                {slide.ctaLabel}
                <ArrowRight size={16} className="ml-2" />
              </Link>
              {slide.ctaSecondaryLabel && slide.ctaSecondaryLink && (
                <Link
                  to={slide.ctaSecondaryLink}
                  className="inline-flex items-center justify-center rounded-full px-8 py-3 text-sm font-medium border border-background/30 text-background hover:bg-background/10 transition-all duration-300"
                >
                  {slide.ctaSecondaryLabel}
                </Link>
              )}
              </div>
            </div>
          </div>
        </div>

        {/* Controles do carrossel */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">
          <button
            onClick={prevSlide}
            className="w-10 h-10 rounded-full bg-background/10 backdrop-blur-sm border border-background/20 flex items-center justify-center text-background hover:bg-background/20 transition-all duration-300 hover:scale-110"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex gap-2">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === currentSlide
                    ? "w-8 bg-primary"
                    : "w-3 bg-background/40 hover:bg-background/60"
                }`}
              />
            ))}
          </div>
          <button
            onClick={nextSlide}
            className="w-10 h-10 rounded-full bg-background/10 backdrop-blur-sm border border-background/20 flex items-center justify-center text-background hover:bg-background/20 transition-all duration-300 hover:scale-110"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 right-8 z-20 hidden md:flex flex-col items-center gap-2">
          <span className="text-background/50 text-[10px] tracking-widest uppercase rotate-90 origin-center translate-x-4">
            scroll
          </span>
          <div className="w-px h-12 bg-gradient-to-b from-background/50 to-transparent animate-pulse" />
        </div>
      </section>

      {/* ===== DESTAQUES PRODUTOS ===== */}
      <section className="py-20 section-pink relative overflow-hidden">
        {/* Decoração de fundo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-rose-glow" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-deep/15 rounded-full blur-3xl animate-rose-glow" style={{ animationDelay: "2s" }} />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="absolute w-1.5 h-1.5 rounded-full bg-primary/25 animate-sparkle" style={{ top: `${15 + i * 20}%`, left: `${10 + i * 25}%`, animationDelay: `${i * 0.5}s` }} />
        ))}

        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Sparkles size={14} className="text-primary animate-pulse" />
              <p className="text-primary text-xs tracking-[0.2em] uppercase font-medium">Novidades</p>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-foreground">
              Peças que <span className="text-gradient-rose">combinam com você</span>
            </h2>
            <div className="gold-divider mt-4" />
          </div>

          {/* Grid de produtos em destaque */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product, index) => (
              <Link
                key={product.id}
                to={`/produto/${product.id}`}
                className="group card-hover bg-background/70 backdrop-blur-sm rounded-2xl border border-primary/10 overflow-hidden relative"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="aspect-[4/5] overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-4 text-center relative">
                  <h3 className="font-serif text-sm font-semibold mb-1 group-hover:text-primary transition-colors duration-300 line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-sm text-primary font-medium">R$ {product.price.toFixed(2)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== INSTITUCIONAL ===== */}
      <section className="py-20 relative overflow-hidden">
        {/* Decoração rosa */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose/25 rounded-full blur-3xl animate-rose-glow" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />

        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className="text-primary fill-primary animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-6">
              {institutional?.title} <span className="text-gradient-rose">{institutional?.highlight}</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">{institutional?.description}</p>
            <div className="flex justify-center gap-8">
              {[
                { icon: Heart, label: "Cuidado" },
                { icon: Sparkles, label: "Qualidade" },
                { icon: Star, label: "Confiança" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="text-center group cursor-default">
                  <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-2 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-500 group-hover:shadow-lg icon-glow">
                    <Icon size={22} className="text-primary" />
                  </div>
                  <p className="text-sm font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA LOJA ===== */}
      <section className="py-20 section-rose relative overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-10 left-10 w-32 h-32 border border-primary/30 rounded-full animate-float" />
          <div className="absolute bottom-10 right-10 w-24 h-24 border border-primary/20 rounded-full animate-float" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 right-1/4 w-16 h-16 border border-primary/15 rounded-full animate-float" style={{ animationDelay: "2s" }} />
        </div>
        <div className="absolute top-0 left-1/4 w-40 h-40 bg-primary/5 rounded-full blur-3xl animate-rose-glow" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="absolute w-1 h-1 rounded-full bg-primary/30 animate-sparkle" style={{ top: `${30 + i * 20}%`, right: `${10 + i * 20}%`, animationDelay: `${i * 0.7}s` }} />
        ))}

        <div className="container mx-auto px-4 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles size={14} className="text-primary animate-pulse" />
            <p className="text-primary text-xs tracking-[0.2em] uppercase font-medium">Novidades</p>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-4">
            Moda & <span className="text-gradient-rose">Beleza</span>
          </h2>
          <div className="gold-divider mb-6" />
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            Descubra peças exclusivas e produtos de beleza selecionados especialmente para você.
          </p>
          <Link to="/loja" className="btn-hero group">
            Explorar loja
            <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </main>
  );
};

export default Index;
