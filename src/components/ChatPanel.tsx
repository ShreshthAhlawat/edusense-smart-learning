import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { chatWithTutor } from "@/lib/ai.functions";
import { getChatSessions, createChatSession, getChatMessages, saveChatMessage } from "@/lib/chat.functions";
import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send, Loader2, Sparkles, History, Plus, X, Trash2,
  MessageSquare, PanelRight,
} from "lucide-react";

export type Msg = { role: "user" | "assistant"; content: string };

export function ChatPanel({
  persona,
  heading,
  blurb,
  suggestions,
}: {
  persona: "student" | "teacher";
  heading: string;
  blurb: string;
  suggestions: string[];
}) {
  const runChat = useServerFn(chatWithTutor);
  const runGetSessions = useServerFn(getChatSessions);
  const runCreateSession = useServerFn(createChatSession);
  const runGetMessages = useServerFn(getChatMessages);
  const runSaveMessage = useServerFn(saveChatMessage);
  const qc = useQueryClient();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["chat-sessions", persona],
    queryFn: () => runGetSessions({ data: { persona } }),
  });
  const sessions = sessionsData?.sessions ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const ensureSession = async (firstMessageText?: string) => {
    if (sessionId) return sessionId;
    const title = firstMessageText
      ? firstMessageText.slice(0, 40) + (firstMessageText.length > 40 ? "…" : "")
      : "New chat";
    const { session } = await runCreateSession({ data: { title, persona } });
    setSessionId(session.id);
    qc.invalidateQueries({ queryKey: ["chat-sessions", persona] });
    return session.id;
  };

  const loadSession = async (sid: string) => {
    if (sid === sessionId) return;
    setBusy(true);
    setSessionId(sid);
    try {
      const { messages: rows } = await runGetMessages({ data: { sessionId: sid } });
      setMessages(rows.map((r) => ({ role: r.role as "user" | "assistant", content: r.content })));
    } finally {
      setBusy(false);
    }
    setSidebarOpen(false);
  };

  const startNewSession = async () => {
    setSessionId(null);
    setMessages([]);
    setSidebarOpen(false);
  };

  const send = async (e?: React.FormEvent, preset?: string) => {
    e?.preventDefault();
    const text = (preset ?? input).trim();
    if (!text || busy) return;

    setInput("");
    const sid = await ensureSession(text);

    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setBusy(true);

    try {
      await runSaveMessage({ data: { sessionId: sid, role: "user", content: text } });
      const { reply } = await runChat({ data: { messages: next, persona } });
      const assistantMsg: Msg = { role: "assistant", content: reply };
      setMessages([...next, assistantMsg]);
      await runSaveMessage({ data: { sessionId: sid, role: "assistant", content: reply } });
      qc.invalidateQueries({ queryKey: ["chat-sessions", persona] });
    } catch (err: any) {
      const errorMsg: Msg = { role: "assistant", content: `⚠️ ${err?.message ?? "Something went wrong"}` };
      setMessages([...next, errorMsg]);
      try {
        await runSaveMessage({ data: { sessionId: sid, role: "assistant", content: errorMsg.content } });
      } catch {}
    } finally {
      setBusy(false);
    }
  };

  const titleForSession = (s: { title: string }) => s.title || "Untitled chat";

  return (
    <div className="max-w-4xl mx-auto relative">
      <div className="glass rounded-2xl flex flex-col h-[70vh] relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-tight">{heading}</h3>
              <p className="text-xs text-muted-foreground">{blurb}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={startNewSession}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> New
            </button>
            <button
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
              aria-label="Open chat history"
            >
              <History className="h-3.5 w-3.5" /> History
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16 animate-in fade-in duration-500">
              <div className="mx-auto h-14 w-14 rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--gradient-primary)" }}>
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold">{heading}</h3>
              <p className="text-sm text-muted-foreground mt-1">{blurb}</p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => send(undefined, s)} className="text-xs rounded-full glass px-3 py-1.5 hover:bg-secondary transition-colors">{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={"flex " + (m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={"max-w-[85%] rounded-2xl px-4 py-2.5 text-sm " + (m.role === "user" ? "bg-primary/30 border border-primary/40" : "bg-secondary/60 border border-border")}>
                {m.role === "assistant" ? <Markdown>{m.content}</Markdown> : <div className="whitespace-pre-wrap">{m.content}</div>}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-2.5 bg-secondary/60 border border-border flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={send} className="border-t border-border p-3 flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your message…" disabled={busy} />
          <Button type="submit" disabled={busy || !input.trim()} style={{ background: "var(--gradient-primary)" }} className="glow">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Slide-over history sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSidebarOpen(false)}>
          <div
            className="h-full w-full max-w-sm glass-strong border-l border-border shadow-2xl p-4 flex flex-col animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <PanelRight className="h-4 w-4" /> Chat history
              </h3>
              <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 hover:bg-secondary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={startNewSession}
              className="mb-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-primary-foreground glow"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Plus className="h-4 w-4" /> Start new chat
            </button>
            <div className="flex-1 overflow-y-auto space-y-2">
              {sessionsLoading ? (
                <div className="text-sm text-muted-foreground text-center py-8">Loading…</div>
              ) : sessions.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No chats yet.
                </div>
              ) : (
                sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => loadSession(s.id)}
                    className={"w-full text-left rounded-xl border border-border px-3 py-3 transition-all hover:-translate-y-0.5 hover:shadow-md " + (sessionId === s.id ? "bg-primary/20 border-primary/40" : "bg-secondary/40 hover:bg-secondary")}
                  >
                    <div className="text-sm font-medium truncate">{titleForSession(s)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(s.updated_at).toLocaleDateString()} · {s.persona}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
