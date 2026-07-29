/* Chat ao vivo - lista de conversas + thread da conversa selecionada */
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { useChatConversations, useSendAdminMessage, useMarkConversationRead } from "@/hooks/useAdminChat";
import { useChatThread } from "@/hooks/useChatThread";
import { Badge } from "@/components/ui/badge";

const AdminChat = () => {
  const { data: conversations = [], isLoading } = useChatConversations();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const { data: messages = [] } = useChatThread(selectedId);
  const sendMessage = useSendAdminMessage();
  const markRead = useMarkConversationRead();
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!selectedId && conversations.length > 0) setSelectedId(conversations[0].id);
  }, [conversations, selectedId]);

  useEffect(() => {
    if (selectedId) markRead.mutate(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, messages.length]);

  const handleSelect = (id: string) => setSelectedId(id);

  const handleSend = () => {
    if (!draft.trim() || !selectedId) return;
    sendMessage.mutate({ conversationId: selectedId, body: draft.trim() }, { onSuccess: () => setDraft("") });
  };

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold mb-6">Chat</h1>
      <div className="grid grid-cols-[280px_1fr] gap-4 h-[calc(100vh-12rem)]">
        <div className="rounded-lg border border-border bg-background overflow-y-auto">
          {isLoading && <p className="p-4 text-sm text-muted-foreground">Carregando...</p>}
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleSelect(conv.id)}
              className={`w-full text-left p-4 border-b border-border transition-colors ${
                selectedId === conv.id ? "bg-primary/10" : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">{conv.visitor_name || "Visitante"}</span>
                {conv.unreadCount > 0 && <Badge>{conv.unreadCount}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(conv.last_message_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </p>
            </button>
          ))}
          {!isLoading && conversations.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground text-center">Nenhuma conversa ainda.</p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-background flex flex-col">
          {selected ? (
            <>
              <div className="p-4 border-b border-border">
                <p className="font-medium text-sm">{selected.visitor_name || "Visitante"}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                      m.sender === "admin"
                        ? "ml-auto bg-primary text-primary-foreground rounded-br-sm"
                        : "mr-auto bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    {m.body}
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  placeholder="Responder..."
                  className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim()}
                  className="w-9 h-9 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
                  aria-label="Enviar"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Selecione uma conversa
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminChat;
