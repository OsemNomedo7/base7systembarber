/* Botão flutuante de chat ao vivo (acima do WhatsApp) + painel de conversa */
import { useEffect, useRef, useState } from "react";
import { MessageSquareText, X, Send } from "lucide-react";
import { useVisitorSession, useMyConversation, useSendVisitorMessage } from "@/hooks/useVisitorChat";
import { useChatThread } from "@/hooks/useChatThread";

const ChatWidget = () => {
  const { userId } = useVisitorSession();
  const { data: conversation } = useMyConversation(userId);
  const conversationId = conversation?.id;
  const { data: messages = [] } = useChatThread(conversationId);
  const sendMessage = useSendVisitorMessage(userId);

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [draft, setDraft] = useState("");
  const [lastSeenAt, setLastSeenAt] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const lastAdminMessage = [...messages].reverse().find((m) => m.sender === "admin");
  const hasUnseenReply = !!lastAdminMessage && lastAdminMessage.created_at > lastSeenAt;

  useEffect(() => {
    if (isOpen) setLastSeenAt(new Date().toISOString());
  }, [isOpen, messages.length]);

  useEffect(() => {
    if (isOpen) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [isOpen, messages.length]);

  const handleSend = () => {
    if (!draft.trim() || !userId) return;
    sendMessage.mutate(
      { body: draft.trim(), visitorName: name.trim() || undefined, conversationId },
      { onSuccess: () => setDraft("") }
    );
  };

  return (
    <>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300"
        aria-label="Chat"
      >
        <MessageSquareText size={26} />
        {hasUnseenReply && !isOpen && (
          <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-destructive border-2 border-background" />
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-[9.5rem] right-6 z-50 w-80 max-h-[28rem] rounded-2xl bg-background border border-border shadow-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border bg-primary/5">
            <div>
              <p className="font-serif font-semibold text-sm">Fale conosco</p>
              <p className="text-xs text-muted-foreground">Respondemos assim que possível</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">
                Envie uma mensagem para iniciar a conversa.
              </p>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                  message.sender === "visitor"
                    ? "ml-auto bg-primary text-primary-foreground rounded-br-sm"
                    : "mr-auto bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                {message.body}
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-border space-y-2">
            {!conversationId && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome (opcional)"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            )}
            <div className="flex gap-2">
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
                placeholder="Digite sua mensagem..."
                className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={handleSend}
                disabled={!draft.trim() || sendMessage.isPending}
                className="w-9 h-9 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
                aria-label="Enviar"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
