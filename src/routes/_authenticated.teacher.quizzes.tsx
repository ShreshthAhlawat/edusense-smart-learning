import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { generateQuiz } from "@/lib/ai.functions";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShareWithTeam } from "@/components/ShareWithTeam";
import { MathText } from "@/components/Markdown";
import { Copy, Link as LinkIcon, Loader2, FileQuestion, Printer, Share2, Sparkles } from "lucide-react";
import { PrintDocHeader, PrintDocFooter, CopyTextButton } from "@/components/PrintDoc";


export const Route = createFileRoute("/_authenticated/teacher/quizzes")({
  head: () => ({ meta: [
    { title: "Quiz Generator — EduSense" },
    { name: "description", content: "Create AI-generated shareable quizzes for your students in seconds." },
    { property: "og:title", content: "Quiz Generator — EduSense" },
    { property: "og:description", content: "Create AI-generated shareable quizzes for your students in seconds." },
  ] }),
  component: QuizGenerator,
});

const SUBJECTS = ["Math", "Science", "English", "History"];

function QuizGenerator() {
  const { user } = useAuth();
  const runGen = useServerFn(generateQuiz);
  const [form, setForm] = useState({
    topic: "", class_level: "Class 8", difficulty: "Medium",
    subject: "Math", type: "MCQ", count: 5, language: "English",
  });
  const [creating, setCreating] = useState(false);
  const [lastQuiz, setLastQuiz] = useState<{ id: string; title: string; questions: any[]; link: string } | null>(null);

  const list = useQuery({
    queryKey: ["my-quizzes", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("quizzes").select("*").eq("teacher_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const create = async () => {
    if (!form.topic.trim()) return toast.error("Enter a topic");
    setCreating(true);
    try {
      const { questions } = await runGen({ data: {
        topic: form.topic, subject: form.subject, classLevel: form.class_level,
        difficulty: form.difficulty, type: form.type, count: form.count, language: form.language,
      }});
      const { data, error } = await supabase.from("quizzes").insert({
        teacher_id: user!.id,
        title: `${form.topic} · ${form.class_level}`,
        subject: form.subject,
        difficulty: form.difficulty,
        class_level: form.class_level,
        language: form.language,
        questions,
      }).select("id, title").single();
      if (error) throw error;
      const link = `${window.location.origin}/student/quiz/${data.id}`;
      setLastQuiz({ id: data.id, title: data.title, questions, link });
      toast.success("Quiz generated!");
      list.refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to generate quiz");
    } finally {
      setCreating(false);
    }
  };

  const share = async () => {
    if (!lastQuiz) return;
    await navigator.clipboard.writeText(lastQuiz.link);
    toast.success("Link copied to clipboard!");
  };

  return (
    <DashboardShell role="teacher" greeting="Quiz Generator">
      <PageHeader title="Create a quiz with AI" desc="Set your parameters — Gemini generates real questions and gives you a shareable link." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6 space-y-4 no-print">
          <Field label="Topic"><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Photosynthesis" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Subject"><Select value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} opts={SUBJECTS} /></Field>
            <Field label="Class"><Select value={form.class_level} onChange={(v) => setForm({ ...form, class_level: v })} opts={["Class 5","Class 6","Class 7","Class 8","Class 9","Class 10","Class 11","Class 12"]} /></Field>
            <Field label="Difficulty"><Select value={form.difficulty} onChange={(v) => setForm({ ...form, difficulty: v })} opts={["Easy","Medium","Hard"]} /></Field>
            <Field label="Question Type"><Select value={form.type} onChange={(v) => setForm({ ...form, type: v })} opts={["MCQ","True/False","Short Answer"]} /></Field>
            <Field label="No. of Questions"><Input type="number" min={3} max={20} value={form.count} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })} /></Field>
            <Field label="Language"><Select value={form.language} onChange={(v) => setForm({ ...form, language: v })} opts={["English","Hindi","Spanish","French"]} /></Field>
          </div>
          <Button onClick={create} disabled={creating} className="w-full glow" style={{ background: "var(--gradient-primary)" }}>
            {creating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating with AI…</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate Quiz</>}
          </Button>
        </div>

        <div className="glass rounded-2xl p-6 no-print">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><FileQuestion className="h-4 w-4" /> Your quizzes</h2>
          {list.data && list.data.length > 0 ? (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {list.data.map((q: any) => (
                <li key={q.id} className="rounded-lg bg-secondary/40 border border-border p-3">
                  <div className="text-sm font-medium">{q.title}</div>
                  <div className="text-xs text-muted-foreground">{q.subject} · {q.questions.length} questions</div>
                  <div className="mt-1 flex items-center gap-3 text-xs">
                    <a href={`/student/quiz/${q.id}`} className="text-primary hover:underline">Open →</a>
                    <button className="text-muted-foreground hover:text-primary" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/student/quiz/${q.id}`); toast.success("Copied"); }}>
                      Copy link
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No quizzes yet. Create your first one on the left.</p>
          )}
        </div>
      </div>

      {lastQuiz && (
        <div className="mt-8 glass rounded-2xl p-6 print-area">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
            <div className="flex items-center gap-2 text-sm">
              <LinkIcon className="h-4 w-4 text-primary" />
              <span className="truncate max-w-md">{lastQuiz.link}</span>
              <button onClick={() => { navigator.clipboard.writeText(lastQuiz.link); toast.success("Copied"); }} className="text-muted-foreground hover:text-primary"><Copy className="h-4 w-4" /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              <CopyTextButton text={quizAsText(lastQuiz)} />
              <Button size="sm" variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print / Download</Button>
              <ShareWithTeam contentType="quiz" contentId={lastQuiz.id} />
              <Button size="sm" onClick={share} style={{ background: "var(--gradient-primary)" }} className="glow"><Share2 className="h-4 w-4 mr-1" /> Share</Button>
            </div>
          </div>
          <PrintDocHeader title={form.topic || lastQuiz.title} subtitle={`${form.class_level} · ${form.subject} · ${form.difficulty}`} />
          <h2 className="text-xl font-bold mb-4 no-print">{lastQuiz.title}</h2>
          <ol className="space-y-4 list-decimal pl-5">
            {lastQuiz.questions.map((q: any, i: number) => (
              <li key={i}>
                <div className="font-medium"><MathText>{q.question}</MathText></div>
                {q.options?.length ? (
                  <ul className="mt-2 space-y-1 text-sm">
                    {q.options.map((o: string, oi: number) => (
                      <li key={oi} className="flex items-start gap-2">
                        <span className="text-muted-foreground w-5">{String.fromCharCode(65 + oi)}.</span>
                        <span><MathText>{o}</MathText></span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-2 h-16 rounded-lg border border-dashed border-border" />
                )}
                <div className="mt-1 text-xs text-muted-foreground print-only">
                  {q.options?.length ? `Answer: ${String.fromCharCode(65 + q.correct)} · ` : ""}Subtopic: {q.subtopic}
                </div>
              </li>
            ))}
          </ol>

        </div>
      )}
    </DashboardShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs">{label}</Label><div className="mt-1">{children}</div></div>;
}

function Select({ value, onChange, opts }: { value: string; onChange: (v: string) => void; opts: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm">
      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
