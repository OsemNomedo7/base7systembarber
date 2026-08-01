/* Página de detalhe do produto */
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ShoppingBag, Check, Send, ArrowLeft, Heart, ChevronLeft, ChevronRight, Star, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { useProduct } from "@/hooks/useProduct";
import { useCart } from "@/contexts/CartContext";
import { trackProductView } from "@/lib/analytics";
import { useProductReviews, useCreateReview } from "@/hooks/useProductReviews";
import CartDrawer from "@/components/CartDrawer";
import StarRating from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const Produto = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, itemCount } = useCart();

  const { data: product, isLoading } = useProduct(id);
  const { data: reviews = [] } = useProductReviews(id);
  const createReview = useCreateReview();

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);
  const [added, setAdded] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [liked, setLiked] = useState(false);

  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHoverRating, setReviewHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");

  useEffect(() => {
    setSelectedSize(product?.sizes?.[0] || "");
  }, [product?.id]);

  useEffect(() => {
    if (product) trackProductView(product.id);
  }, [product?.id]);

  if (isLoading) {
    return <main className="pt-20 min-h-screen" />;
  }

  if (!product) {
    return (
      <main className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Produto não encontrado</p>
          <Link to="/loja" className="btn-hero">Voltar à loja</Link>
        </div>
      </main>
    );
  }

  const images = product.images?.length ? product.images : [product.image];
  const averageRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  const handleAdd = () => {
    addItem(product, selectedSize || undefined);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleBuyNow = () => {
    addItem(product, selectedSize || undefined);
    setCartOpen(true);
  };

  const nextImage = () => setSelectedImage((prev) => (prev + 1) % images.length);
  const prevImage = () => setSelectedImage((prev) => (prev - 1 + images.length) % images.length);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewRating === 0) {
      toast.error("Selecione de 1 a 5 estrelas.");
      return;
    }
    createReview.mutate(
      { product_id: product.id, customer_name: reviewName, rating: reviewRating, comment: reviewComment },
      {
        onSuccess: () => {
          toast.success("Avaliação enviada! Ela aparece no site após ser aprovada.");
          setReviewName("");
          setReviewRating(0);
          setReviewComment("");
        },
        onError: () => toast.error("Não foi possível enviar sua avaliação. Tente novamente."),
      }
    );
  };

  return (
    <main className="pt-20 min-h-screen">
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Voltar
        </button>
      </div>

      <section className="container mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 max-w-6xl mx-auto">
          {/* Galeria de imagens */}
          <div className="space-y-4 animate-fade-up">
            {/* Imagem principal */}
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-card group">
              <img
                src={images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />

              {/* Setas de navegação */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-background hover:scale-110 shadow-lg"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-background hover:scale-110 shadow-lg"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}

              {/* Indicadores */}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        i === selectedImage
                          ? "bg-primary w-6"
                          : "bg-background/60 hover:bg-background"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`relative w-20 h-24 rounded-xl overflow-hidden transition-all duration-300 ${
                      i === selectedImage
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detalhes do produto */}
          <div className="flex flex-col justify-center animate-fade-in-delay">
            {/* Categoria */}
            <span className="text-[11px] uppercase tracking-[0.2em] text-primary font-medium mb-3">
              {product.category}
            </span>

            {/* Nome */}
            <h1 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-2">
              {product.name}
            </h1>

            {/* Nota média */}
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <StarRating value={averageRating} size={16} />
                <span className="text-sm text-muted-foreground">
                  {averageRating.toFixed(1)} ({reviews.length} avaliação{reviews.length > 1 ? "ões" : ""})
                </span>
              </div>
            )}

            {/* Preço */}
            <p className="text-2xl md:text-3xl font-semibold text-primary mb-6">
              R$ {product.price.toFixed(2)}
            </p>

            {/* Divider */}
            <div className="w-full h-px bg-border mb-6" />

            {/* Descrição */}
            {product.description && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-2">Descrição</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Tamanhos */}
            {product.sizes && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-foreground mb-3">Tamanho</h3>
                <div className="flex gap-3">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`w-12 h-12 rounded-xl text-sm font-medium border-2 transition-all duration-300 ${
                        selectedSize === size
                          ? "bg-primary text-primary-foreground border-primary scale-110 shadow-lg"
                          : "border-input text-muted-foreground hover:border-primary/50 hover:scale-105"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={handleAdd}
                className={`flex-1 py-3.5 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
                  added
                    ? "bg-[#25D366] text-primary-foreground scale-105"
                    : "border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                }`}
              >
                {added ? (
                  <><Check size={18} /> Adicionado!</>
                ) : (
                  <><ShoppingBag size={18} /> Adicionar ao carrinho</>
                )}
              </button>
              <button
                onClick={() => setLiked(!liked)}
                className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  liked
                    ? "border-red-400 text-red-400 bg-red-50 scale-110"
                    : "border-input text-muted-foreground hover:border-red-300 hover:text-red-400"
                }`}
              >
                <Heart size={20} className={liked ? "fill-current" : ""} />
              </button>
            </div>

            <button
              onClick={handleBuyNow}
              className="btn-hero w-full flex items-center justify-center gap-2 py-3.5"
            >
              <Send size={18} />
              COMPRAR
            </button>

            {/* Info extra */}
            <div className="mt-8 space-y-3">
              {[
                "✨ Produtos selecionados com carinho",
                "🚚 Entrega ou retirada disponível",
                "💳 Pix, Crédito ou Débito",
              ].map((info) => (
                <p key={info} className="text-xs text-muted-foreground flex items-center gap-2">
                  {info}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* ===== AVALIAÇÕES ===== */}
        <div className="max-w-6xl mx-auto mt-16 pt-12 border-t border-border">
          <div className="flex items-center gap-2 mb-8">
            <MessageSquareText size={20} className="text-primary" />
            <h2 className="font-serif text-2xl font-semibold text-foreground">Avaliações</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Lista de avaliações aprovadas */}
            <div className="space-y-6">
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda não há avaliações para este produto.</p>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="border-b border-border pb-6 last:border-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm">{review.customer_name}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <StarRating value={review.rating} size={14} className="mb-2" />
                    {review.comment && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                    )}
                    {review.admin_reply && (
                      <div className="mt-3 ml-4 pl-4 border-l-2 border-primary/30">
                        <p className="text-xs font-medium text-primary mb-1">Resposta da loja</p>
                        <p className="text-sm text-muted-foreground">{review.admin_reply}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Formulário de nova avaliação */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-serif text-lg font-semibold mb-4">Deixe sua avaliação</h3>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Nota</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        onMouseEnter={() => setReviewHoverRating(star)}
                        onMouseLeave={() => setReviewHoverRating(0)}
                        className="p-0.5"
                        aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
                      >
                        <Star
                          size={24}
                          className={
                            star <= (reviewHoverRating || reviewRating)
                              ? "text-primary fill-primary"
                              : "text-muted-foreground/30"
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Nome</label>
                  <Input
                    required
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Comentário</label>
                  <Textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Conte como foi sua experiência com o produto..."
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createReview.isPending}>
                  {createReview.isPending ? "Enviando..." : "Enviar avaliação"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Carrinho */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </main>
  );
};

export default Produto;
