/* Página da Loja - produtos com carrinho */
import { useState } from "react";
import { ShoppingBag, Sparkles } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import CartDrawer from "@/components/CartDrawer";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/contexts/CartContext";
import { Skeleton } from "@/components/ui/skeleton";

const Loja = () => {
  const [cartOpen, setCartOpen] = useState(false);
  const [filter, setFilter] = useState("Todos");
  const { itemCount } = useCart();
  const { data: products = [], isLoading } = useProducts();

  const categories = ["Todos", "Moda", "Beleza"];
  const filtered =
    filter === "Todos" ? products : products.filter((p) => p.category === filter);

  return (
    <main className="pt-20 min-h-screen">
      {/* Header */}
      <section className="py-16 section-pink relative overflow-hidden">
        <div className="absolute top-4 left-12 w-24 h-24 rounded-full bg-primary/10 blur-2xl animate-float" />
        <div className="absolute bottom-6 right-8 w-32 h-32 rounded-full bg-rose-deep/10 blur-3xl animate-float" style={{ animationDelay: "1s" }} />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="absolute w-1.5 h-1.5 rounded-full bg-primary/30 animate-sparkle" style={{ top: `${20 + i * 25}%`, left: `${15 + i * 30}%`, animationDelay: `${i * 0.6}s` }} />
        ))}

        <div className="container mx-auto px-4 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles size={14} className="text-primary animate-pulse" />
            <p className="text-primary text-xs tracking-[0.2em] uppercase font-medium">Nossa Loja</p>
          </div>
          <h1 className="font-serif text-3xl md:text-5xl font-semibold text-foreground mb-4">
            Moda & <span className="text-gradient-rose">Beleza</span>
          </h1>
          <div className="gold-divider mb-4" />
          <p className="text-muted-foreground max-w-md mx-auto">
            Peças e produtos selecionados com carinho para realçar sua beleza.
          </p>
        </div>
      </section>

      {/* Filtros e botão carrinho */}
      <section className="py-8">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  filter === cat
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "bg-card border border-border text-muted-foreground hover:border-primary/50 hover:bg-rose-soft"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative p-3 rounded-full bg-card border border-border hover:border-primary/50 hover:bg-rose-soft transition-all duration-300 hover:scale-110 group"
          >
            <ShoppingBag size={20} className="group-hover:text-primary transition-colors" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-semibold animate-scale-in">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </section>

      {/* Grid de produtos */}
      <section className="pb-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-rose/30 rounded-full blur-3xl animate-rose-glow" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-pink-glow/20 rounded-full blur-3xl animate-rose-glow" style={{ animationDelay: "2s" }} />

        <div className="container mx-auto px-4 relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {isLoading
              ? [...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />)
              : filtered.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
          {!isLoading && filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12">Nenhum produto encontrado.</p>
          )}
        </div>
      </section>

      {/* Drawer do carrinho */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </main>
  );
};

export default Loja;
