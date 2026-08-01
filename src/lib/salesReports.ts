import type { Order } from "@/types/db";

export interface SalesSummary {
  revenue: number;
  orderCount: number;
  avgTicket: number;
}

export function aggregateSummary(orders: Order[]): SalesSummary {
  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const orderCount = orders.length;
  const avgTicket = orderCount > 0 ? revenue / orderCount : 0;
  return { revenue, orderCount, avgTicket };
}

export interface PeriodPoint {
  label: string;
  faturamento: number;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/* Granularidade adaptativa: por dia se o intervalo for curto, por mês se for longo,
 * pra o gráfico não ficar ilegível com dezenas/centenas de barras. */
export function aggregateSalesByPeriod(orders: Order[], dateFrom?: string, dateTo?: string): PeriodPoint[] {
  const byMonth = (() => {
    if (!dateFrom || !dateTo) return false;
    const days = (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / MS_PER_DAY;
    return days > 62;
  })();

  const buckets = new Map<string, number>();
  for (const order of orders) {
    const date = new Date(order.created_at);
    const key = byMonth
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      : date.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + order.total);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, faturamento]) => ({ label, faturamento }));
}

export interface PaymentMethodPoint {
  method: string;
  label: string;
  total: number;
  count: number;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "Pix",
  credito: "Cartão de Crédito",
  debito: "Cartão de Débito",
};

export function aggregateByPaymentMethod(orders: Order[]): PaymentMethodPoint[] {
  const buckets = new Map<string, { total: number; count: number }>();
  for (const order of orders) {
    const entry = buckets.get(order.payment_method) ?? { total: 0, count: 0 };
    entry.total += order.total;
    entry.count += 1;
    buckets.set(order.payment_method, entry);
  }
  return Array.from(buckets.entries()).map(([method, { total, count }]) => ({
    method,
    label: PAYMENT_METHOD_LABELS[method] ?? method,
    total,
    count,
  }));
}

export interface DeliveryTypePoint {
  type: string;
  label: string;
  total: number;
  count: number;
}

const DELIVERY_TYPE_LABELS: Record<string, string> = {
  entrega: "Entrega",
  retirada: "Retirada",
};

export function aggregateByDeliveryType(orders: Order[]): DeliveryTypePoint[] {
  const buckets = new Map<string, { total: number; count: number }>();
  for (const order of orders) {
    const entry = buckets.get(order.delivery_type) ?? { total: 0, count: 0 };
    entry.total += order.total;
    entry.count += 1;
    buckets.set(order.delivery_type, entry);
  }
  return Array.from(buckets.entries()).map(([type, { total, count }]) => ({
    type,
    label: DELIVERY_TYPE_LABELS[type] ?? type,
    total,
    count,
  }));
}

export interface TopProduct {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export function aggregateTopProducts(orders: Order[], limit = 10): TopProduct[] {
  const buckets = new Map<string, TopProduct>();
  for (const order of orders) {
    for (const item of order.items) {
      const entry = buckets.get(item.product_id) ?? {
        productId: item.product_id,
        name: item.name,
        quantity: 0,
        revenue: 0,
      };
      entry.quantity += item.quantity;
      entry.revenue += item.price * item.quantity;
      buckets.set(item.product_id, entry);
    }
  }
  return Array.from(buckets.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

export interface TopCustomer {
  customerId: string | null;
  name: string;
  phone: string;
  orderCount: number;
  total: number;
}

export function aggregateTopCustomers(orders: Order[], limit = 10): TopCustomer[] {
  const buckets = new Map<string, TopCustomer>();
  for (const order of orders) {
    // fallback por nome+telefone quando customer_id é null (pedidos sem cliente associado)
    const key = order.customer_id ?? `anon:${order.customer_name}:${order.customer_phone}`;
    const entry = buckets.get(key) ?? {
      customerId: order.customer_id,
      name: order.customer_name,
      phone: order.customer_phone,
      orderCount: 0,
      total: 0,
    };
    entry.orderCount += 1;
    entry.total += order.total;
    buckets.set(key, entry);
  }
  return Array.from(buckets.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
