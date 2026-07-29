/* Card de produto com link para página de detalhe */
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { Product } from "@/data/products";

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <Link
      to={`/produto/${product.id}`}
      className="group card-hover bg-card rounded-2xl border border-border overflow-hidden block"
    >
      {/* Imagem com overlay */}
      <div className="aspect-[4/5] overflow-hidden relative">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        {/* Overlay ao hover */}
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-all duration-500 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all duration-500">
            <Eye size={20} className="text-foreground" />
          </div>
        </div>
        {/* Badge categoria */}
        <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-background/80 backdrop-blur-sm text-[10px] uppercase tracking-widest text-foreground font-medium">
          {product.category}
        </span>
      </div>

      {/* Conteúdo */}
      <div className="p-4">
        <h3 className="font-serif text-base font-semibold text-foreground mt-1 group-hover:text-primary transition-colors duration-300">
          {product.name}
        </h3>
        <p className="text-lg font-semibold text-primary mt-1">
          R$ {product.price.toFixed(2)}
        </p>
        {product.sizes && (
          <div className="flex gap-1.5 mt-2">
            {product.sizes.map((size) => (
              <span
                key={size}
                className="w-7 h-7 rounded-full text-[10px] font-medium border border-input text-muted-foreground flex items-center justify-center"
              >
                {size}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
};

export default ProductCard;
