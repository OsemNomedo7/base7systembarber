import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import PublicLayout from "@/components/PublicLayout";
import RequireAuth from "@/components/admin/RequireAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import Index from "./pages/Index";
import Loja from "./pages/Loja";
import Produto from "./pages/Produto";
import Sobre from "./pages/Sobre";
import Contato from "./pages/Contato";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProdutos from "./pages/admin/AdminProdutos";
import AdminProdutoForm from "./pages/admin/AdminProdutoForm";
import AdminPedidos from "./pages/admin/AdminPedidos";
import AdminChat from "./pages/admin/AdminChat";
import AdminConteudo from "./pages/admin/AdminConteudo";
import AdminMetricas from "./pages/admin/AdminMetricas";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/loja" element={<Loja />} />
                <Route path="/produto/:id" element={<Produto />} />
                <Route path="/sobre" element={<Sobre />} />
                <Route path="/contato" element={<Contato />} />
                <Route path="*" element={<NotFound />} />
              </Route>

              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={
                  <RequireAuth>
                    <AdminLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="produtos" element={<AdminProdutos />} />
                <Route path="produtos/novo" element={<AdminProdutoForm />} />
                <Route path="produtos/:id/editar" element={<AdminProdutoForm />} />
                <Route path="pedidos" element={<AdminPedidos />} />
                <Route path="chat" element={<AdminChat />} />
                <Route path="conteudo" element={<AdminConteudo />} />
                <Route path="metricas" element={<AdminMetricas />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
