import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Customer } from "@/types/db";

export interface CustomerFilters {
  search?: string; // casa com nome, telefone ou e-mail
  activeOnly?: boolean;
}

export function useCustomers(filters: CustomerFilters = {}) {
  const { search, activeOnly } = filters;
  return useQuery({
    queryKey: ["customers", filters],
    queryFn: async (): Promise<Customer[]> => {
      let query = supabase.from("customers").select("*").order("name", { ascending: true });
      if (activeOnly) query = query.eq("is_active", true);
      if (search?.trim()) {
        const term = search.trim();
        query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Customer[];
    },
  });
}

export function useCustomer(id?: string) {
  return useQuery({
    queryKey: ["customers", id],
    enabled: !!id,
    queryFn: async (): Promise<Customer | null> => {
      const { data, error } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Customer | null;
    },
  });
}

export function useCustomerMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["customers"] });

  const createCustomer = useMutation({
    mutationFn: async (customer: Omit<Customer, "id" | "created_at" | "updated_at">) => {
      const { error } = await supabase.from("customers").insert(customer);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateCustomer = useMutation({
    mutationFn: async ({ id, ...customer }: Partial<Customer> & { id: string }) => {
      const { error } = await supabase.from("customers").update(customer).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setCustomerActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("customers").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { createCustomer, updateCustomer, setCustomerActive, deleteCustomer };
}
