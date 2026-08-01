import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { DeliveryMethod, DeliveryMethodArea } from "@/types/db";

/* --- Admin: CRUD completo (inclusive métodos inativos) --- */

export function useDeliveryMethods() {
  return useQuery({
    queryKey: ["delivery-methods", "admin"],
    queryFn: async (): Promise<DeliveryMethod[]> => {
      const { data, error } = await supabase
        .from("delivery_methods")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as DeliveryMethod[];
    },
  });
}

export function useDeliveryMethod(id?: string) {
  return useQuery({
    queryKey: ["delivery-methods", "admin", id],
    enabled: !!id,
    queryFn: async (): Promise<DeliveryMethod | null> => {
      const { data, error } = await supabase.from("delivery_methods").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as DeliveryMethod | null;
    },
  });
}

export function useDeliveryMethodMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["delivery-methods"] });

  const createMethod = useMutation({
    mutationFn: async (method: Omit<DeliveryMethod, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase.from("delivery_methods").insert(method).select("id").single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: invalidate,
  });

  const updateMethod = useMutation({
    mutationFn: async ({ id, ...method }: Partial<DeliveryMethod> & { id: string }) => {
      const { error } = await supabase.from("delivery_methods").update(method).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setMethodActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("delivery_methods").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteMethod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("delivery_methods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { createMethod, updateMethod, setMethodActive, deleteMethod };
}

/* --- Admin: áreas atendidas de um método --- */

export function useDeliveryMethodAreas(methodId?: string) {
  return useQuery({
    queryKey: ["delivery-method-areas", methodId],
    enabled: !!methodId,
    queryFn: async (): Promise<DeliveryMethodArea[]> => {
      const { data, error } = await supabase
        .from("delivery_method_areas")
        .select("*")
        .eq("delivery_method_id", methodId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as DeliveryMethodArea[];
    },
  });
}

export function useDeliveryMethodAreaMutations(methodId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["delivery-method-areas", methodId] });

  const createArea = useMutation({
    mutationFn: async (
      area:
        | { city: string | null; state: string; zip_range_start?: never; zip_range_end?: never }
        | { city?: never; state?: never; zip_range_start: string; zip_range_end: string }
    ) => {
      const { error } = await supabase
        .from("delivery_method_areas")
        .insert({ ...area, delivery_method_id: methodId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteArea = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("delivery_method_areas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { createArea, deleteArea };
}

/* --- Storefront: métodos ativos + áreas, para o checkout calcular as opções de entrega.
 * Nunca lança exceção — se a consulta falhar, devolve listas vazias (a Retirada não
 * depende disso e deve continuar funcionando mesmo se isso quebrar). */

export interface PublicDeliveryData {
  methods: DeliveryMethod[];
  areasByMethod: Record<string, DeliveryMethodArea[]>;
}

export function usePublicDeliveryMethods() {
  return useQuery({
    queryKey: ["delivery-methods", "public"],
    staleTime: 60_000,
    retry: 1,
    queryFn: async (): Promise<PublicDeliveryData> => {
      const empty: PublicDeliveryData = { methods: [], areasByMethod: {} };
      const { data: methods, error: methodsError } = await supabase
        .from("delivery_methods")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (methodsError || !methods) return empty;

      const { data: areas, error: areasError } = await supabase.from("delivery_method_areas").select("*");
      if (areasError || !areas) return { methods: methods as DeliveryMethod[], areasByMethod: {} };

      const areasByMethod: Record<string, DeliveryMethodArea[]> = {};
      for (const area of areas as DeliveryMethodArea[]) {
        (areasByMethod[area.delivery_method_id] ??= []).push(area);
      }
      return { methods: methods as DeliveryMethod[], areasByMethod };
    },
  });
}
