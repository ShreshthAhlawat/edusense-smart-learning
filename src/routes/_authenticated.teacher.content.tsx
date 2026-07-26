import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { generateContent } from "@/lib/ai.functions";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { FileText, BookMarked, Sparkles, Loader2, Printer, Share2, Copy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teacher/content")({
  head: () => ({ meta: [
    { title: "Content Generator — EduSense" },
    { name: "description", content: "AI-generated notes, worksheets, and tests for teachers." },
    { property: "og:title", content: "Content Generator — EduSense" },
    { property: "og:description", content: "AI-generated notes, worksheets, and tests for teachers." },
  ] }),
  component: ContentGenerator,
});

const KINDS = [
  { key: "notes", label: "Lesson Notes", desc: "Comprehensive notes on any topic", icon: FileText },
  { key: "worksheet", label: "Worksheet", desc: "Printable practice worksheets", icon: Sparkles },
  { key: "test", label: "Test Questions", desc: "Formal test with answer key", icon: BookMarked },
] as const;

function ContentGenerator() {
  const { user } = useAuth();
  const runGen = useServerFn(generateContent);
  const [form, setForm] = useState({
    kind: "notes" as "notes" | "worksheet" | "test",
    topic: "", subject: "Science", class_level: "Class 8", language: "English",
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ id: string; title: string; markdown: string; link: string } | null>(null);

  const list = useQuery({
    queryKey: ["my-content", user?.id],
    queryFn: async () => (await supabase.from("teacher_content").select("id, title, kind, created_at").eq("teacher_id", user!.id).order("created_at", { ascending: false })).data ?? [],
    enabled: !!user,
  });

  const generate = async () => {
    if (!form.topic.trim()) return toast.error("Enter a topic");
    setBusy(true);
    try {
      const { markdown } = await runGen({ data: {
        kind: form.kind, topic: form.topic, classLevel: form.class_level, language: form.language, subject: form.subject,
      }});
      const title = `${KINDS.find((k) => k.key === form.kind)!.label}: ${form.topic}`;
      const { data, error } = await supabase.from("teacher_content").insert({
        teacher_id: user!.id, kind: form.kind, title, topic: form.topic,
        class_level: form.class_level, language: form.language, content_markdown: markdown,
      }).select("id").single();
      if (error) throw error;
      const link = `${window.location.origin}/content/${data.id}`;
      setResult({ id: data.id, title, markdown, link });
      toast.success("Content ready!");
      list.refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const openSaved = async (id: string) => {
    const { data } = await supabase.from("teacher_content").select("*").eq("id", id).maybeSingle();
    if (data) setResult({ id: data.id, title: data.title, markdown: data.content_markdown, link: `${window.location.origin}/content/${data.id}` });
  };

  return (
    <DashboardShell role="teacher" greeting="Content Generator">
      <PageHeader title="Generate teaching content" desc="AI-crafted notes, worksheets, and tests — instantly printable and shareable." />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 no-print">
            <div className="grid grid-cols-3 gap-3">
              {KINDS.map((k) => (
                <button key={k.key} onClick={() => setForm({ ...form, kind: k.key })}
                  className={"rounded-xl p-4 text-left border transition-all " + (form.kind === k.key ? "border-primary bg-primary/20 glow" : "border-border bg-secondary/40 hover:bg-secondary")}>
                  <k.icon className="h-5 w-5 text-primary mb-2" />
                  <div className="text-sm font-medium">{k.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{k.desc}</div>
                </button>
              ))}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Topic"><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. The Water Cycle" /></Field>
              <Field label="Subject"><SelectEl value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} opts={["Math","Science","English","History","Geography"]} /></Field>
              <Field label="Class"><SelectEl value={form.class_level} onChange={(v) => setForm({ ...form, class_level: v })} opts={["Class 5","Class 6","Class 7","Class 8","Class 9","Class 10","Class 11","Class 12"]} /></Field>
              <Field label="Language"><SelectEl value={form.language} onChange={(v) => setForm({ ...form, language: v })} opts={["English","Hindi","Spanish","French"]} /></Field>
            </div>
            <Button onClick={generate} disabled={busy} className="mt-5 w-full glow" style={{ background: "var(--gradient-primary)" }}>
              {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating…</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate</>}
            </Button>
          </div>

          {result && (
            <div className="glass rounded-2xl p-6 print-area">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
                <div className="text-sm text-muted-foreground truncate max-w-md">{result.link}</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(result.link); toast.success("Copied"); }}><Copy className="h-4 w-4 mr-1" /> Copy</Button>
                  <Button size="sm" variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
                  <Button size="sm" onClick={() => { navigator.clipboard.writeText(result.link); toast.success("Share link copied!"); }} style={{ background: "var(--gradient-primary)" }} className="glow"><Share2 className="h-4 w-4 mr-1" /> Share</Button>
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-4">{result.title}</h2>
              <article className="prose prose-invert max-w-none prose-headings:text-foreground prose-strong:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90">
                <ReactMarkdown>{result.markdown}</ReactMarkdown>
              </article>
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-5 h-fit no-print">
          <h3 className="text-sm font-semibold mb-3">Recent content</h3>
          {list.data && list.data.length ? (
            <ul className="space-y-2">
              {list.data.slice(0, 15).map((c: any) => (
                <li key={c.id}>
                  <button onClick={() => openSaved(c.id)} className="w-full text-left rounded-lg p-2 hover:bg-secondary transition-colors">
                    <div className="text-xs font-medium truncate">{c.title}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">{c.kind}</div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Your generated content will appear here.</p>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs">{label}</Label><div className="mt-1">{children}</div></div>;
}

function SelectEl({ value, onChange, opts }: { value: string; onChange: (v: string) => void; opts: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm">
      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
