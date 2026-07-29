/* Mensagens de uma conversa + assinatura realtime - compartilhado entre visitante e admin */
import { useEffect, useId } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ChatMessage } from "@/types/chat";

export function useChatThread(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  const instanceId = useId();
  const queryKey = ["chat", "messages", conversationId];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}-${instanceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          queryClient.setQueryData<ChatMessage[]>(queryKey, (prev = []) =>
            prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, queryClient, instanceId]);

  return query;
}
