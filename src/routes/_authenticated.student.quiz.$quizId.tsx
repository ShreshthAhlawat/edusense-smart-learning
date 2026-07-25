import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/quiz/$quizId")({
  head: () => ({ meta: [
    { title: "Take Quiz — EduSense" },
    { name: "description", content: "Answer the quiz and see your subtopic breakdown." },
    { property: "og:title", content: "Take Quiz — EduSense" },
    { property: "og:description", content: "Answer the quiz and see your breakdown." },
  ] }),
  component: TakeQuiz,
});

type Question = { question: string; options: string[]; correct: number; subtopic: string };

function TakeQuiz() {
  const { quizId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<null | { score: number; breakdown: Record<string, { correct: number; total: number }>; weakest: string | null }>(null);

  const quiz = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: async () => (await supabase.from("quizzes").select("*").eq("id", quizId).maybeSingle()).data,
    enabled: !!user,
  });

  const questions = (quiz.data?.questions as Question[]) ?? [];
  const q = questions[idx];

  const submit = async () => {
    if (!quiz.data) return;
    setSubmitting(true);
    const breakdown: Record<string, { correct: number; total: number }> = {};
    let correct = 0;
    questions.forEach((qq, i) => {
      const b = (breakdown[qq.subtopic] ??= { correct: 0, total: 0 });
      b.total += 1;
      if (answers[i] === qq.correct) { b.correct += 1; correct += 1; }
    });
    const score = Math.round((correct / questions.length) * 100);
    const weakest = Object.entries(breakdown).sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))[0]?.[0] ?? null;

    const { error } = await supabase.from("quiz_attempts").insert({
      student_id: user!.id, quiz_id: quiz.data.id, subject: quiz.data.subject,
      score, correct_count: correct, total_count: questions.length, subtopic_breakdown: breakdown,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setResult({ score, breakdown, weakest });
  };

  if (quiz.isLoading) return <DashboardShell role="student"><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></DashboardShell>;
  if (!quiz.data) return <DashboardShell role="student"><PageHeader title="Quiz not found" /></DashboardShell>;

  if (result) return <ResultView result={result} onDone={() => navigate({ to: "/student/dashboard" })} />;

  return (
    <DashboardShell role="student" greeting={quiz.data.title}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>Question {idx + 1} of {questions.length}</span>
          <span>{Object.keys(answers).length} answered</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-6">
          <div className="h-full transition-all" style={{ width: `${((idx + 1) / questions.length) * 100}%`, background: "var(--gradient-primary)" }} />
        </div>
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold">{q.question}</h2>
          <div className="mt-5 space-y-2">
            {q.options.map((opt, i) => (
              <button key={i} onClick={() => setAnswers({ ...answers, [idx]: i })}
                className={"w-full text-left rounded-xl border px-4 py-3 text-sm transition-all " +
                  (answers[idx] === i ? "border-primary bg-primary/20" : "border-border bg-secondary/40 hover:bg-secondary")}>
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 flex justify-between">
          <Button variant="secondary" disabled={idx === 0} onClick={() => setIdx(idx - 1)}><ChevronLeft className="h-4 w-4" /> Back</Button>
          {idx < questions.length - 1 ? (
            <Button onClick={() => setIdx(idx + 1)} style={{ background: "var(--gradient-primary)" }} className="glow">Next <ChevronRight className="h-4 w-4" /></Button>
          ) : (
            <Button disabled={submitting || Object.keys(answers).length !== questions.length} onClick={submit} style={{ background: "var(--gradient-primary)" }} className="glow">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
            </Button>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

function ResultView({ result, onDone }: { result: NonNullable<ReturnType<typeof useState<any>>[0]> & any; onDone: () => void }) {
  const donut = [{ name: "Score", value: result.score }, { name: "Rest", value: 100 - result.score }];
  const colorFor = (pct: number) => pct >= 75 ? "oklch(0.75 0.18 155)" : pct >= 45 ? "oklch(0.78 0.17 80)" : "oklch(0.65 0.24 25)";

  return (
    <DashboardShell role="student" greeting="Your results">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="glass rounded-2xl p-6 flex items-center gap-6">
          <div className="h-40 w-40">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={donut} innerRadius={45} outerRadius={65} startAngle={90} endAngle={-270} dataKey="value">
                  <Cell fill="oklch(0.65 0.22 280)" />
                  <Cell fill="oklch(1 0 0 / 0.08)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Overall score</div>
            <div className="text-5xl font-bold">{result.score}%</div>
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-3">Subtopic breakdown</h3>
          <div className="space-y-3">
            {Object.entries(result.breakdown as Record<string, { correct: number; total: number }>).map(([sub, b]) => {
              const pct = Math.round((b.correct / b.total) * 100);
              return (
                <div key={sub}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{sub}</span><span className="text-muted-foreground">{b.correct}/{b.total} · {pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full" style={{ width: `${pct}%`, background: colorFor(pct) }} />
                  </div>
                </div>
              );
            })}
          </div>
          {result.weakest && (
            <p className="mt-4 text-sm text-primary">
              Tip: Focus on <strong>{result.weakest}</strong> next — a few extra practice questions here will boost your overall score.
            </p>
          )}
        </div>

        <Button onClick={onDone} style={{ background: "var(--gradient-primary)" }} className="glow">Back to dashboard</Button>
      </div>
    </DashboardShell>
  );
}
