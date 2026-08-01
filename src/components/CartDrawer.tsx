/* Drawer do carrinho com checkout via WhatsApp (+ Pix e Cartão real via Mercado Pago) */
import { useEffect, useMemo, useRef, useState } from "react";
import { X, Minus, Plus, Trash2, Send, ShoppingBag, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/lib/supabase";
import { useWhatsappNumber } from "@/hooks/useWhatsappNumber";
import { usePublicDeliveryMethods } from "@/hooks/useDeliveryMethods";
import { useCep } from "@/hooks/useCep";
import { matchDeliveryMethods, type MatchedDeliveryMethod } from "@/lib/deliveryMatching";
import {
  useCreatePixPayment,
  useCreateCardPayment,
  useMercadoPagoPublicKey,
  usePollOrderPaymentStatus,
} from "@/hooks/useMercadoPagoPayment";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartDrawer = ({ isOpen, onClose }: CartDrawerProps) => {
  const { items, updateQuantity, removeItem, total: subtotal, clearCart } = useCart();
  const whatsappNumber = useWhatsappNumber();
  const [step, setStep] = useState<"cart" | "checkout" | "pix" | "cartao">("cart");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    cpf: "",
    deliveryType: "retirada", // "entrega" | "retirada"
    cep: "",
    number: "",
    complement: "",
    payment: "pix", // "pix" | "credito" | "debito"
  });
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{ orderId: string; qrCode: string; qrCodeBase64: string } | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [cardOrderId, setCardOrderId] = useState<string | null>(null);
  const [cardStatus, setCardStatus] = useState<"pago" | "recusado" | "estornado" | "pendente" | null>(null);

  const { data: deliveryData } = usePublicDeliveryMethods();
  const methods = deliveryData?.methods;
  const cepResult = useCep(form.deliveryType === "entrega" ? form.cep : "");
  const createPixPayment = useCreatePixPayment();
  const createCardPayment = useCreateCardPayment();
  const { data: publicKey } = useMercadoPagoPublicKey();
  const { data: pixStatus } = usePollOrderPaymentStatus(pixData?.orderId ?? null);
  const { data: cardPollStatus } = usePollOrderPaymentStatus(
    cardStatus === "pendente" ? cardOrderId : null
  );
  const mpInitialized = useRef(false);

  useEffect(() => {
    if (publicKey && !mpInitialized.current) {
      initMercadoPago(publicKey, { locale: "pt-BR" });
      mpInitialized.current = true;
    }
  }, [publicKey]);

  const matchedMethods = useMemo<MatchedDeliveryMethod[]>(() => {
    const digits = form.cep.replace(/\D/g, "");
    if (digits.length !== 8 || !deliveryData) return [];
    return matchDeliveryMethods(deliveryData.methods, deliveryData.areasByMethod, {
      cep: digits,
      city: cepResult.city,
      state: cepResult.state,
      subtotal,
    });
  }, [deliveryData, form.cep, cepResult.city, cepResult.state, subtotal]);

  const selectedMethod = matchedMethods.find((m) => m.method.id === selectedMethodId) ?? null;
  const retiradaMethod = methods?.find((m) => m.type === "retirada");
  const shippingFee = form.deliveryType === "entrega" ? selectedMethod?.fee ?? 0 : 0;
  const grandTotal = subtotal + shippingFee;

  const pixConfirmed = pixStatus?.payment_status === "pago";
  const pixRejected = pixStatus?.payment_status === "recusado" || pixStatus?.payment_status === "estornado";

  const cardConfirmed = cardStatus === "pago" || cardPollStatus?.payment_status === "pago";
  const cardRejected =
    cardStatus === "recusado" ||
    cardPollStatus?.payment_status === "recusado" ||
    cardPollStatus?.payment_status === "estornado";

  /* Some fluxos avançados (avisos de sucesso) precisam abrir o WhatsApp só depois
   * de confirmar o pagamento - feito num efeito pra reagir à confirmação do polling. */
  useEffect(() => {
    if (!pixConfirmed || !pixData) return;
    const text = encodeURIComponent(
      `✅ *Pagamento Pix confirmado!*\n\nObrigado pela compra, ${form.name}! Seu pedido já está sendo preparado.`
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, "_blank");
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixConfirmed]);

  useEffect(() => {
    if (!cardConfirmed || !cardOrderId) return;
    const text = encodeURIComponent(
      `✅ *Pagamento aprovado!*\n\nObrigado pela compra, ${form.name}! Seu pedido já está sendo preparado.`
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, "_blank");
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardConfirmed]);

  if (!isOpen) return null;

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const isPix = form.payment === "pix";
  const isCredito = form.payment === "credito";
  const needsPayerInfo = isPix || isCredito;
  const canSubmit =
    (form.deliveryType === "retirada" ||
      (cepResult.status === "found" && !!selectedMethod && !!form.number.trim())) &&
    (!needsPayerInfo || (!!form.email.trim() && !!form.cpf.replace(/\D/g, "").length)) &&
    !creatingOrder;

  const buildAddress = () => {
    const isEntrega = form.deliveryType === "entrega";
    return isEntrega
      ? [
          [cepResult.street, form.number].filter(Boolean).join(", "),
          form.complement || null,
          cepResult.neighborhood,
          [cepResult.city, cepResult.state].filter(Boolean).join("/"),
          form.cep ? `CEP ${form.cep}` : null,
        ]
          .filter(Boolean)
          .join(" - ")
      : null;
  };

  const buildWhatsappMessage = (address: string | null) => {
    const isEntrega = form.deliveryType === "entrega";
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

    return [
      `🛍️ *PEDIDO - BASE7WEB SYSTEM MODA*`,
      ``,
      `📦 *Produtos:*`,
      itemsList,
      ``,
      `💰 *Subtotal: R$ ${subtotal.toFixed(2)}*`,
      isEntrega ? `🚚 *Frete: R$ ${shippingFee.toFixed(2)}*` : "",
      `💵 *Total: R$ ${grandTotal.toFixed(2)}*`,
      ``,
      `👤 *Cliente:* ${form.name}`,
      `📱 *Telefone:* ${form.phone}`,
      `📍 *Tipo:* ${isEntrega ? "Entrega" : "Retirada"}`,
      isEntrega && selectedMethod
        ? `🚛 *Método:* ${selectedMethod.method.name}${selectedMethod.etaLabel ? ` (${selectedMethod.etaLabel})` : ""}`
        : "",
      isEntrega && address ? `🏠 *Endereço:* ${address}` : "",
      `💳 *Pagamento:* ${paymentLabels[form.payment]}`,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const openWhatsapp = (message: string) => {
    const text = encodeURIComponent(message);
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, "_blank");
  };

  const finishNonPixCheckout = (message: string) => {
    openWhatsapp(message);
    clearCart();
    setStep("cart");
    setSelectedMethodId(null);
    onClose();
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCredito) return; // cartão é finalizado pelo próprio botão do Brick <CardPayment>
    setCreatingOrder(true);

    const address = buildAddress();
    const isEntrega = form.deliveryType === "entrega";

    /* Salva o pedido no banco (via RPC, que já associa/cria o cadastro do cliente
     * automaticamente pelo telefone). Para Pix, o pedido precisa existir de fato pra
     * criar o pagamento real - por isso, diferente do Crédito/Débito (que ainda são
     * só rótulo e podem cair no fallback do WhatsApp mesmo com erro), aqui um erro
     * de gravação interrompe o fluxo. */
    /* Preço, frete e total NUNCA são enviados pelo cliente - o backend
     * (create_order) recalcula tudo a partir de products/delivery_methods
     * (correção SEC-001 do audit de segurança). Só mandamos a intenção de
     * compra (produto/quantidade/tamanho) e o método de entrega escolhido. */
    const { data: orderId, error } = await supabase.rpc("create_order", {
      p_customer_name: form.name,
      p_customer_phone: form.phone,
      p_delivery_type: form.deliveryType,
      p_address: address,
      p_payment_method: form.payment,
      p_items: items.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
        size: i.size ?? null,
      })),
      p_delivery_method_id: isEntrega ? selectedMethod?.method.id ?? null : null,
      p_shipping_label: isEntrega ? selectedMethod?.method.name ?? null : retiradaMethod?.name ?? null,
      p_shipping_eta: isEntrega ? selectedMethod?.etaLabel ?? null : null,
    });

    if (!isPix) {
      if (error) {
        toast.error("Não foi possível registrar o pedido, mas o WhatsApp vai abrir normalmente.");
      }
      setCreatingOrder(false);
      finishNonPixCheckout(buildWhatsappMessage(address));
      return;
    }

    if (error || !orderId) {
      toast.error("Não foi possível registrar o pedido. Tente novamente em instantes.");
      setCreatingOrder(false);
      return;
    }

    createPixPayment.mutate(
      { order_id: orderId as string, payer: { email: form.email, cpf: form.cpf } },
      {
        onSuccess: (data) => {
          setCreatingOrder(false);
          if (!data.qr_code_base64 || !data.qr_code) {
            toast.error("Não foi possível gerar o Pix agora. Falando com a loja pelo WhatsApp...");
            finishNonPixCheckout(buildWhatsappMessage(address));
            return;
          }
          setPixData({ orderId: orderId as string, qrCode: data.qr_code, qrCodeBase64: data.qr_code_base64 });
          setStep("pix");
        },
        onError: () => {
          setCreatingOrder(false);
          toast.error("Não foi possível gerar o Pix agora. Falando com a loja pelo WhatsApp...");
          finishNonPixCheckout(buildWhatsappMessage(address));
        },
      }
    );
  };

  /* Chamado pelo próprio Brick <CardPayment> quando o comprador preenche o cartão
   * e clica no botão interno dele - o token já vem pronto (número/CVV nunca
   * passam pelo nosso código). Cria o pedido só nesse momento, junto com o
   * pagamento, já que cartão aprova/recusa na hora (diferente do Pix). */
  const handleCardSubmit = async (formData: {
    token: string;
    payment_method_id: string;
    installments: number;
  }) => {
    setCreatingOrder(true);
    const address = buildAddress();
    const isEntrega = form.deliveryType === "entrega";

    /* Preço, frete e total NUNCA são enviados pelo cliente - o backend
     * (create_order) recalcula tudo a partir de products/delivery_methods
     * (correção SEC-001 do audit de segurança). Só mandamos a intenção de
     * compra (produto/quantidade/tamanho) e o método de entrega escolhido. */
    const { data: orderId, error } = await supabase.rpc("create_order", {
      p_customer_name: form.name,
      p_customer_phone: form.phone,
      p_delivery_type: form.deliveryType,
      p_address: address,
      p_payment_method: form.payment,
      p_items: items.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
        size: i.size ?? null,
      })),
      p_delivery_method_id: isEntrega ? selectedMethod?.method.id ?? null : null,
      p_shipping_label: isEntrega ? selectedMethod?.method.name ?? null : retiradaMethod?.name ?? null,
      p_shipping_eta: isEntrega ? selectedMethod?.etaLabel ?? null : null,
    });

    if (error || !orderId) {
      setCreatingOrder(false);
      toast.error("Não foi possível registrar o pedido. Tente novamente em instantes.");
      throw new Error("Falha ao criar pedido");
    }

    try {
      const result = await createCardPayment.mutateAsync({
        order_id: orderId as string,
        token: formData.token,
        payment_method_id: formData.payment_method_id,
        installments: formData.installments,
        payer: { email: form.email, cpf: form.cpf },
      });
      setCreatingOrder(false);
      setCardOrderId(orderId as string);
      setCardStatus(result.payment_status);
      setStep("cartao");
    } catch (err) {
      setCreatingOrder(false);
      toast.error("Não foi possível processar o pagamento agora. Tente novamente.");
      throw err;
    }
  };

  const copyPixCode = async () => {
    if (!pixData) return;
    await navigator.clipboard.writeText(pixData.qrCode);
    toast.success("Código Pix copiado!");
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
            {step === "cart"
              ? "Carrinho"
              : step === "checkout"
              ? "Finalizar Pedido"
              : step === "pix"
              ? "Pagamento via Pix"
              : "Pagamento com Cartão"}
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
          ) : step === "pix" ? (
            /* Aguardando confirmação do Pix */
            <div className="text-center space-y-4 py-4">
              {pixConfirmed ? (
                <>
                  <CheckCircle2 size={48} className="mx-auto text-green-600" />
                  <p className="font-medium">Pagamento confirmado!</p>
                  <p className="text-sm text-muted-foreground">
                    Seu pedido foi recebido e o WhatsApp da loja foi aberto pra confirmar.
                  </p>
                </>
              ) : pixRejected ? (
                <>
                  <X size={48} className="mx-auto text-destructive" />
                  <p className="font-medium">Pagamento não aprovado</p>
                  <p className="text-sm text-muted-foreground">
                    Tente novamente ou escolha outra forma de pagamento.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPixData(null);
                      setStep("checkout");
                    }}
                    className="btn-hero w-full mt-4"
                  >
                    Voltar
                  </button>
                </>
              ) : pixData ? (
                <>
                  <img
                    src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                    alt="QR Code Pix"
                    className="w-56 h-56 mx-auto rounded-xl border border-border"
                  />
                  <p className="text-sm text-muted-foreground">
                    Escaneie o QR code no app do seu banco ou copie o código abaixo.
                  </p>
                  <button
                    type="button"
                    onClick={copyPixCode}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-input text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <Copy size={14} />
                    Copiar código Pix
                  </button>
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                    <Loader2 size={14} className="animate-spin" />
                    Aguardando confirmação do pagamento...
                  </div>
                </>
              ) : null}
            </div>
          ) : step === "cartao" ? (
            /* Resultado do pagamento com cartão (aprovação é síncrona, mas pode
             * cair em análise e usar o mesmo polling do Pix) */
            <div className="text-center space-y-4 py-4">
              {cardConfirmed ? (
                <>
                  <CheckCircle2 size={48} className="mx-auto text-green-600" />
                  <p className="font-medium">Pagamento aprovado!</p>
                  <p className="text-sm text-muted-foreground">
                    Seu pedido foi recebido e o WhatsApp da loja foi aberto pra confirmar.
                  </p>
                </>
              ) : cardRejected ? (
                <>
                  <X size={48} className="mx-auto text-destructive" />
                  <p className="font-medium">Pagamento não aprovado</p>
                  <p className="text-sm text-muted-foreground">
                    Tente novamente ou escolha outra forma de pagamento.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCardOrderId(null);
                      setCardStatus(null);
                      setStep("checkout");
                    }}
                    className="btn-hero w-full mt-4"
                  >
                    Voltar
                  </button>
                </>
              ) : (
                <>
                  <Loader2 size={48} className="mx-auto animate-spin text-primary" />
                  <p className="font-medium">Analisando pagamento...</p>
                  <p className="text-sm text-muted-foreground">
                    Aguardando a confirmação do Mercado Pago.
                  </p>
                </>
              )}
            </div>
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
                      onClick={() => {
                        updateField("deliveryType", opt.value);
                        setSelectedMethodId(null);
                      }}
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
                <div className="animate-fade-up space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">CEP</label>
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      maxLength={9}
                      placeholder="00000-000"
                      value={form.cep}
                      onChange={(e) => {
                        updateField("cep", e.target.value);
                        setSelectedMethodId(null);
                      }}
                      className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {cepResult.status === "loading" && (
                      <p className="text-xs text-muted-foreground mt-1">Consultando CEP...</p>
                    )}
                    {cepResult.status === "not_found" && (
                      <p className="text-xs text-destructive mt-1">CEP não encontrado.</p>
                    )}
                    {cepResult.status === "error" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Não foi possível confirmar a cidade automaticamente, mas você ainda pode ver as
                        opções disponíveis para o seu CEP.
                      </p>
                    )}
                    {cepResult.status === "found" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {cepResult.street ? `${cepResult.street}, ` : ""}
                        {cepResult.neighborhood ? `${cepResult.neighborhood} - ` : ""}
                        {cepResult.city}/{cepResult.state}
                      </p>
                    )}
                  </div>

                  {(cepResult.status === "found" || cepResult.status === "error") && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Número</label>
                        <input
                          type="text"
                          required
                          value={form.number}
                          onChange={(e) => updateField("number", e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Complemento</label>
                        <input
                          type="text"
                          value={form.complement}
                          onChange={(e) => updateField("complement", e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    </div>
                  )}

                  {(cepResult.status === "found" || cepResult.status === "error") && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Opções de entrega</label>
                      {matchedMethods.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Não há opções de entrega disponíveis para essa região.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {matchedMethods.map((m) => (
                            <button
                              key={m.method.id}
                              type="button"
                              onClick={() => setSelectedMethodId(m.method.id)}
                              className={`w-full flex items-center justify-between py-2.5 px-3 rounded-lg text-sm border transition-all ${
                                selectedMethodId === m.method.id
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-foreground border-input hover:border-primary/50"
                              }`}
                            >
                              <span className="font-medium">{m.method.name}</span>
                              <span className="text-xs">
                                {m.isFree ? "Grátis" : `R$ ${m.fee.toFixed(2)}`}
                                {m.etaLabel ? ` · ${m.etaLabel}` : ""}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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

              {needsPayerInfo && (
                <div className="animate-fade-up grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">E-mail</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">CPF</label>
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      value={form.cpf}
                      onChange={(e) => updateField("cpf", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Exigido pelo Mercado Pago para o pagamento.</p>
                  </div>
                </div>
              )}

              {isCredito && (
                <div className="animate-fade-up pt-1">
                  {!publicKey ? (
                    <p className="text-sm text-muted-foreground">Carregando formulário de cartão...</p>
                  ) : !form.email.trim() || !form.cpf.replace(/\D/g, "").length ? (
                    <p className="text-sm text-muted-foreground">
                      Preencha e-mail e CPF acima para exibir o formulário do cartão.
                    </p>
                  ) : (
                    <CardPayment
                      initialization={{ amount: grandTotal, payer: { email: form.email } }}
                      onSubmit={handleCardSubmit}
                      onError={() =>
                        toast.error("Não foi possível carregar o formulário de cartão. Tente novamente.")
                      }
                    />
                  )}
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && step !== "pix" && step !== "cartao" && (
          <div className="p-6 border-t border-border">
            {step === "checkout" && shippingFee > 0 && (
              <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
            )}
            {step === "checkout" && form.deliveryType === "entrega" && selectedMethod && (
              <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                <span>Frete</span>
                <span>{selectedMethod.isFree ? "Grátis" : `R$ ${shippingFee.toFixed(2)}`}</span>
              </div>
            )}
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-serif font-semibold text-foreground">
                R$ {(step === "checkout" ? grandTotal : subtotal).toFixed(2)}
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
                  className={`py-3 rounded-full border border-input text-sm font-medium hover:bg-muted transition-colors ${
                    isCredito ? "w-full" : "flex-1"
                  }`}
                >
                  Voltar
                </button>
                {/* Cartão é finalizado pelo próprio botão do Brick <CardPayment>, não por este botão */}
                {!isCredito && (
                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={!canSubmit}
                    className="btn-hero flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingOrder ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {isPix ? "Gerar Pix" : "WhatsApp"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
