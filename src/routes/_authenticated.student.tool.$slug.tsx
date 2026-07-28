import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { chatWithTutor, summarizeText, generateStory, explainTopic } from "@/lib/ai.functions";
import { DashboardShell, PageHeader, isPaidPlan } from "@/components/DashboardShell";
import { ConfidenceOrb } from "@/components/ConfidenceOrb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  Lock, MessageSquare, FileText, BookMarked, Rocket, Compass, Glasses, Send,
  Loader2, Sparkles, Copy, Upload,
} from "lucide-react";

const TOOLS: Record<string, { title: string; desc: string; icon: any }> = {
  chatbot: { title: "AI Chatbot", desc: "Ask any doubt — get a friendly, curriculum-aware answer.", icon: MessageSquare },
  "pdf-summarizer": { title: "PDF Summarizer", desc: "Drop a PDF and get key concepts in seconds.", icon: FileText },
  "story-generator": { title: "Story Generator", desc: "Turn any concept into a memorable short story.", icon: BookMarked },
  "confidence-booster": { title: "Confidence Booster", desc: "Realtime voice conversation with your AI coach.", icon: Rocket },
  "topic-explainer": { title: "Topic Explainer", desc: "Get any concept explained at your level.", icon: Compass },
  "ar-learning": { title: "VR / AR Learning", desc: "Immersive 3D experiences.", icon: Glasses },
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
  const unlocked = isPaidPlan(profile?.plan);

  if (!tool) return <DashboardShell role="student"><PageHeader title="Tool not found" /></DashboardShell>;
  if (slug === "ar-learning") {
    return (
      <DashboardShell role="student" greeting={tool.title}>
        <PageHeader title={tool.title} desc={tool.desc} />
        <div className="glass rounded-2xl p-10 text-center max-w-lg mx-auto">
          <Glasses className="h-6 w-6 text-primary mx-auto" />
          <p className="mt-4 text-sm">Explore interactive 3D models on the dedicated VR Learning page.</p>
          <Link to="/vr-learning" className="mt-6 inline-flex rounded-xl px-5 py-2.5 text-sm font-medium text-primary-foreground glow" style={{ background: "var(--gradient-primary)" }}>
            Open VR Learning
          </Link>
        </div>
      </DashboardShell>
    );
  }

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
          <p className="mt-2 text-sm text-muted-foreground">This tool is part of the Pro plan.</p>
          <Link to="/student/plans" className="mt-6 inline-flex rounded-xl px-5 py-2.5 text-sm font-medium text-primary-foreground glow" style={{ background: "var(--gradient-primary)" }}>
            See plans
          </Link>
        </div>
      ) : slug === "chatbot" ? <Chatbot />
        : slug === "pdf-summarizer" ? <PdfSummarizer />
        : slug === "story-generator" ? <StoryGen />
        : slug === "topic-explainer" ? <Explainer />
        : slug === "confidence-booster" ? <ConfidenceOrb />
        : (
          <div className="glass rounded-2xl p-10 text-center max-w-lg mx-auto">
            <Icon className="h-6 w-6 text-primary mx-auto" />
            <p className="mt-4 text-sm">You have access — this tool is being finalised.</p>
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
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, busy]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next); setInput(""); setBusy(true);
    try {
      const { reply } = await runChat({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (err: any) {
      setMessages([...next, { role: "assistant", content: `⚠️ ${err.message ?? "Something went wrong"}` }]);
    } finally { setBusy(false); }
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
                  <button key={s} onClick={() => setInput(s)} className="text-xs rounded-full glass px-3 py-1.5 hover:bg-secondary transition-colors">{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (<MessageBubble key={i} m={m} />))}
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
          <Button type="submit" disabled={busy || !input.trim()} style={{ background: "var(--gradient-primary)" }} className="glow"><Send className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ m }: { m: Msg }) {
  return (
    <div className={"flex " + (m.role === "user" ? "justify-end" : "justify-start")}>
      <div className={"max-w-[85%] rounded-2xl px-4 py-2.5 text-sm " + (m.role === "user" ? "bg-primary/30 border border-primary/40" : "bg-secondary/60 border border-border")}>
        {m.role === "assistant" ? (
          <article className="prose prose-sm max-w-none"><ReactMarkdown>{m.content}</ReactMarkdown></article>
        ) : (
          <div className="whitespace-pre-wrap">{m.content}</div>
        )}
      </div>
    </div>
  );
}

