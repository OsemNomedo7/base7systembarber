import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const DAYS = 14;

interface AnalyticsEventRow {
  event_type: "page_view" | "product_view";
  path: string | null;
  product_id: string | null;
  created_at: string;
}

export function useAnalyticsEvents() {
  return useQuery({
    queryKey: ["analytics_events", DAYS],
    queryFn: async (): Promise<AnalyticsEventRow[]> => {
      const since = new Date();
      since.setDate(since.getDate() - DAYS);
      const { data, error } = await supabase
        .from("analytics_events")
        .select("event_type, path, product_id, created_at")
        .gte("created_at", since.toISOString());
      if (error) throw error;
      return data as AnalyticsEventRow[];
    },
  });
}

export function aggregateVisitsByDay(events: AnalyticsEventRow[]) {
  const counts = new Map<string, number>();
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    counts.set(d.toISOString().slice(0, 10), 0);
  }
  for (const event of events) {
    if (event.event_type !== "page_view") continue;
    const day = event.created_at.slice(0, 10);
    if (counts.has(day)) counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([date, count]) => ({
    date: new Date(date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    visitas: count,
  }));
}

export function aggregateTopProducts(events: AnalyticsEventRow[]) {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.event_type !== "product_view" || !event.product_id) continue;
    counts.set(event.product_id, (counts.get(event.product_id) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}
