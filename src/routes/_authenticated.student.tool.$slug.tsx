import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { chatWithTutor } from "@/lib/ai.functions";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { Lock, MessageSquare, FileText, BookMarked, Rocket, Compass, Glasses, Send, Loader2, Sparkles } from "lucide-react";

const TOOLS: Record<string, { title: string; desc: string; icon: any }> = {
  chatbot: { title: "AI Chatbot", desc: "Ask any doubt — get a friendly, curriculum-aware answer.", icon: MessageSquare },
  "pdf-summarizer": { title: "PDF Summarizer", desc: "Drop a PDF and get key concepts in seconds.", icon: FileText },
  "story-generator": { title: "Story Generator", desc: "Turn any concept into a memorable short story.", icon: BookMarked },
  "confidence-booster": { title: "Confidence Booster", desc: "Personalized encouragement based on your progress.", icon: Rocket },
  "topic-explainer": { title: "Topic Explainer", desc: "Get any concept explained at your level.", icon: Compass },
  "ar-learning": { title: "AR Learning", desc: "Immersive AR experiences for classroom concepts.", icon: Glasses },
};

export const Route = createFileRoute("/_authenticated/student/tool/$slug")({
  head: () => ({ meta: [
    { title: "AI Tool — EduSense" },
    { name: "description", content: "Premium AI learning tool." },
    { property: "og:title", content: "AI Tool — EduSense" },
    { property: "og:description", content: "Premium AI learning tool." },
  ] }),
  component: ToolPage,
});

function ToolPage() {
  const { slug } = Route.useParams();
  const { profile } = useAuth();
  const tool = TOOLS[slug];
  const unlocked = profile?.plan === "pro" || profile?.plan === "admin";

  if (!tool) return <DashboardShell role="student"><PageHeader title="Tool not found" /></DashboardShell>;
  const Icon = tool.icon;

  return (
    <DashboardShell role="student" greeting={tool.title}>
      <PageHeader title={tool.title} desc={tool.desc} />
      {!unlocked ? (
        <div className="glass rounded-2xl p-10 text-center max-w-lg mx-auto">
          <div className="mx-auto h-14 w-14 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <Lock className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">Upgrade to access</h2>
          <p className="mt-2 text-sm text-muted-foreground">This tool is part of the Pro plan. Upgrade to unlock {tool.title} and all premium tools.</p>
          <Link to="/student/plans" className="mt-6 inline-flex rounded-xl px-5 py-2.5 text-sm font-medium text-primary-foreground glow" style={{ background: "var(--gradient-primary)" }}>
            See plans
          </Link>
        </div>
      ) : slug === "chatbot" ? (
        <Chatbot />
      ) : (
        <div className="glass rounded-2xl p-10 text-center max-w-lg mx-auto">
          <div className="mx-auto h-14 w-14 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <Icon className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">{tool.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">You have access! This tool is being finalized — check back soon.</p>
        </div>
      )}
    </DashboardShell>
  );
}

type Msg = { role: "user" | "assistant"; content: string };

function Chatbot() {
  const runChat = useServerFn(chatWithTutor);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { reply } = await runChat({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (err: any) {
      setMessages([...next, { role: "assistant", content: `⚠️ ${err.message ?? "Something went wrong"}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="glass rounded-2xl flex flex-col h-[70vh]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="mx-auto h-14 w-14 rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--gradient-primary)" }}>
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Ask me anything</h3>
              <p className="text-sm text-muted-foreground mt-1">I can explain concepts, help with homework, or quiz you on a topic.</p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {["Explain photosynthesis simply", "Help me solve x² + 5x + 6 = 0", "Give me a quick history quiz"].map((s) => (
                  <button key={s} onClick={() => setInput(s)} className="text-xs rounded-full glass px-3 py-1.5 hover:bg-secondary transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={"flex " + (m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={"max-w-[85%] rounded-2xl px-4 py-2.5 text-sm " + (m.role === "user" ? "bg-primary/30 border border-primary/40" : "bg-secondary/60 border border-border")}>
                {m.role === "assistant" ? (
                  <article className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-headings:text-foreground prose-strong:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </article>
                ) : (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                )}
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
        <form onSubmit={send} className="border-t border-border p-3 flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your question…" disabled={busy} />
          <Button type="submit" disabled={busy || !input.trim()} style={{ background: "var(--gradient-primary)" }} className="glow">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
