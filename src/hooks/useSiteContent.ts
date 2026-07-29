import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useSiteContent<T>(key: string) {
  return useQuery({
    queryKey: ["site_content", key],
    queryFn: async (): Promise<T | null> => {
      const { data, error } = await supabase.from("site_content").select("value").eq("key", key).maybeSingle();
      if (error) throw error;
      return (data?.value as T) ?? null;
    },
  });
}

export function useUpdateSiteContent<T>(key: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (value: T) => {
      const { error } = await supabase.from("site_content").upsert({ key, value });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site_content", key] });
    },
  });
}
