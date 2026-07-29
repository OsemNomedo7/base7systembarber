/* Métricas simples - visitas por dia e produtos mais vistos (últimos 14 dias) */
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useAnalyticsEvents, aggregateVisitsByDay, aggregateTopProducts } from "@/hooks/useAnalytics";
import { useProducts } from "@/hooks/useProducts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const visitsConfig = {
  visitas: { label: "Visitas", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const AdminMetricas = () => {
  const { data: events = [], isLoading } = useAnalyticsEvents();
  const { data: products = [] } = useProducts(false);

  const visitsByDay = aggregateVisitsByDay(events);
  const topProducts = aggregateTopProducts(events).map(([productId, count]) => ({
    name: products.find((p) => p.id === productId)?.name ?? "Produto removido",
    visualizacoes: count,
  }));

  const totalVisits = visitsByDay.reduce((sum, d) => sum + d.visitas, 0);

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Carregando...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-semibold">Métricas</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Visitas nos últimos 14 dias <span className="text-muted-foreground font-normal">({totalVisits} total)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={visitsConfig} className="aspect-auto h-64 w-full">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Produtos mais vistos</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center">
              Ainda não há visualizações de produtos registradas.
            </p>
          ) : (
            <ChartContainer config={visitsConfig} className="aspect-auto h-64 w-full">
              <BarChart data={topProducts} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  width={160}
                  tickFormatter={(value: string) => (value.length > 22 ? `${value.slice(0, 22)}…` : value)}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="visualizacoes" fill="hsl(var(--primary))" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMetricas;
