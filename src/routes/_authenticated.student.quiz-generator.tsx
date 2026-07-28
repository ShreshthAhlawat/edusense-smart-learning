import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { generateQuiz } from "@/lib/ai.functions";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Sparkles, Wand2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/quiz-generator")({
  head: () => ({ meta: [
    { title: "Quiz Generator — EduSense" },
    { name: "description", content: "Generate your own AI quiz to practice any topic." },
    { property: "og:title", content: "Quiz Generator — EduSense" },
    { property: "og:description", content: "AI quiz on any topic, tuned to your class." },
  ] }),
  component: StudentQuizGenerator,
});

const SUBJECTS = ["Math", "Science", "English", "History", "Geography"];

function StudentQuizGenerator() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const runGen = useServerFn(generateQuiz);
  const [form, setForm] = useState({
    topic: "", subject: "Science", difficulty: "Medium",
    type: "mcq" as "mcq" | "written" | "mixed", count: 5, language: "English", classLevel: "Class 8",
  });
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!user) return;
    if (!form.topic.trim()) return toast.error("Enter a topic");
    setBusy(true);
    try {
      const { questions } = await runGen({ data: {
        topic: form.topic, subject: form.subject, classLevel: form.classLevel,
        difficulty: form.difficulty, type: form.type, count: form.count, language: form.language,
      }});
      // Store as a private practice quiz — teacher_id = self, so it's owned by the student.
      const { data, error } = await supabase.from("quizzes").insert({
        teacher_id: user.id,
        title: `${form.topic} · practice`,
        subject: form.subject,
        difficulty: form.difficulty,
        class_level: form.classLevel,
        language: form.language,
        questions,
      }).select("id").single();
      if (error) throw error;
      toast.success("Quiz ready — starting!");
      navigate({ to: "/student/quiz/$quizId", params: { quizId: data.id } });
    } catch (e: any) {
      toast.error(e.message ?? "Could not generate quiz");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardShell role="student" greeting="Quiz Generator">
      <PageHeader title="Generate a practice quiz" desc="Pick a topic — Gemini creates a quiz just for you. Your score saves to your progress dashboard." />
      <div className="max-w-xl glass rounded-2xl p-6 space-y-4">
        <div>
          <Label>Topic</Label>
          <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Photosynthesis" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Subject</Label>
            <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full mt-1 rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm">
              {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label>Class</Label>
            <select value={form.classLevel} onChange={(e) => setForm({ ...form, classLevel: e.target.value })} className="w-full mt-1 rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm">
              {["Class 5","Class 6","Class 7","Class 8","Class 9","Class 10","Class 11","Class 12"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label>Difficulty</Label>
            <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className="w-full mt-1 rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm">
              {["Easy","Medium","Hard"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label>Question type</Label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })} className="w-full mt-1 rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm">
              <option value="mcq">Multiple Choice</option>
              <option value="mixed">Mixed</option>
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">Auto-scored quizzes use MCQ.</p>
          </div>
          <div>
            <Label>No. of questions</Label>
            <Input type="number" min={3} max={20} value={form.count} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Language</Label>
            <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="w-full mt-1 rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm">
              {["English","Hindi","Spanish","French"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <Button onClick={create} disabled={busy} className="w-full glow" style={{ background: "var(--gradient-primary)" }}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating…</> : <><Wand2 className="h-4 w-4 mr-2" /> Generate & start quiz</>}
        </Button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Your results save to your dashboard just like Quiz Practice.
        </div>
      </div>
    </DashboardShell>
  );
}
