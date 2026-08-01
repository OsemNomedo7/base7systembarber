import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Order, OrderStatus, PaymentStatus } from "@/types/db";

export interface OrderFilters {
  customerId?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  deliveryType?: "entrega" | "retirada";
  paymentMethod?: "pix" | "credito" | "debito";
  dateFrom?: string; // ISO date (yyyy-mm-dd)
  dateTo?: string; // ISO date (yyyy-mm-dd)
  search?: string; // número do pedido, nome ou telefone
}

export function useOrders(filters: OrderFilters = {}) {
  const { customerId, status, paymentStatus, deliveryType, paymentMethod, dateFrom, dateTo, search } = filters;
  return useQuery({
    queryKey: ["orders", filters],
    queryFn: async (): Promise<Order[]> => {
      let query = supabase.from("orders").select("*").order("created_at", { ascending: false });

      if (customerId) query = query.eq("customer_id", customerId);
      if (status) query = query.eq("status", status);
      if (paymentStatus) query = query.eq("payment_status", paymentStatus);
      if (deliveryType) query = query.eq("delivery_type", deliveryType);
      if (paymentMethod) query = query.eq("payment_method", paymentMethod);
      if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
      if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);

      if (search?.trim()) {
        const term = search.trim();
        const asNumber = Number(term.replace(/\D/g, ""));
        const orParts = [`customer_name.ilike.%${term}%`, `customer_phone.ilike.%${term}%`];
        if (!Number.isNaN(asNumber) && asNumber > 0) orParts.push(`order_number.eq.${asNumber}`);
        query = query.or(orParts.join(","));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Order[];
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useUpdateOrderPaymentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, paymentStatus }: { id: string; paymentStatus: PaymentStatus }) => {
      const { error } = await supabase.from("orders").update({ payment_status: paymentStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });
}
