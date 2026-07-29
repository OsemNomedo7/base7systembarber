/* Sessão anônima do visitante + a própria conversa + envio de mensagem */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ChatConversation } from "@/types/chat";

export function useVisitorSession() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      let session = data.session;

      if (!session) {
        const { data: signInData, error } = await supabase.auth.signInAnonymously();
        if (error) {
          if (active) setReady(true);
          return;
        }
        session = signInData.session;
      }

      if (active) {
        setUserId(session?.user.id ?? null);
        setReady(true);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { userId, ready };
}

export function useMyConversation(userId: string | null) {
  return useQuery({
    queryKey: ["chat", "conversation", userId],
    queryFn: async (): Promise<ChatConversation | null> => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("visitor_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as ChatConversation | null;
    },
    enabled: !!userId,
  });
}

export function useSendVisitorMessage(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      body,
      visitorName,
      conversationId,
    }: {
      body: string;
      visitorName?: string;
      conversationId?: string;
    }) => {
      if (!userId) throw new Error("Sessão do visitante não iniciada.");

      let convId = conversationId;
      if (!convId) {
        const { data, error } = await supabase
          .from("chat_conversations")
          .insert({ visitor_id: userId, visitor_name: visitorName || null })
          .select()
          .single();
        if (error) throw error;
        convId = data.id;
      }

      const { error: messageError } = await supabase
        .from("chat_messages")
        .insert({ conversation_id: convId, sender: "visitor", body });
      if (messageError) throw messageError;

      return convId;
    },
    onSuccess: (convId) => {
      queryClient.invalidateQueries({ queryKey: ["chat", "conversation", userId] });
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", convId] });
    },
  });
}
