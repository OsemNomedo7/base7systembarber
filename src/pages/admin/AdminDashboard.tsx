/* Resumo rápido do admin - números básicos, faturamento e visitas */
import { Link } from "react-router-dom";
import { ClipboardList, ShoppingBag, Eye, Wallet, MessageSquareText, Star, CalendarClock } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useOrders } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";
import { useAppointments } from "@/hooks/useAppointments";
import { useAnalyticsEvents, aggregateVisitsByDay } from "@/hooks/useAnalytics";
import { useUnreadChatCount } from "@/hooks/useAdminChat";
import { useAdminReviews } from "@/hooks/useProductReviews";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const visitsConfig = {
  visitas: { label: "Visitas", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const AdminDashboard = () => {
  const { data: orders = [] } = useOrders();
  const { data: products = [] } = useProducts(false);
  const { data: events = [] } = useAnalyticsEvents();
  const unreadChatCount = useUnreadChatCount();
  const { data: reviews = [] } = useAdminReviews();
  const pendingReviewsCount = reviews.filter((r) => r.status === "pendente").length;
  const { data: upcomingAppointments = [] } = useAppointments({ dateFrom: new Date().toISOString().slice(0, 10) });

  const today = new Date().toISOString().slice(0, 10);
  const visitsToday = events.filter((e) => e.event_type === "page_view" && e.created_at.startsWith(today)).length;

  const activeAppointments = upcomingAppointments.filter(
    (a) => a.status !== "cancelado" && a.status !== "nao_compareceu"
  );
  const appointmentsToday = activeAppointments.filter((a) => a.starts_at.startsWith(today)).length;
  const nextAppointments = activeAppointments
    .filter((a) => new Date(a.starts_at) >= new Date())
    .slice(0, 5);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthlyRevenue = orders
    .filter((o) => o.status !== "cancelado" && new Date(o.created_at) >= monthStart)
    .reduce((sum, o) => sum + o.total, 0);

  const recentOrders = orders
    .filter((o) => o.status !== "cancelado")
    .slice(0, 5);

  const visitsByDay = aggregateVisitsByDay(events).slice(-7);

  const cards = [
    {
      label: "Agendamentos hoje",
      value: appointmentsToday,
      icon: CalendarClock,
      link: "/admin/agenda",
    },
    {
      label: "Pedidos novos",
      value: orders.filter((o) => o.status === "novo").length,
      icon: ClipboardList,
      link: "/admin/pedidos",
    },
    {
      label: "Produtos ativos",
      value: products.filter((p) => p.is_active).length,
      icon: ShoppingBag,
      link: "/admin/produtos",
    },
    {
      label: "Visitas hoje",
      value: visitsToday,
      icon: Eye,
      link: "/admin/metricas",
    },
    {
      label: "Faturamento do mês",
      value: `R$ ${monthlyRevenue.toFixed(2)}`,
      icon: Wallet,
      link: "/admin/pedidos",
    },
    {
      label: "Mensagens não lidas",
      value: unreadChatCount,
      icon: MessageSquareText,
      link: "/admin/chat",
    },
    {
      label: "Avaliações pendentes",
      value: pendingReviewsCount,
      icon: Star,
      link: "/admin/avaliacoes",
    },
  ];

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ label, value, icon: Icon, link }) => (
          <Link key={label} to={link}>
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon size={18} className="text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-serif font-semibold">{value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <CalendarClock size={18} className="text-primary" />
            <CardTitle className="text-base font-medium">Próximos agendamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {nextAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum agendamento futuro.</p>
            ) : (
              <div className="space-y-3">
                {nextAppointments.map((a) => (
                  <Link
                    key={a.id}
                    to="/admin/agenda"
                    className="flex items-center justify-between text-sm p-2 -mx-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium">{a.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.service_name} com {a.professional_name}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(a.starts_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <ClipboardList size={18} className="text-primary" />
            <CardTitle className="text-base font-medium">Pedidos recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum pedido ainda.</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((o) => (
                  <Link
                    key={o.id}
                    to="/admin/pedidos"
                    className="flex items-center justify-between text-sm p-2 -mx-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium">{o.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{o.items.length} item(ns)</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      R$ {o.total.toFixed(2)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Visitas nos últimos 7 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={visitsConfig} className="aspect-auto h-48 w-full">
              <BarChart data={visitsByDay}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} width={30} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="visitas" fill="var(--color-visitas)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
