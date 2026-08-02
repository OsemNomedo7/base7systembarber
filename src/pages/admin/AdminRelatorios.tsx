/* Relatórios: vendas por período, faturamento, produtos mais vendidos, ticket médio,
 * vendas por forma de pagamento, vendas por entrega/retirada e clientes que mais compram */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Wallet, ClipboardList, Receipt, CalendarCheck, CalendarX, UserX, Scissors } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { useOrders } from "@/hooks/useOrders";
import { useAppointments } from "@/hooks/useAppointments";
import {
  aggregateSummary,
  aggregateSalesByPeriod,
  aggregateByPaymentMethod,
  aggregateByDeliveryType,
  aggregateTopProducts,
  aggregateTopCustomers,
} from "@/lib/salesReports";
import {
  aggregateAppointmentSummary,
  aggregateAppointmentsByPeriod,
  aggregateTopServices,
  aggregateProfessionalPerformance,
} from "@/lib/appointmentReports";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const periodConfig = {
  faturamento: { label: "Faturamento", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const appointmentPeriodConfig = {
  agendamentos: { label: "Agendamentos", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const paymentConfig = {
  pix: { label: "Pix", color: "hsl(var(--primary))" },
  credito: { label: "Cartão de Crédito", color: "hsl(36 80% 50%)" },
  debito: { label: "Cartão de Débito", color: "hsl(217 91% 60%)" },
} satisfies ChartConfig;

const deliveryConfig = {
  entrega: { label: "Entrega", color: "hsl(var(--primary))" },
  retirada: { label: "Retirada", color: "hsl(217 91% 60%)" },
} satisfies ChartConfig;

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

const AdminRelatorios = () => {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return toISODate(d);
  });
  const [dateTo, setDateTo] = useState(() => toISODate(new Date()));
  const [onlyPaid, setOnlyPaid] = useState(true);

  const applyPreset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    setDateFrom(toISODate(from));
    setDateTo(toISODate(to));
  };

  const applyThisMonth = () => {
    const now = new Date();
    setDateFrom(toISODate(new Date(now.getFullYear(), now.getMonth(), 1)));
    setDateTo(toISODate(now));
  };

  const { data: rawOrders = [], isLoading } = useOrders({
    dateFrom,
    dateTo,
    paymentStatus: onlyPaid ? "pago" : undefined,
  });

  // Em ambos os modos, pedido cancelado nunca conta como venda.
  const orders = useMemo(() => rawOrders.filter((o) => o.status !== "cancelado"), [rawOrders]);

  const summary = useMemo(() => aggregateSummary(orders), [orders]);
  const salesByPeriod = useMemo(() => aggregateSalesByPeriod(orders, dateFrom, dateTo), [orders, dateFrom, dateTo]);
  const byPaymentMethod = useMemo(() => aggregateByPaymentMethod(orders), [orders]);
  const byDeliveryType = useMemo(() => aggregateByDeliveryType(orders), [orders]);
  const topProducts = useMemo(() => aggregateTopProducts(orders), [orders]);
  const topCustomers = useMemo(() => aggregateTopCustomers(orders), [orders]);

  const { data: appointments = [], isLoading: isLoadingAppointments } = useAppointments({
    dateFrom,
    dateTo,
  });
  const appointmentSummary = useMemo(() => aggregateAppointmentSummary(appointments), [appointments]);
  const appointmentsByPeriod = useMemo(
    () => aggregateAppointmentsByPeriod(appointments, dateFrom, dateTo),
    [appointments, dateFrom, dateTo]
  );
  const topServices = useMemo(() => aggregateTopServices(appointments), [appointments]);
  const professionalPerformance = useMemo(() => aggregateProfessionalPerformance(appointments), [appointments]);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-semibold">Relatórios</h1>

      <div className="flex flex-wrap items-center gap-3">
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-40" />
        <span className="text-muted-foreground text-sm">até</span>
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-40" />

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => applyPreset(7)}>7 dias</Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset(30)}>30 dias</Button>
          <Button variant="outline" size="sm" onClick={applyThisMonth}>Este mês</Button>
        </div>

        <div className="flex gap-2 ml-auto">
          <Button variant={onlyPaid ? "default" : "outline"} size="sm" onClick={() => setOnlyPaid(true)}>
            Somente pagos
          </Button>
          <Button variant={!onlyPaid ? "default" : "outline"} size="sm" onClick={() => setOnlyPaid(false)}>
            Todos (exceto cancelados)
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : orders.length === 0 ? (
        <p className="text-muted-foreground text-sm py-12 text-center">
          Nenhum pedido encontrado no período selecionado.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento</CardTitle>
                <Wallet size={18} className="text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-serif font-semibold">R$ {summary.revenue.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Quantidade de pedidos</CardTitle>
                <ClipboardList size={18} className="text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-serif font-semibold">{summary.orderCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ticket médio</CardTitle>
                <Receipt size={18} className="text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-serif font-semibold">R$ {summary.avgTicket.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Vendas por período</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={periodConfig} className="aspect-auto h-64 w-full">
                <BarChart data={salesByPeriod}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="faturamento" fill="var(--color-faturamento)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Vendas por forma de pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={paymentConfig} className="aspect-auto h-56 w-full">
                  <BarChart data={byPaymentMethod} layout="vertical" margin={{ left: 16 }}>
                    <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} fontSize={12} width={120} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" radius={4}>
                      {byPaymentMethod.map((entry) => (
                        <Cell key={entry.method} fill={`var(--color-${entry.method})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Vendas por entrega/retirada</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={deliveryConfig} className="aspect-auto h-56 w-full">
                  <BarChart data={byDeliveryType} layout="vertical" margin={{ left: 16 }}>
                    <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} fontSize={12} width={80} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" radius={4}>
                      {byDeliveryType.map((entry) => (
                        <Cell key={entry.type} fill={`var(--color-${entry.type})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Produtos mais vendidos</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Qtd.</TableHead>
                      <TableHead>Faturamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.map((p) => (
                      <TableRow key={p.productId}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.quantity}</TableCell>
                        <TableCell>R$ {p.revenue.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {topProducts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                          Sem dados no período.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Clientes que mais compram</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Pedidos</TableHead>
                      <TableHead>Total gasto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCustomers.map((c) => (
                      <TableRow key={c.customerId ?? `${c.name}-${c.phone}`}>
                        <TableCell className="font-medium">
                          {c.customerId ? (
                            <Link to={`/admin/clientes/${c.customerId}`} className="hover:text-primary">
                              {c.name}
                            </Link>
                          ) : (
                            c.name
                          )}
                        </TableCell>
                        <TableCell>{c.orderCount}</TableCell>
                        <TableCell>R$ {c.total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {topCustomers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                          Sem dados no período.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <h2 className="font-serif text-xl font-semibold pt-4">Agendamentos</h2>

      {isLoadingAppointments ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : appointments.length === 0 ? (
        <p className="text-muted-foreground text-sm py-12 text-center">
          Nenhum agendamento encontrado no período selecionado.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento em serviços</CardTitle>
                <Wallet size={18} className="text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-serif font-semibold">R$ {appointmentSummary.revenue.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Atendimentos concluídos</CardTitle>
                <CalendarCheck size={18} className="text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-serif font-semibold">{appointmentSummary.concluded}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cancelados</CardTitle>
                <CalendarX size={18} className="text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-serif font-semibold">{appointmentSummary.cancelled}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Não compareceu</CardTitle>
                <UserX size={18} className="text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-serif font-semibold">{appointmentSummary.noShow}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Agendamentos por período</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={appointmentPeriodConfig} className="aspect-auto h-64 w-full">
                <BarChart data={appointmentsByPeriod}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="agendamentos" fill="var(--color-agendamentos)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Scissors size={16} className="text-primary" />
                <CardTitle className="text-base font-medium">Serviços mais realizados</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Qtd.</TableHead>
                      <TableHead>Faturamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topServices.map((s) => (
                      <TableRow key={s.serviceId}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.quantity}</TableCell>
                        <TableCell>R$ {s.revenue.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {topServices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                          Nenhum atendimento concluído no período.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Desempenho por profissional</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Atendimentos</TableHead>
                      <TableHead>Faturamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {professionalPerformance.map((p) => (
                      <TableRow key={p.professionalId}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.concludedCount}</TableCell>
                        <TableCell>R$ {p.revenue.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {professionalPerformance.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                          Nenhum atendimento concluído no período.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminRelatorios;
