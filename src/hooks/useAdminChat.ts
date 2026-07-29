/* Conversas do admin: lista com não lidas, responder, marcar como lida */
import { useEffect, useId } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ChatConversation } from "@/types/chat";

export interface ChatConversationWithUnread extends ChatConversation {
  unreadCount: number;
}

export function useChatConversations() {
  const queryClient = useQueryClient();
  const instanceId = useId();
  const queryKey = ["chat", "conversations"];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<ChatConversationWithUnread[]> => {
      const { data: conversations, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;

      const { data: unread, error: unreadError } = await supabase
        .from("chat_messages")
        .select("conversation_id")
        .eq("sender", "visitor")
        .eq("is_read_by_admin", false);
      if (unreadError) throw unreadError;

      const counts = new Map<string, number>();
      for (const row of unread ?? []) {
        counts.set(row.conversation_id, (counts.get(row.conversation_id) ?? 0) + 1);
      }

      return (conversations as ChatConversation[]).map((c) => ({
        ...c,
        unreadCount: counts.get(c.id) ?? 0,
      }));
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`chat-admin-conversations-${instanceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
        queryClient.invalidateQueries({ queryKey });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, () => {
        queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, instanceId]);

  return query;
}

export function useSendAdminMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, body }: { conversationId: string; body: string }) => {
      const { error } = await supabase
        .from("chat_messages")
        .insert({ conversation_id: conversationId, sender: "admin", body, is_read_by_admin: true });
      if (error) throw error;
    },
    onSuccess: (_data, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("chat_messages")
        .update({ is_read_by_admin: true })
        .eq("conversation_id", conversationId)
        .eq("sender", "visitor")
        .eq("is_read_by_admin", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
    },
  });
}

export function useUnreadChatCount() {
  const queryClient = useQueryClient();
  const instanceId = useId();
  const queryKey = ["chat", "unread-count"];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("sender", "visitor")
        .eq("is_read_by_admin", false);
      if (error) throw error;
      return count ?? 0;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`chat-admin-unread-${instanceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
        queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, instanceId]);

  return query.data ?? 0;
}
