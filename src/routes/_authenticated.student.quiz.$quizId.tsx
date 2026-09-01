import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/Markdown";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Loader2, ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle, PenLine, Lightbulb } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/quiz/$quizId")({
  head: () => ({ meta: [
    { title: "Take Quiz — EduSense" },
    { name: "description", content: "Answer the quiz and see instant per-question feedback with a subtopic breakdown." },
    { property: "og:title", content: "Take Quiz — EduSense" },
    { property: "og:description", content: "Answer the quiz and get instant feedback." },
  ] }),
  component: TakeQuiz,
});

type Question = {
  question: string;
  options: string[];
  correct: number;
  subtopic: string;
  type?: "mcq" | "written";
  explanation?: string;
  sample_answer?: string;
};

export type AnswerDetail = {
  index: number;
  type: "mcq" | "written";
  question: string;
  subtopic: string;
  options: string[];
  selected: number | null;
  correct: number;
  written: string;
  sample_answer: string;
  explanation: string;
  isCorrect: boolean | null;
  seconds: number;
};

type Result = {
  score: number;
  correctCount: number;
  scoredTotal: number;
  totalQuestions: number;
  completionRate: number;
  durationSeconds: number;
  breakdown: Record<string, { correct: number; total: number }>;
  weakest: string | null;
  detail: AnswerDetail[];
};

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function TakeQuiz() {
  const { quizId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [written, setWritten] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const startedAt = useRef<number>(Date.now());
  const perQuestion = useRef<Record<number, number>>({});
  const lastTick = useRef<number>(Date.now());

  const quiz = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: async () => (await supabase.from("quizzes").select("*").eq("id", quizId).maybeSingle()).data,
    enabled: !!user,
  });

  // Overall timer
  useEffect(() => {
    if (result) return;
    const t = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => window.clearInterval(t);
  }, [result]);

  // Per-question time accounting
  useEffect(() => {
    lastTick.current = Date.now();
    const current = idx;
    return () => {
      const spent = Math.round((Date.now() - lastTick.current) / 1000);
      perQuestion.current[current] = (perQuestion.current[current] ?? 0) + spent;
    };
  }, [idx]);

  const questions = useMemo(() => ((quiz.data?.questions as Question[]) ?? []), [quiz.data]);
  const q = questions[idx];
  const qType = (q?.type === "written" ? "written" : "mcq") as "mcq" | "written";

  const answeredCount = useMemo(
    () =>
      questions.reduce((n, qq, i) => {
        const t = qq.type === "written" ? "written" : "mcq";
        const done = t === "written" ? (written[i] ?? "").trim().length > 0 : answers[i] !== undefined;
        return n + (done ? 1 : 0);
      }, 0),
    [questions, answers, written],
  );

  const submit = async () => {
    if (!quiz.data) return;
    setSubmitting(true);
    // flush the current question's time
    perQuestion.current[idx] = (perQuestion.current[idx] ?? 0) + Math.round((Date.now() - lastTick.current) / 1000);

    const breakdown: Record<string, { correct: number; total: number }> = {};
    const detail: AnswerDetail[] = [];
    let correct = 0;
    let scoredTotal = 0;

    questions.forEach((qq, i) => {
      const t = (qq.type === "written" ? "written" : "mcq") as "mcq" | "written";
      const sub = qq.subtopic || "General";
      const isCorrect = t === "mcq" ? answers[i] === qq.correct : null;
      if (t === "mcq") {
        const b = (breakdown[sub] ??= { correct: 0, total: 0 });
        b.total += 1;
        scoredTotal += 1;
        if (isCorrect) { b.correct += 1; correct += 1; }
      }
      detail.push({
        index: i,
        type: t,
        question: qq.question,
        subtopic: sub,
        options: qq.options ?? [],
        selected: t === "mcq" ? (answers[i] ?? null) : null,
        correct: qq.correct ?? 0,
        written: written[i] ?? "",
        sample_answer: qq.sample_answer ?? "",
        explanation: qq.explanation ?? "",
        isCorrect,
        seconds: perQuestion.current[i] ?? 0,
      });
    });

    const score = scoredTotal > 0 ? Math.round((correct / scoredTotal) * 100) : 0;
    const completionRate = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
    const durationSeconds = Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000));
    const weakest =
      Object.entries(breakdown).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)[0]?.[0] ?? null;

    const { error } = await supabase.from("quiz_attempts").insert({
      student_id: user!.id,
      quiz_id: quiz.data.id,
      subject: quiz.data.subject,
      score,
      correct_count: correct,
      total_count: scoredTotal,
      subtopic_breakdown: breakdown,
      written_answers: detail.filter((d) => d.type === "written").map((d) => ({ question: d.question, answer: d.written })),
      duration_seconds: durationSeconds,
      completion_rate: completionRate,
      answer_detail: detail as unknown as never,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setResult({ score, correctCount: correct, scoredTotal, totalQuestions: questions.length, completionRate, durationSeconds, breakdown, weakest, detail });
  };

  if (quiz.isLoading) return <DashboardShell role="student"><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></DashboardShell>;
  if (!quiz.data || !questions.length) return <DashboardShell role="student"><PageHeader title="Quiz not found" /></DashboardShell>;

  if (result) return <ResultView result={result} onDone={() => navigate({ to: "/student/dashboard" })} />;

  return (
    <DashboardShell role="student" greeting={quiz.data.title}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>Question {idx + 1} of {questions.length}</span>
          <span className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{fmt(elapsed)}</span>
            <span>{answeredCount} answered</span>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-6">
          <div className="h-full transition-all" style={{ width: `${((idx + 1) / questions.length) * 100}%`, background: "var(--gradient-primary)" }} />
        </div>
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 bg-primary/20 border border-primary/40">
              {qType === "written" ? "Subjective" : "Multiple choice"}
            </span>
            {q.subtopic && <span className="text-[10px] text-muted-foreground">{q.subtopic}</span>}
          </div>
          <h2 className="text-lg font-semibold">{q.question}</h2>

          {qType === "mcq" ? (
            <div className="mt-5 space-y-2">
              {q.options.map((opt, i) => (
                <button key={i} onClick={() => setAnswers({ ...answers, [idx]: i })}
                  className={"w-full text-left rounded-xl border px-4 py-3 text-sm transition-all " +
                    (answers[idx] === i ? "border-primary bg-primary/20" : "border-border bg-secondary/40 hover:bg-secondary")}>
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><PenLine className="h-3.5 w-3.5 text-primary" /> Write your answer</span>
                <span>{(written[idx] ?? "").trim().split(/\s+/).filter(Boolean).length} words</span>
              </div>
              <textarea
                value={written[idx] ?? ""}
                onChange={(e) => setWritten({ ...written, [idx]: e.target.value })}
                placeholder="Take your time — structure your answer in a few sentences…"
                rows={10}
                className="w-full resize-y rounded-xl border border-input bg-secondary/40 px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              />
              <p className="mt-2 text-[11px] text-muted-foreground">Saved as you type — you can come back with Back / Next before submitting.</p>
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-between">
          <Button variant="secondary" disabled={idx === 0} onClick={() => setIdx(idx - 1)}><ChevronLeft className="h-4 w-4" /> Back</Button>
          {idx < questions.length - 1 ? (
            <Button onClick={() => setIdx(idx + 1)} style={{ background: "var(--gradient-primary)" }} className="glow">Next <ChevronRight className="h-4 w-4" /></Button>
          ) : (
            <Button disabled={submitting || answeredCount === 0} onClick={submit} style={{ background: "var(--gradient-primary)" }} className="glow">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit & see feedback"}
            </Button>
          )}
        </div>
        {idx === questions.length - 1 && answeredCount < questions.length && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {questions.length - answeredCount} question{questions.length - answeredCount === 1 ? "" : "s"} left unanswered — you can still submit.
          </p>
        )}
      </div>
    </DashboardShell>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-0.5">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function ResultView({ result, onDone }: { result: Result; onDone: () => void }) {
  const donut = [{ name: "Score", value: result.score }, { name: "Rest", value: 100 - result.score }];
  const colorFor = (pct: number) => pct >= 75 ? "oklch(0.75 0.18 155)" : pct >= 45 ? "oklch(0.78 0.17 80)" : "oklch(0.65 0.24 25)";

  return (
    <DashboardShell role="student" greeting="Your results">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="glass rounded-2xl p-6 flex flex-wrap items-center gap-6">
          <div className="h-40 w-40 shrink-0">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={donut} innerRadius={45} outerRadius={65} startAngle={90} endAngle={-270} dataKey="value" isAnimationActive animationDuration={900}>
                  <Cell fill="oklch(0.65 0.22 280)" />
                  <Cell fill="oklch(1 0 0 / 0.08)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Overall score</div>
            <div className="text-5xl font-bold">{result.score}%</div>
            <div className="text-sm text-muted-foreground mt-1">{result.correctCount} of {result.scoredTotal} auto-scored questions correct</div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Time taken" value={fmt(result.durationSeconds)} sub={`${Math.round(result.durationSeconds / Math.max(1, result.totalQuestions))}s avg / question`} />
          <Stat label="Completion" value={`${result.completionRate}%`} sub={`${result.totalQuestions} questions total`} />
          <Stat label="Accuracy" value={result.scoredTotal ? `${result.score}%` : "—"} sub={result.scoredTotal ? "on multiple choice" : "subjective only"} />
        </div>

        {Object.keys(result.breakdown).length > 0 && (
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
                      <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, background: colorFor(pct) }} />
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
        )}

        {/* PER-QUESTION FEEDBACK */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Answer review</h3>
          <div className="space-y-4">
            {result.detail.map((d) => (
              <div
                key={d.index}
                className={
                  "rounded-xl border p-4 transition-colors " +
                  (d.isCorrect === true
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : d.isCorrect === false
                    ? "border-red-500/40 bg-red-500/5"
                    : "border-border bg-secondary/30")
                }
              >
                <div className="flex items-start gap-2">
                  {d.isCorrect === true ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                    : d.isCorrect === false ? <XCircle className="h-4 w-4 mt-0.5 text-red-500 shrink-0" />
                    : <PenLine className="h-4 w-4 mt-0.5 text-primary shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{d.index + 1}. {d.question}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{d.subtopic} · {d.seconds}s spent</div>

                    {d.type === "mcq" ? (
                      <div className="mt-3 space-y-1.5">
                        {d.options.map((opt, i) => {
                          const isRight = i === d.correct;
                          const isPicked = i === d.selected;
                          return (
                            <div key={i} className={"rounded-lg border px-3 py-1.5 text-xs flex items-center gap-2 " +
                              (isRight ? "border-emerald-500/50 bg-emerald-500/10"
                                : isPicked ? "border-red-500/50 bg-red-500/10"
                                : "border-border/60")}>
                              <span className="flex-1">{opt}</span>
                              {isRight && <span className="text-[10px] text-emerald-500">Correct answer</span>}
                              {isPicked && !isRight && <span className="text-[10px] text-red-500">Your answer</span>}
                            </div>
                          );
                        })}
                        {d.selected === null && <div className="text-[11px] text-muted-foreground">You skipped this question.</div>}
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <div>
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Your answer</div>
                          <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-xs whitespace-pre-wrap">
                            {d.written.trim() || "— not answered —"}
                          </div>
                        </div>
                        {d.sample_answer && (
                          <div>
                            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Model answer</div>
                            <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
                              <Markdown>{d.sample_answer}</Markdown>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {d.explanation && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                        <Lightbulb className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                        <span>{d.explanation}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={onDone} style={{ background: "var(--gradient-primary)" }} className="glow">Back to dashboard</Button>
      </div>
    </DashboardShell>
  );
}
