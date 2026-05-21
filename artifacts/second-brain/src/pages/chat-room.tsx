import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetConversation,
  useListConversations,
  getGetConversationQueryKey,
} from "@workspace/api-client-react";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, Bot, User } from "lucide-react";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ChatRoom() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const convId = parseInt(id);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<
    { id?: number; role: "user" | "assistant"; content: string; streaming?: boolean }[]
  >([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

  const { data: conversation, isLoading } = useGetConversation(convId, {
    query: {
      queryKey: getGetConversationQueryKey(convId),
      enabled: !!convId,
    },
  });

  useEffect(() => {
    if (conversation?.messages) {
      setMessages(
        conversation.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        }))
      );
    }
  }, [conversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || streaming) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setStreaming(true);

    const assistantIdx = messages.length + 1;
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", streaming: true },
    ]);

    try {
      const response = await fetch(`${BASE}/api/chat/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMsg }),
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.content) {
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === "assistant") {
                    next[next.length - 1] = { ...last, content: last.content + json.content };
                  }
                  return next;
                });
              }
              if (json.done) {
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === "assistant") {
                    next[next.length - 1] = { ...last, streaming: false };
                  }
                  return next;
                });
              }
            } catch {}
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: getGetConversationQueryKey(convId) });
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" });
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <ProtectedLayout>
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-4 px-6 py-4 border-b border-border flex-shrink-0">
          <Link href="/chat">
            <Button variant="ghost" size="icon" data-testid="button-back-to-chat">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <Skeleton className="h-5 w-48 bg-secondary" />
            ) : (
              <h1 className="font-semibold text-foreground truncate">{conversation?.title}</h1>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              AI assistant with access to your memories
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-3/4 bg-secondary" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="bg-primary/20 p-4 rounded-full mb-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Start a conversation
              </h3>
              <p className="text-muted-foreground max-w-sm">
                Ask anything. The AI has context about all your stored memories and can help you
                recall, connect, and reflect on them.
              </p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`message-${msg.role}-${i}`}
              >
                {msg.role === "assistant" && (
                  <div className="bg-primary/20 p-2 rounded-full h-fit flex-shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <Card
                  className={`max-w-[75%] px-4 py-3 rounded-2xl border-0 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-foreground rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                    {msg.streaming && (
                      <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse rounded-sm" />
                    )}
                  </p>
                </Card>
                {msg.role === "user" && (
                  <div className="bg-secondary p-2 rounded-full h-fit flex-shrink-0 mt-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-6 py-4 border-t border-border flex-shrink-0">
          <div className="flex gap-3 items-end max-w-4xl mx-auto">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your memories... (Enter to send, Shift+Enter for new line)"
              className="bg-secondary border-border resize-none min-h-[52px] max-h-[200px]"
              rows={1}
              disabled={streaming}
              data-testid="textarea-chat-input"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || streaming}
              size="icon"
              className="h-[52px] w-[52px] flex-shrink-0"
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </ProtectedLayout>
  );
}