function PdfSummarizer() {
  const run = useServerFn(summarizeText);
  const [text, setText] = useState("");
  const [file, setFile] = useState<string>("");
  const [length, setLength] = useState<"short" | "detailed">("short");
  const [format, setFormat] = useState<"bullets" | "paragraph">("bullets");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  const onFile = async (f: File) => {
    setFile(f.name);
    if (f.type === "text/plain") { setText(await f.text()); return; }
    try {
      const pdfjs: any = await import(/* @vite-ignore */ "https://esm.sh/pdfjs-dist@4.7.76/build/pdf.mjs" as any);
      pdfjs.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.7.76/build/pdf.worker.mjs";
      const buf = await f.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      let out = "";
      for (let p = 1; p <= Math.min(pdf.numPages, 30); p++) {
        const page = await pdf.getPage(p);
        const c = await page.getTextContent();
        out += c.items.map((it: any) => it.str).join(" ") + "\n\n";
      }
      setText(out.slice(0, 120_000));
    } catch (e: any) {
      toast.error("Could not read PDF — paste text instead.");
    }
  };

  const go = async () => {
    if (!text.trim() || text.trim().length < 20) return toast.error("Please upload a PDF or paste enough text");
    setBusy(true);
    try {
      const { summary } = await run({ data: { text, length, format } });
      setSummary(summary);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2 max-w-6xl mx-auto">
      <div className="glass rounded-2xl p-6 space-y-4">
        <label className="block">
          <div className="text-sm font-medium mb-2">Upload a PDF or TXT</div>
          <div className="rounded-xl border-2 border-dashed border-border p-6 text-center cursor-pointer hover:bg-secondary/40 transition-colors">
            <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
            <div className="mt-2 text-sm">{file || "Click or drop file here"}</div>
            <input type="file" accept=".pdf,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </div>
        </label>
        <div>
          <div className="text-sm font-medium mb-2">…or paste text</div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className="w-full rounded-xl border border-input bg-secondary/40 px-3 py-2 text-sm" placeholder="Paste content here…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><div className="text-xs mb-1">Length</div>
            <select value={length} onChange={(e) => setLength(e.target.value as any)} className="w-full rounded-md bg-secondary/40 border border-input px-3 py-2 text-sm">
              <option value="short">Short</option><option value="detailed">Detailed</option>
            </select>
          </div>
          <div><div className="text-xs mb-1">Format</div>
            <select value={format} onChange={(e) => setFormat(e.target.value as any)} className="w-full rounded-md bg-secondary/40 border border-input px-3 py-2 text-sm">
              <option value="bullets">Bullets</option><option value="paragraph">Paragraph</option>
            </select>
          </div>
        </div>
        <Button onClick={go} disabled={busy} className="w-full glow" style={{ background: "var(--gradient-primary)" }}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Summarizing…</> : "Summarize"}
        </Button>
      </div>
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Summary</h3>
          {summary && <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(summary); toast.success("Copied"); }}><Copy className="h-4 w-4 mr-1" /> Copy</Button>}
        </div>
        {summary ? (
          <article className="prose prose-sm max-w-none"><ReactMarkdown>{summary}</ReactMarkdown></article>
        ) : (
          <p className="text-sm text-muted-foreground">Upload a document and hit "Summarize" to see key concepts here.</p>
        )}
      </div>
    </div>
  );
}

