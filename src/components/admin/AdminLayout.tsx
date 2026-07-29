/* Layout do painel admin - sidebar de navegação + área de conteúdo */
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  ClipboardList,
  FileText,
  BarChart3,
  MessageSquareText,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadChatCount } from "@/hooks/useAdminChat";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard, end: true },
  { label: "Produtos", path: "/admin/produtos", icon: ShoppingBag },
  { label: "Pedidos", path: "/admin/pedidos", icon: ClipboardList },
  { label: "Chat", path: "/admin/chat", icon: MessageSquareText },
  { label: "Conteúdo", path: "/admin/conteudo", icon: FileText },
  { label: "Métricas", path: "/admin/metricas", icon: BarChart3 },
];

const AdminLayout = () => {
  const { signOut } = useAuth();
  const unreadChatCount = useUnreadChatCount();

  return (
    <div className="min-h-screen flex bg-muted/20">
      <aside className="w-60 shrink-0 border-r border-border bg-background flex flex-col">
        <div className="flex items-center justify-center p-4 border-b border-border">
          <img src="/imagem/logo-base7web.png" alt="BASE7WEB System Moda" className="w-full max-w-[160px]" />
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
