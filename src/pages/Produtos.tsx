/* Página de Produtos - pomadas, óleos e cosméticos, com carrinho */
import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import CartDrawer from "@/components/CartDrawer";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/contexts/CartContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Skeleton } from "@/components/ui/skeleton";
import RevealOnScroll from "@/components/RevealOnScroll";

const Produtos = () => {
  usePageTitle("Produtos — Navalha Barbearia");
  const [cartOpen, setCartOpen] = useState(false);
  const [filter, setFilter] = useState("Todos");
  const { itemCount } = useCart();
  const { data: products = [], isLoading } = useProducts();

  const categories = ["Todos", ...Array.from(new Set(products.map((p) => p.category)))];
  const filtered = filter === "Todos" ? products : products.filter((p) => p.category === filter);

  return (
    <main className="pt-32 pb-16 min-h-screen">
      <section className="pb-12">
        <div className="container mx-auto px-4 text-center max-w-xl">
          <RevealOnScroll>
            <p className="font-mono text-xs tracking-[0.3em] uppercase text-primary mb-4">Loja</p>
            <h1 className="font-display text-4xl md:text-6xl font-semibold text-foreground mb-4">Produtos</h1>
            <div className="rule-brass mx-auto mb-4" />
            <p className="text-muted-foreground">
              Pomadas, óleos e cosméticos selecionados pra continuar o cuidado em casa.
            </p>
          </RevealOnScroll>
        </div>
      </section>

      <section className="py-6">
        <div className="container mx-auto px-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  filter === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-all duration-300 group"
          >
            <ShoppingBag size={20} className="group-hover:text-primary transition-colors" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-semibold">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </section>

      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {isLoading
              ? [...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-lg" />)
              : filtered.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
          {!isLoading && filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12">Nenhum produto encontrado.</p>
          )}
        </div>
      </section>

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </main>
  );
};

export default Produtos;
