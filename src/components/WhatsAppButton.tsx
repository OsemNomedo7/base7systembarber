/* Botão flutuante do WhatsApp */
import { MessageCircle } from "lucide-react";
import { useWhatsappNumber } from "@/hooks/useWhatsappNumber";

const WhatsAppButton = () => {
  const whatsappNumber = useWhatsappNumber();

  return (
    <a
      href={`https://wa.me/${whatsappNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#25D366] text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300 animate-float"
      aria-label="WhatsApp"
    >
      <MessageCircle size={28} />
    </a>
  );
};

export default WhatsAppButton;
