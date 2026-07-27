import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { GlowBackground } from "@/components/GlowBackground";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/quiz/$quizId")({
  head: () => ({ meta: [
    { title: "Take Quiz — EduSense" },
    { name: "description", content: "Answer the quiz — no signup required." },
    { property: "og:title", content: "Take Quiz — EduSense" },
    { property: "og:description", content: "Answer the shared quiz." },
  ] }),
  component: PublicQuiz,
});

type Q = { type?: "mcq" | "written"; question: string; options: string[]; correct: number; subtopic: string; sample_answer?: string };

function PublicQuiz() {
  const { quizId } = Route.useParams();
  const { user } = useAuth();
  const [guestName, setGuestName] = useState("");
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({});
  const [writtenAnswers, setWrittenAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<null | { score: number; breakdown: Record<string, { correct: number; total: number }>; weakest: string | null }>(null);

  const quiz = useQuery({
    queryKey: ["public-quiz", quizId],
    queryFn: async () => (await supabase.from("quizzes").select("*").eq("id", quizId).maybeSingle()).data,
  });
  const questions = (quiz.data?.questions as Q[]) ?? [];
  const q = questions[idx];

  const submit = async () => {
    if (!quiz.data) return;
    setSubmitting(true);
    const breakdown: Record<string, { correct: number; total: number }> = {};
    let correct = 0;
    let totalScored = 0;
    const written: { q: string; answer: string; subtopic: string }[] = [];
    questions.forEach((qq, i) => {
      if (qq.type === "written") {
        written.push({ q: qq.question, answer: writtenAnswers[i] ?? "", subtopic: qq.subtopic });
        return;
      }
      const b = (breakdown[qq.subtopic] ??= { correct: 0, total: 0 });
      b.total += 1; totalScored += 1;
      if (mcqAnswers[i] === qq.correct) { b.correct += 1; correct += 1; }
    });
    const score = totalScored > 0 ? Math.round((correct / totalScored) * 100) : 0;
    const weakest = Object.entries(breakdown).sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))[0]?.[0] ?? null;

    const payload: any = {
      quiz_id: quiz.data.id, subject: quiz.data.subject,
      score, correct_count: correct, total_count: totalScored,
      subtopic_breakdown: breakdown, written_answers: written,
    };
    if (user) payload.student_id = user.id;
    else payload.guest_name = guestName.trim() || "Guest";

    const { error } = await supabase.from("quiz_attempts").insert(payload);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setResult({ score, breakdown, weakest });
  };

  if (quiz.isLoading) return <Shell><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></Shell>;
  if (!quiz.data) return <Shell><div className="text-center py-20"><h1 className="text-2xl font-bold">Quiz not found</h1><Link to="/" className="text-primary hover:underline mt-4 inline-block">Go home</Link></div></Shell>;

  if (result) return (
    <Shell>
      <ResultView title={quiz.data.title} result={result} hasWritten={questions.some((qq) => qq.type === "written")} />
    </Shell>
  );

  if (!started) return (
    <Shell>
      <div className="max-w-md mx-auto glass rounded-3xl p-8 text-center">
        <h1 className="text-2xl font-bold">{quiz.data.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{questions.length} questions · {quiz.data.subject}</p>
        {!user && (
          <div className="mt-6 text-left">
            <label className="text-xs">Your name (for the teacher's report)</label>
            <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Your name" className="mt-1" />
          </div>
        )}
        <Button onClick={() => setStarted(true)} disabled={!user && !guestName.trim()} className="mt-6 w-full glow" style={{ background: "var(--gradient-primary)" }}>
          Start quiz
        </Button>
        {!user && <p className="mt-3 text-[11px] text-muted-foreground">No account needed. <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to save this attempt to your dashboard.</p>}
      </div>
    </Shell>
  );

  const answered = Object.keys(mcqAnswers).length + Object.values(writtenAnswers).filter((v) => v.trim().length > 0).length;
  const allAnswered = questions.every((qq, i) => qq.type === "written" ? (writtenAnswers[i] ?? "").trim().length > 0 : mcqAnswers[i] !== undefined);

  return (
    <Shell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>Question {idx + 1} of {questions.length}</span>
          <span>{answered} answered</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-6">
          <div className="h-full transition-all" style={{ width: `${((idx + 1) / questions.length) * 100}%`, background: "var(--gradient-primary)" }} />
        </div>
        <div className="glass rounded-2xl p-6">
          <div className="text-xs text-primary mb-2 uppercase tracking-wider">{q.type === "written" ? "Written" : "Multiple choice"} · {q.subtopic}</div>
          <h2 className="text-lg font-semibold">{q.question}</h2>
          {q.type === "written" ? (
            <textarea
              value={writtenAnswers[idx] ?? ""}
              onChange={(e) => setWrittenAnswers({ ...writtenAnswers, [idx]: e.target.value })}
              rows={5}
              placeholder="Type your answer…"
              className="mt-4 w-full rounded-xl border border-input bg-secondary/40 px-4 py-3 text-sm"
            />
          ) : (
            <div className="mt-5 space-y-2">
              {q.options.map((opt, i) => (
                <button key={i} onClick={() => setMcqAnswers({ ...mcqAnswers, [idx]: i })}
                  className={"w-full text-left rounded-xl border px-4 py-3 text-sm transition-all " +
                    (mcqAnswers[idx] === i ? "border-primary bg-primary/20" : "border-border bg-secondary/40 hover:bg-secondary")}>
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-between">
          <Button variant="secondary" disabled={idx === 0} onClick={() => setIdx(idx - 1)}><ChevronLeft className="h-4 w-4" /> Back</Button>
          {idx < questions.length - 1 ? (
            <Button onClick={() => setIdx(idx + 1)} style={{ background: "var(--gradient-primary)" }} className="glow">Next <ChevronRight className="h-4 w-4" /></Button>
          ) : (
            <Button disabled={submitting || !allAnswered} onClick={submit} style={{ background: "var(--gradient-primary)" }} className="glow">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
            </Button>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <GlowBackground />
      <nav className="sticky top-0 z-30 backdrop-blur-xl bg-background/40 border-b border-border">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="glass rounded-lg p-1.5"><Logo className="h-6 w-auto" /></div>
            <span className="font-bold text-lg tracking-tight">EduSense</span>
          </Link>
        </div>
      </nav>
      <main className="p-6 md:p-10">{children}</main>
    </div>
  );
}

function ResultView({ title, result, hasWritten }: { title: string; result: { score: number; breakdown: Record<string, { correct: number; total: number }>; weakest: string | null }; hasWritten: boolean }) {
  const donut = [{ name: "Score", value: result.score }, { name: "Rest", value: 100 - result.score }];
  const colorFor = (pct: number) => pct >= 75 ? "oklch(0.75 0.18 155)" : pct >= 45 ? "oklch(0.78 0.17 80)" : "oklch(0.65 0.24 25)";
  const scored = Object.keys(result.breakdown).length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-center">{title}</h1>
      {scored ? (
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
            <div className="text-xs text-muted-foreground">MCQ score</div>
            <div className="text-5xl font-bold">{result.score}%</div>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">All questions were written — your teacher will review them.</div>
      )}
      {scored && (
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-3">Subtopic breakdown</h3>
          <div className="space-y-3">
            {Object.entries(result.breakdown).map(([sub, b]) => {
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
          {result.weakest && <p className="mt-4 text-sm text-primary">Tip: Focus on <strong>{result.weakest}</strong> next.</p>}
        </div>
      )}
      {hasWritten && <p className="text-xs text-muted-foreground text-center">Your written answers have been saved for your teacher to review.</p>}
      <Link to="/" className="block text-center text-primary hover:underline">Go home</Link>
    </div>
  );
}
