/* Layout do painel admin - sidebar de navegação + área de conteúdo */
import { NavLink, Outlet } from "react-router-dom";
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadChatCount } from "@/hooks/useAdminChat";
import { useAdminReviews } from "@/hooks/useProductReviews";
import { useAdminTestimonials } from "@/hooks/useTestimonials";
import { Button } from "@/components/ui/button";
import BrandWordmark from "@/components/BrandWordmark";

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

  return (
    <div className="min-h-screen flex bg-muted/20">
      <aside className="w-60 shrink-0 border-r border-border bg-background flex flex-col">
        <div className="flex items-center justify-center p-4 border-b border-border">
          <BrandWordmark className="text-xl" />
        </div>
        <nav className="flex-1 p-3 space-y-1">
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
      <main className="flex-1 relative overflow-y-auto">
        <div className="relative p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
