/* Tipos do chat ao vivo (visitante <-> admin) */
export type ChatSender = "visitor" | "admin";
export type ChatConversationStatus = "aberto" | "fechado";

export interface ChatConversation {
  id: string;
  visitor_id: string;
  visitor_name: string | null;
  status: ChatConversationStatus;
  last_message_at: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender: ChatSender;
  body: string;
  is_read_by_admin: boolean;
  created_at: string;
}