function StoryGen() {
  const run = useServerFn(generateStory);
  const [topic, setTopic] = useState("");
  const [story, setStory] = useState("");
  const [busy, setBusy] = useState(false);
  const [variant, setVariant] = useState(0);

  const generate = async (v: number) => {
    if (!topic.trim()) return toast.error("Enter a topic");
    setBusy(true);
    try {
      const { story } = await run({ data: { topic, variant: v } });
      setStory(story); setVariant(v);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="glass rounded-2xl p-6 flex gap-3">
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. how neurons communicate" />
        <Button onClick={() => generate(0)} disabled={busy} style={{ background: "var(--gradient-primary)" }} className="glow">
          {busy && variant === 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate story"}
        </Button>
      </div>
      {story && (
        <div className="glass rounded-2xl p-6">
          <article className="prose max-w-none"><ReactMarkdown>{story}</ReactMarkdown></article>
          <div className="mt-4 flex justify-between">
            <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(story); toast.success("Copied"); }}><Copy className="h-4 w-4 mr-1" /> Copy</Button>
            <Button size="sm" onClick={() => generate(variant + 1)} disabled={busy} style={{ background: "var(--gradient-primary)" }} className="glow">
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Generate another version
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Explainer() {
  const run = useServerFn(explainTopic);
  const [text, setText] = useState("");
  const [file, setFile] = useState("");
  const [language, setLanguage] = useState<"English" | "Hindi">("English");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);

  const onFile = async (f: File) => {
    setFile(f.name);
    if (f.type === "text/plain") { setText(await f.text()); return; }
    try {
      const pdfjs: any = await import(/* @vite-ignore */ "https://esm.sh/pdfjs-dist@4.7.76/build/pdf.mjs" as any);
      pdfjs.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.7.76/build/pdf.worker.mjs";
      const buf = await f.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      let s = "";
      for (let p = 1; p <= Math.min(pdf.numPages, 30); p++) {
        const c = await (await pdf.getPage(p)).getTextContent();
        s += c.items.map((it: any) => it.str).join(" ") + "\n\n";
      }
      setText(s.slice(0, 120_000));
    } catch { toast.error("Could not read PDF"); }
  };

  const go = async () => {
    if (!text.trim()) return toast.error("Add some text or upload a file");
    setBusy(true);
    try {
      const { explanation } = await run({ data: { text, language } });
      setOut(explanation);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2 max-w-6xl mx-auto">
      <div className="glass rounded-2xl p-6 space-y-4">
        <label className="block">
          <div className="text-sm font-medium mb-2">Upload PDF/TXT</div>
          <div className="rounded-xl border-2 border-dashed border-border p-6 text-center cursor-pointer hover:bg-secondary/40">
            <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
            <div className="mt-2 text-sm">{file || "Click or drop"}</div>
            <input type="file" accept=".pdf,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </div>
        </label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} placeholder="…or paste text" className="w-full rounded-xl border border-input bg-secondary/40 px-3 py-2 text-sm" />
        <div>
          <div className="text-xs mb-1">Language</div>
          <div className="flex gap-2">
            {(["English", "Hindi"] as const).map((l) => (
              <button key={l} onClick={() => setLanguage(l)} className={"rounded-full px-4 py-1.5 text-sm border " + (language === l ? "bg-primary/30 border-primary" : "border-border bg-secondary/40")}>{l}</button>
            ))}
          </div>
        </div>
        <Button onClick={go} disabled={busy} className="w-full glow" style={{ background: "var(--gradient-primary)" }}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Explaining…</> : "Explain"}
        </Button>
      </div>
      <div className="glass rounded-2xl p-6">
        <h3 className="font-semibold mb-3">Explanation</h3>
        {out ? <article className="prose prose-sm max-w-none"><ReactMarkdown>{out}</ReactMarkdown></article>
          : <p className="text-sm text-muted-foreground">Your conversational explanation will appear here.</p>}
      </div>
    </div>
  );
}
