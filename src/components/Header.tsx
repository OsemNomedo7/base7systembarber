/* Header fixo com navegação, carrinho e CTA de agendamento em destaque */
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ShoppingBag, CalendarClock } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import BrandWordmark from "@/components/BrandWordmark";

const navLinks = [
  { label: "Início", path: "/" },
  { label: "Produtos", path: "/produtos" },
  { label: "Sobre", path: "/sobre" },
  { label: "Contato", path: "/contato" },
];

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const { itemCount } = useCart();

  /* Na Home, o hero é full-bleed atrás da navbar - só fica sólida depois de rolar */
  const isTransparentHeader = location.pathname === "/" && !isScrolled;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        isTransparentHeader ? "bg-transparent" : "bg-background/85 backdrop-blur-xl border-b border-border"
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between h-16 md:h-20">
        <Link to="/" className="flex items-center">
          <BrandWordmark className="text-lg md:text-xl" />
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-sm font-medium transition-all duration-300 relative hover:text-primary ${
                location.pathname === link.path ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {link.label}
              {location.pathname === link.path && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          ))}
        </nav>

        {/* Ações */}
        <div className="flex items-center gap-2 md:gap-3">
          <Link
            to="/produtos"
            className="relative p-2 text-foreground hover:text-primary transition-all duration-300 hover:scale-110"
            aria-label="Produtos"
          >
            <ShoppingBag size={20} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-semibold">
                {itemCount}
              </span>
            )}
          </Link>

          <Link
            to="/agendar"
            className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2 text-xs font-medium uppercase tracking-wider transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
          >
            <CalendarClock size={14} />
            Agendar
          </Link>

          <button
            className="md:hidden p-2 text-foreground hover:text-primary transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Menu"
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {isOpen && (
        <nav className="md:hidden bg-background/95 backdrop-blur-xl border-t border-border animate-fade-up">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`text-sm font-medium py-3 px-4 rounded-lg transition-all duration-300 ${
                  location.pathname === link.path
                    ? "text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/agendar"
              onClick={() => setIsOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-3 text-sm font-medium uppercase tracking-wider"
            >
              <CalendarClock size={16} />
              Agendar horário
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
