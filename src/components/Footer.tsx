/* Rodapé com contatos e redes sociais */
import { Instagram, Phone, MapPin, Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="section-rose border-t border-primary/10 relative overflow-hidden">
      {/* Decoração */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-glow/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 py-12 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Marca */}
          <div>
            <img
              src="/imagem/logo-base7web.png"
              alt="BASE7WEB System Moda"
              className="h-10 md:h-12 w-auto object-contain mb-4"
            />

            <p className="text-sm text-muted-foreground leading-relaxed">
              Moda e beleza em um só lugar. Peças e produtos selecionados com carinho para você.
            </p>
          </div>

          {/* Contato */}
          <div>
            <h4 className="font-serif text-lg font-medium text-foreground mb-4">Contato</h4>
            <div className="space-y-3 text-sm text-muted-foreground">
              <a
                href="https://wa.me/5511999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-primary transition-all duration-300 group"
              >
                <Phone size={16} className="group-hover:scale-110 transition-transform" />
                (11) 99999-9999
              </a>
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                Em Breve...
              </div>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-primary transition-all duration-300 group"
              >
                <Instagram size={16} className="group-hover:scale-110 transition-transform" />
                @base7web.moda
              </a>
            </div>
          </div>

          {/* Horário */}
          <div>
            <h4 className="font-serif text-lg font-medium text-foreground mb-4">Horário</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Segunda a Sexta: 9h - 19h</p>
              <p>Sábado: 9h - 16h</p>
              <p>Domingo: Fechado</p>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 pt-6 border-t border-primary/10 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            Feito com <Heart size={14} className="text-primary fill-primary animate-pulse" /> BASE7WEB - SYSTEM MODA © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
