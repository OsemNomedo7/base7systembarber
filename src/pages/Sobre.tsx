/* Página Sobre - história da marca e apresentação */
import { Heart, Target, Eye, Sparkles, Star } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";
import type { SobrePageContent } from "@/types/content";

const Sobre = () => {
  const { data: content } = useSiteContent<SobrePageContent>("sobre_page");
  const paragraphs = content?.paragraphs ?? [];

  return (
    <main className="pt-20 min-h-screen">
      {/* Header */}
      <section className="py-16 section-pink relative overflow-hidden">
        <div className="absolute top-4 right-12 w-24 h-24 rounded-full bg-primary/10 blur-2xl animate-float" />
        <div className="absolute bottom-6 left-8 w-16 h-16 rounded-full bg-rose-deep/15 blur-xl animate-float" style={{ animationDelay: "1s" }} />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="absolute w-1.5 h-1.5 rounded-full bg-primary/30 animate-sparkle" style={{ top: `${20 + i * 20}%`, left: `${10 + i * 25}%`, animationDelay: `${i * 0.7}s` }} />
        ))}

        <div className="container mx-auto px-4 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Heart size={14} className="text-primary animate-pulse" />
            <p className="text-primary text-xs tracking-[0.2em] uppercase font-medium">Conheça-nos</p>
          </div>
          <h1 className="font-serif text-3xl md:text-5xl font-semibold text-foreground mb-4">
            {content?.heroTitle} <span className="text-gradient-rose">{content?.heroHighlight}</span>
          </h1>
          <div className="gold-divider" />
        </div>
      </section>

      {/* História */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-rose/20 rounded-full blur-3xl animate-rose-glow" />

        <div className="container mx-auto px-4 max-w-3xl relative">
          <div className="text-center mb-12">
            <div className="flex justify-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="text-primary fill-primary animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <h2 className="font-serif text-2xl md:text-3xl font-semibold text-foreground mb-6">
              {content?.historiaTitle} <span className="text-gradient-rose">{content?.historiaHighlight}</span>
            </h2>
            {paragraphs.map((paragraph, i) => (
              <p
                key={i}
                className={`text-muted-foreground leading-relaxed ${i < paragraphs.length - 1 ? "mb-4" : ""}`}
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Missão, Visão e Valores */}
      <section className="py-16 section-rose relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-glow/20 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: Heart, title: "Missão", text: content?.missao },
              { icon: Eye, title: "Visão", text: content?.visao },
              { icon: Target, title: "Valores", text: content?.valores },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="text-center p-8 rounded-2xl bg-background/60 backdrop-blur-sm border border-primary/10 card-hover group">
                <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 icon-glow">
                  <Icon size={26} className="text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold mb-3 group-hover:text-primary transition-colors">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default Sobre;
