/* Página de Contato - WhatsApp, telefone, endereço e mapa */
import { Phone, MapPin, Instagram, MessageCircle, Clock, Sparkles, Heart } from "lucide-react";

/* Dados de contato - editar aqui */
const WHATSAPP_NUMBER = "5511999999999";
const PHONE_DISPLAY = "(11) 99999-9999";
const ADDRESS = "Em Breve...";
const INSTAGRAM = "@base7web.moda";

const Contato = () => {
  return (
    <main className="pt-20 min-h-screen">
      {/* Header */}
      <section className="py-16 section-pink relative overflow-hidden">
        <div className="absolute top-6 left-8 w-20 h-20 rounded-full bg-primary/10 blur-2xl animate-float" />
        <div className="absolute bottom-4 right-12 w-28 h-28 rounded-full bg-rose-deep/10 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="absolute w-1.5 h-1.5 rounded-full bg-primary/30 animate-sparkle" style={{ top: `${25 + i * 25}%`, left: `${20 + i * 30}%`, animationDelay: `${i * 0.8}s` }} />
        ))}

        <div className="container mx-auto px-4 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Heart size={14} className="text-primary animate-pulse" />
            <p className="text-primary text-xs tracking-[0.2em] uppercase font-medium">Fale Conosco</p>
          </div>
          <h1 className="font-serif text-3xl md:text-5xl font-semibold text-foreground mb-4">
            <span className="text-gradient-rose">Contato</span>
          </h1>
          <div className="gold-divider" />
        </div>
      </section>

      <section className="py-16 relative overflow-hidden">
        {/* Glow decorativo */}
        <div className="absolute top-1/3 right-0 w-64 h-64 bg-rose/30 rounded-full blur-3xl animate-rose-glow" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-glow/20 rounded-full blur-3xl animate-rose-glow" style={{ animationDelay: "2s" }} />

        <div className="container mx-auto px-4 max-w-4xl relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Informações de contato */}
            <div className="space-y-8">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">
                  Entre em <span className="text-gradient-rose">contato</span>
                </h2>
                <p className="text-muted-foreground mb-8">
                  Estamos prontas para atender você! Entre em contato pelo WhatsApp para
                  agendar seu horário ou tirar dúvidas.
                </p>
              </div>

              {/* WhatsApp */}
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-hero inline-flex items-center gap-2"
              >
                <MessageCircle size={18} />
                Chamar no WhatsApp
              </a>

              {/* Lista de contatos */}
              <div className="space-y-4 pt-4">
                {[
                  { icon: Phone, text: PHONE_DISPLAY },
                  { icon: MapPin, text: ADDRESS },
                ].map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-center gap-3 text-muted-foreground group">
                    <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300 icon-glow">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <span className="text-sm">{text}</span>
                  </div>
                ))}

                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors group"
                >
                  <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300 icon-glow">
                    <Instagram size={18} className="text-primary" />
                  </div>
                  <span className="text-sm">{INSTAGRAM}</span>
                </a>

                <div className="flex items-center gap-3 text-muted-foreground group">
                  <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300 icon-glow">
                    <Clock size={18} className="text-primary" />
                  </div>
                  <div className="text-sm">
                    <p>Seg-Sex: 9h - 19h</p>
                    <p>Sáb: 9h - 16h</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mapa */}
            <div className="rounded-2xl overflow-hidden border border-primary/10 h-[400px] md:h-full min-h-[300px] shadow-lg shadow-primary/5">
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
          </div>
        </div>
      </section>
    </main>
  );
};

export default Contato;
