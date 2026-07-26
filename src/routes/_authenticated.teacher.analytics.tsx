import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teacher/analytics")({
  head: () => ({ meta: [
    { title: "Engagement Analytics — EduSense" },
    { name: "description", content: "See how your students engage with your quizzes." },
    { property: "og:title", content: "Engagement Analytics — EduSense" },
    { property: "og:description", content: "See how your students engage with your quizzes." },
  ] }),
  component: Analytics,
});

type Breakdown = Record<string, { correct: number; total: number }>;

function Analytics() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["teacher-engagement", user?.id],
    queryFn: async () => {
      const { data: quizzes } = await supabase.from("quizzes").select("id, subject").eq("teacher_id", user!.id);
      const ids = (quizzes ?? []).map((q) => q.id);
      if (!ids.length) return { attempts: [], quizzes: [] };
      const { data } = await supabase.from("quiz_attempts").select("taken_at, score, subject, subtopic_breakdown").in("quiz_id", ids).order("taken_at");
      return { attempts: data ?? [], quizzes: quizzes ?? [] };
    },
    enabled: !!user,
  });

  const attempts = q.data?.attempts ?? [];

  const byDay: Record<string, { day: string; attempts: number; avg: number; total: number }> = {};
  attempts.forEach((a: any) => {
    const day = new Date(a.taken_at).toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = { day, attempts: 0, avg: 0, total: 0 };
    byDay[day].attempts += 1;
    byDay[day].total += Number(a.score);
    byDay[day].avg = Math.round(byDay[day].total / byDay[day].attempts);
  });
  const chart = Object.values(byDay);

  // Aggregate subtopic performance across ALL attempts on this teacher's quizzes.
  const agg: Record<string, { subject: string; correct: number; total: number }> = {};
  attempts.forEach((a: any) => {
    const b = (a.subtopic_breakdown ?? {}) as Breakdown;
    Object.entries(b).forEach(([sub, v]) => {
      const key = `${a.subject}::${sub}`;
      if (!agg[key]) agg[key] = { subject: a.subject, correct: 0, total: 0 };
      agg[key].correct += Number(v.correct ?? 0);
      agg[key].total += Number(v.total ?? 0);
    });
  });
  const struggling = Object.entries(agg)
    .filter(([, v]) => v.total >= 1)
    .map(([key, v]) => ({
      subject: v.subject,
      subtopic: key.split("::")[1],
      avg: Math.round((v.correct / v.total) * 100),
      total: v.total,
    }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 5);

  return (
    <DashboardShell role="teacher" greeting="Engagement Analytics">
      <PageHeader title="Engagement" desc="Attempt volume, average scores, and struggling topics across all your quizzes." />
      <div className="glass rounded-2xl p-6 h-96">
        {chart.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
              <XAxis dataKey="day" stroke="oklch(0.75 0.04 275)" fontSize={12} />
              <YAxis stroke="oklch(0.75 0.04 275)" fontSize={12} />
              <Tooltip contentStyle={{ background: "oklch(0.2 0.05 278)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="attempts" stroke="oklch(0.65 0.22 280)" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="avg" stroke="oklch(0.6 0.2 250)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No engagement data yet. Share a quiz to get started.</div>
        )}
      </div>

      <div className="mt-6 glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Struggling Topics</h2>
          <span className="text-xs text-muted-foreground ml-auto">Ranked lowest-to-highest across all student attempts</span>
        </div>
        {struggling.length ? (
          <ul className="space-y-3">
            {struggling.map((s) => (
              <li key={s.subject + s.subtopic} className="rounded-lg bg-secondary/40 border border-border p-3">
                <div className="flex justify-between text-sm mb-1">
                  <span><strong>{s.subtopic}</strong> <span className="text-muted-foreground">· {s.subject}</span></span>
                  <span className={s.avg < 45 ? "text-destructive" : s.avg < 75 ? "text-yellow-400" : "text-green-400"}>{s.avg}% avg</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full" style={{ width: `${s.avg}%`, background: s.avg < 45 ? "oklch(0.65 0.24 25)" : s.avg < 75 ? "oklch(0.78 0.17 80)" : "oklch(0.75 0.18 155)" }} />
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{s.total} questions answered on this subtopic</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Once students take your quizzes, weakest subtopics will appear here ranked by average score.</p>
        )}
      </div>
    </DashboardShell>
  );
}
