/* Layout do painel admin - sidebar de navegação + área de conteúdo.
 * No mobile (<768px) a sidebar vira um drawer (menu hambúrguer), já que uma
 * barbearia real é gerenciada do celular boa parte do tempo (confirmar
 * agendamento, ver a agenda do dia etc.) - ver seção "melhorias mobile". */
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Scissors,
  UserCog,
  ShoppingBag,
  Package,
  ClipboardList,
  Users,
  Truck,
  TrendingUp,
  Wallet,
  FileText,
  Receipt,
  BarChart3,
  MessageSquareText,
  Star,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadChatCount } from "@/hooks/useAdminChat";
import { useAdminReviews } from "@/hooks/useProductReviews";
import { useAdminTestimonials } from "@/hooks/useTestimonials";
import { Button } from "@/components/ui/button";
import BrandWordmark from "@/components/BrandWordmark";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard, end: true },
  { label: "Agenda", path: "/admin/agenda", icon: CalendarDays },
  { label: "Serviços", path: "/admin/servicos", icon: Scissors },
  { label: "Profissionais", path: "/admin/profissionais", icon: UserCog },
  { label: "Produtos", path: "/admin/produtos", icon: ShoppingBag },
  { label: "Estoque", path: "/admin/estoque", icon: Package },
  { label: "Pedidos", path: "/admin/pedidos", icon: ClipboardList },
  { label: "Clientes", path: "/admin/clientes", icon: Users },
  { label: "Entregas", path: "/admin/entregas", icon: Truck },
  { label: "Relatórios", path: "/admin/relatorios", icon: TrendingUp },
  { label: "Pagamentos", path: "/admin/pagamentos", icon: Wallet },
  { label: "Fiscal", path: "/admin/fiscal", icon: Receipt },
  { label: "Avaliações", path: "/admin/avaliacoes", icon: Star },
  { label: "Chat", path: "/admin/chat", icon: MessageSquareText },
  { label: "Conteúdo", path: "/admin/conteudo", icon: FileText },
  { label: "Métricas", path: "/admin/metricas", icon: BarChart3 },
];

const AdminLayout = () => {
  const { signOut } = useAuth();
  const unreadChatCount = useUnreadChatCount();
  const { data: reviews = [] } = useAdminReviews();
  const { data: testimonials = [] } = useAdminTestimonials();
  const pendingReviewsCount =
    reviews.filter((r) => r.status === "pendente").length +
    testimonials.filter((t) => t.status === "pendente").length;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  /* Fecha o drawer sempre que a rota muda (navegar por um item do menu, ou
   * usar voltar/avançar do navegador) - sem isso, ele ficaria aberto por
   * cima da página seguinte no mobile. */
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex bg-muted/20">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "w-60 shrink-0 border-r border-border bg-background flex flex-col",
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between gap-2 p-4 border-b border-border">
          <BrandWordmark className="text-xl" />
          <button
            className="md:hidden p-1 text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ label, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <Icon size={16} />
              {label}
              {label === "Chat" && unreadChatCount > 0 && (
                <span className="ml-auto min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-semibold">
                  {unreadChatCount}
                </span>
              )}
              {label === "Avaliações" && pendingReviewsCount > 0 && (
                <span className="ml-auto min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-semibold">
                  {pendingReviewsCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={signOut}>
            <LogOut size={16} />
            Sair
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-background sticky top-0 z-30 shrink-0">
          <BrandWordmark className="text-lg" />
          <button
            className="p-1.5 text-foreground"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
        </div>
        <main className="flex-1 relative overflow-y-auto">
          <div className="relative p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
