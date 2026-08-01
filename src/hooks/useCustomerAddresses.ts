import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CustomerAddress } from "@/types/db";

export function useCustomerAddresses(customerId?: string) {
  return useQuery({
    queryKey: ["customer-addresses", customerId],
    enabled: !!customerId,
    queryFn: async (): Promise<CustomerAddress[]> => {
      const { data, error } = await supabase
        .from("customer_addresses")
        .select("*")
        .eq("customer_id", customerId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CustomerAddress[];
    },
  });
}

export function useCustomerAddressMutations(customerId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["customer-addresses", customerId] });

  const createAddress = useMutation({
    mutationFn: async (address: Omit<CustomerAddress, "id" | "customer_id" | "created_at" | "updated_at">) => {
      const { error } = await supabase.from("customer_addresses").insert({ ...address, customer_id: customerId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateAddress = useMutation({
    mutationFn: async ({ id, ...address }: Partial<CustomerAddress> & { id: string }) => {
      const { error } = await supabase.from("customer_addresses").update(address).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteAddress = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customer_addresses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { createAddress, updateAddress, deleteAddress };
}
