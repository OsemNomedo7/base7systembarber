/* Layout das páginas públicas - header/footer/whatsapp fixos + tracking de visita */
import { Outlet } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import ChatWidget from "@/components/ChatWidget";
import { usePageView } from "@/hooks/usePageView";

const PublicLayout = () => {
  usePageView();

  return (
    <>
      <Header />
      <Outlet />
      <Footer />
      <WhatsAppButton />
      <ChatWidget />
    </>
  );
};

export default PublicLayout;
