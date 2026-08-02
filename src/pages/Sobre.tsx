/* Página Sobre - história e ofício da barbearia */
import { Eye, Target, Heart } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";
import { usePageTitle } from "@/hooks/usePageTitle";
import type { SobrePageContent } from "@/types/content";
import RevealOnScroll from "@/components/RevealOnScroll";

const Sobre = () => {
  usePageTitle("Sobre — Navalha Barbearia");
  const { data: content } = useSiteContent<SobrePageContent>("sobre_page");
  const paragraphs = content?.paragraphs ?? [];

  return (
    <main className="pt-32 pb-16 min-h-screen">
      <section className="pb-16">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <RevealOnScroll>
            <p className="font-mono text-xs tracking-[0.3em] uppercase text-primary mb-4">Nossa história</p>
            <h1 className="font-display text-4xl md:text-6xl font-semibold text-foreground mb-4">
              {content?.heroTitle} <span className="text-primary">{content?.heroHighlight}</span>
            </h1>
            <div className="rule-brass mx-auto" />
          </RevealOnScroll>
        </div>
      </section>

      <section className="py-16 bg-card/40">
        <div className="container mx-auto px-4 max-w-3xl">
          <RevealOnScroll>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-6 text-center">
              {content?.historiaTitle} <span className="text-primary">{content?.historiaHighlight}</span>
            </h2>
            {paragraphs.map((paragraph, i) => (
              <p
                key={i}
                className={`text-muted-foreground leading-relaxed text-center ${i < paragraphs.length - 1 ? "mb-4" : ""}`}
              >
                {paragraph}
              </p>
            ))}
          </RevealOnScroll>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Heart, title: "Missão", text: content?.missao },
              { icon: Eye, title: "Visão", text: content?.visao },
              { icon: Target, title: "Valores", text: content?.valores },
            ].map(({ icon: Icon, title, text }, i) => (
              <RevealOnScroll key={title} delay={i * 0.1}>
                <div className="text-center p-8 rounded-lg border border-border bg-card card-hover">
                  <Icon size={24} className="text-primary mx-auto mb-4" />
                  <h3 className="font-display text-xl font-semibold mb-3">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default Sobre;
