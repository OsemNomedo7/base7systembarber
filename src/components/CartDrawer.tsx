/* Drawer do carrinho com checkout via WhatsApp */
import { useState } from "react";
import { X, Minus, Plus, Trash2, Send, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/lib/supabase";
import { useWhatsappNumber } from "@/hooks/useWhatsappNumber";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartDrawer = ({ isOpen, onClose }: CartDrawerProps) => {
  const { items, updateQuantity, removeItem, total, clearCart } = useCart();
  const whatsappNumber = useWhatsappNumber();
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    deliveryType: "retirada", // "entrega" | "retirada"
    address: "",
    payment: "pix", // "pix" | "credito" | "debito"
  });

  if (!isOpen) return null;

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  /* Finaliza pedido via WhatsApp */
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    /* Salva o pedido no banco antes de abrir o WhatsApp - se falhar, ainda assim
     * abre o WhatsApp pra não travar a venda por uma falha de rede/banco. */
    const { error } = await supabase.from("orders").insert({
      customer_name: form.name,
      customer_phone: form.phone,
      delivery_type: form.deliveryType,
      address: form.deliveryType === "entrega" ? form.address : null,
      payment_method: form.payment,
      items: items.map((i) => ({
        product_id: i.product.id,
        name: i.product.name,
        price: i.product.price,
        quantity: i.quantity,
        size: i.size ?? null,
      })),
      total,
    });
    if (error) {
      toast.error("Não foi possível registrar o pedido, mas o WhatsApp vai abrir normalmente.");
    }

    const itemsList = items
      .map(
        (i) =>
          `• ${i.product.name}${i.size ? ` (Tam: ${i.size})` : ""} x${i.quantity} — R$ ${(
            i.product.price * i.quantity
          ).toFixed(2)}`
      )
      .join("\n");

    const paymentLabels: Record<string, string> = {
      pix: "Pix",
      credito: "Cartão de Crédito",
      debito: "Cartão de Débito",
    };

    const message = [
      `🛍️ *PEDIDO - BASE7WEB SYSTEM MODA*`,
      ``,
      `📦 *Produtos:*`,
      itemsList,
      ``,
      `💰 *Total: R$ ${total.toFixed(2)}*`,
      ``,
      `👤 *Cliente:* ${form.name}`,
      `📱 *Telefone:* ${form.phone}`,
      `📍 *Tipo:* ${form.deliveryType === "entrega" ? "Entrega" : "Retirada"}`,
      form.deliveryType === "entrega" ? `🏠 *Endereço:* ${form.address}` : "",
      `💳 *Pagamento:* ${paymentLabels[form.payment]}`,
    ]
      .filter(Boolean)
      .join("\n");

      const text = encodeURIComponent(message);
      const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    clearCart();
    setStep("cart");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-background h-full shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-serif text-xl font-semibold flex items-center gap-2">
            <ShoppingBag size={20} />
            {step === "cart" ? "Carrinho" : "Finalizar Pedido"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === "cart" ? (
            <>
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Seu carrinho está vazio</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={`${item.product.id}-${item.size}`}
                      className="flex gap-3 p-3 rounded-xl bg-card border border-border"
                    >
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">{item.product.name}</h4>
                        {item.size && (
                          <p className="text-xs text-muted-foreground">Tam: {item.size}</p>
                        )}
                        <p className="text-sm font-semibold text-primary">
                          R$ {(item.product.price * item.quantity).toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, item.quantity - 1, item.size)
                            }
                            className="w-6 h-6 rounded-full border border-input flex items-center justify-center hover:bg-muted transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-sm w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, item.quantity + 1, item.size)
                            }
                            className="w-6 h-6 rounded-full border border-input flex items-center justify-center hover:bg-muted transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            onClick={() => removeItem(item.product.id, item.size)}
                            className="ml-auto text-destructive/70 hover:text-destructive transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Formulário de checkout */
            <form id="checkout-form" onSubmit={handleCheckout} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nome</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Telefone</label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Tipo: Entrega / Retirada */}
              <div>
                <label className="text-sm font-medium mb-2 block">Recebimento</label>
                <div className="flex gap-3">
                  {[
                    { value: "retirada", label: "Retirada" },
                    { value: "entrega", label: "Entrega" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateField("deliveryType", opt.value)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                        form.deliveryType === opt.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-input hover:border-primary/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.deliveryType === "entrega" && (
                <div className="animate-fade-up">
                  <label className="text-sm font-medium mb-1 block">Endereço</label>
                  <input
                    type="text"
                    required
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}

              {/* Forma de pagamento */}
              <div>
                <label className="text-sm font-medium mb-2 block">Forma de Pagamento</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "pix", label: "Pix" },
                    { value: "credito", label: "Crédito" },
                    { value: "debito", label: "Débito" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateField("payment", opt.value)}
                      className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${
                        form.payment === opt.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-input hover:border-primary/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-6 border-t border-border">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-serif font-semibold text-foreground">
                R$ {total.toFixed(2)}
              </span>
            </div>
            {step === "cart" ? (
              <button
                onClick={() => setStep("checkout")}
                className="btn-hero w-full"
              >
                Finalizar Compra
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("cart")}
                  className="flex-1 py-3 rounded-full border border-input text-sm font-medium hover:bg-muted transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  form="checkout-form"
                  className="btn-hero flex-1 flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  WhatsApp
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
