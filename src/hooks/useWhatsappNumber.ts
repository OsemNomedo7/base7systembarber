import { useSiteContent } from "@/hooks/useSiteContent";
import { WHATSAPP_NUMBER as DEFAULT_WHATSAPP_NUMBER } from "@/lib/whatsapp";

export function useWhatsappNumber() {
  const { data } = useSiteContent<string>("whatsapp_number");
  return data ?? DEFAULT_WHATSAPP_NUMBER;
}
