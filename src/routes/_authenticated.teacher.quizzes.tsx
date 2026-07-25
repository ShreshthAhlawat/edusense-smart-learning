import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Link as LinkIcon, Loader2, FileQuestion } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teacher/quizzes")({
  head: () => ({ meta: [
    { title: "Quiz Generator — EduSense" },
    { name: "description", content: "Create shareable quizzes for your students in seconds." },
    { property: "og:title", content: "Quiz Generator — EduSense" },
    { property: "og:description", content: "Create shareable quizzes for your students in seconds." },
  ] }),
  component: QuizGenerator,
});

const SUBTOPICS: Record<string, string[]> = {
  Math: ["Algebra", "Geometry", "Fractions", "Word Problems"],
  Science: ["Physics", "Chemistry", "Biology", "Earth Science"],
  English: ["Grammar", "Vocabulary", "Reading", "Writing"],
  History: ["Ancient", "Modern", "Geography", "Civics"],
};

function generateQuestions(topic: string, subject: string, n: number) {
  const subs = SUBTOPICS[subject] ?? ["General"];
  return Array.from({ length: n }, (_, i) => {
    const sub = subs[i % subs.length];
    const correct = i % 4;
    return {
      question: `${topic} — Question ${i + 1}: Which option best relates to ${sub}?`,
      options: [`Option A`, `Option B`, `Option C`, `Option D`],
      correct,
      subtopic: sub,
    };
  });
}

function QuizGenerator() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    topic: "", class_level: "Class 8", difficulty: "Medium",
    subject: "Math", type: "MCQ", count: 5, language: "English",
  });
  const [creating, setCreating] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);

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
    const questions = generateQuestions(form.topic, form.subject, form.count);
    const { data, error } = await supabase.from("quizzes").insert({
      teacher_id: user!.id,
      title: `${form.topic} · ${form.class_level}`,
      subject: form.subject,
      difficulty: form.difficulty,
      class_level: form.class_level,
      language: form.language,
      questions,
    }).select("id").single();
    setCreating(false);
    if (error) return toast.error(error.message);
    const link = `${window.location.origin}/student/quiz/${data.id}`;
    setLastLink(link);
    toast.success("Quiz created!");
    list.refetch();
  };

  return (
    <DashboardShell role="teacher" greeting="Quiz Generator">
      <PageHeader title="Create a quiz" desc="Set your parameters — we'll build the quiz and give you a shareable link." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6 space-y-4">
          <Field label="Topic"><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Photosynthesis" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Subject"><Select value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} opts={Object.keys(SUBTOPICS)} /></Field>
            <Field label="Class"><Select value={form.class_level} onChange={(v) => setForm({ ...form, class_level: v })} opts={["Class 5","Class 6","Class 7","Class 8","Class 9","Class 10","Class 11","Class 12"]} /></Field>
            <Field label="Difficulty"><Select value={form.difficulty} onChange={(v) => setForm({ ...form, difficulty: v })} opts={["Easy","Medium","Hard"]} /></Field>
            <Field label="Question Type"><Select value={form.type} onChange={(v) => setForm({ ...form, type: v })} opts={["MCQ","True/False","Short Answer"]} /></Field>
            <Field label="No. of Questions"><Input type="number" min={3} max={20} value={form.count} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })} /></Field>
            <Field label="Language"><Select value={form.language} onChange={(v) => setForm({ ...form, language: v })} opts={["English","Hindi","Spanish","French"]} /></Field>
          </div>
          <Button onClick={create} disabled={creating} className="w-full glow" style={{ background: "var(--gradient-primary)" }}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Quiz"}
          </Button>
          {lastLink && (
            <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-primary" />
              <div className="flex-1 truncate text-xs">{lastLink}</div>
              <button className="text-xs text-primary" onClick={() => { navigator.clipboard.writeText(lastLink); toast.success("Copied"); }}>
                <Copy className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><FileQuestion className="h-4 w-4" /> Your quizzes</h2>
          {list.data && list.data.length > 0 ? (
            <ul className="space-y-2">
              {list.data.map((q: any) => (
                <li key={q.id} className="rounded-lg bg-secondary/40 border border-border p-3">
                  <div className="text-sm font-medium">{q.title}</div>
                  <div className="text-xs text-muted-foreground">{q.subject} · {q.questions.length} questions</div>
                  <a href={`/student/quiz/${q.id}`} className="mt-1 inline-block text-xs text-primary hover:underline">Open shareable link →</a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No quizzes yet. Create your first one on the left.</p>
          )}
        </div>
      </div>
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
