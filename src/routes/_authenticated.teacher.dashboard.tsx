import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardShell, PageHeader, StatCard } from "@/components/DashboardShell";
import { Users, FileQuestion, Activity, Crown, AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/teacher/dashboard")({
  head: () => ({ meta: [
    { title: "Teacher Dashboard — EduSense" },
    { name: "description", content: "Manage your classes, quizzes and see student engagement insights." },
    { property: "og:title", content: "Teacher Dashboard — EduSense" },
    { property: "og:description", content: "Manage your classes, quizzes and engagement insights." },
  ] }),
  component: TeacherDashboard,
});

function TeacherDashboard() {
  const { user, profile } = useAuth();

  const quizzes = useQuery({
    queryKey: ["teacher-quizzes", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("quizzes").select("id, subject, created_at").eq("teacher_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const attempts = useQuery({
    queryKey: ["teacher-attempts", user?.id],
    queryFn: async () => {
      const quizIds = (quizzes.data ?? []).map((q) => q.id);
      if (!quizIds.length) return [];
      const { data } = await supabase.from("quiz_attempts").select("id, taken_at, score, quiz_id").in("quiz_id", quizIds);
      return data ?? [];
    },
    enabled: !!quizzes.data,
  });

  // Real struggling topics: aggregate subtopic_breakdown across all attempts on this teacher's quizzes.
  const struggling = (() => {
    const agg: Record<string, { subject: string; correct: number; total: number }> = {};
    (attempts.data ?? []).forEach((a: any) => {
      const b = (a.subtopic_breakdown ?? {}) as Record<string, { correct: number; total: number }>;
      Object.entries(b).forEach(([sub, v]) => {
        const key = `${a.subject}::${sub}`;
        if (!agg[key]) agg[key] = { subject: a.subject, correct: 0, total: 0 };
        agg[key].correct += Number(v.correct ?? 0);
        agg[key].total += Number(v.total ?? 0);
      });
    });
    return Object.entries(agg)
      .filter(([, v]) => v.total > 0)
      .map(([key, v]) => ({ subject: v.subject, subtopic: key.split("::")[1], avg: Math.round((v.correct / v.total) * 100) }))
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 4);
  })();

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekly = (attempts.data ?? []).filter((a: any) => new Date(a.taken_at).getTime() > weekAgo);
  const activeClasses = new Set((quizzes.data ?? []).map((q) => q.subject)).size;
  const engagement = attempts.data && attempts.data.length ? Math.round((weekly.length / attempts.data.length) * 100) : 0;

  return (
    <DashboardShell role="teacher" greeting="Teacher Dashboard">
      <PageHeader title="Overview" desc="Your classroom at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Active Classes" value={activeClasses || 0} hint={activeClasses ? "Distinct subjects" : "Create a quiz to begin"} />
        <StatCard icon={FileQuestion} label="Quizzes Created" value={quizzes.data?.length ?? 0} />
        <StatCard icon={Activity} label="Weekly Engagement" value={`${engagement}%`} hint="Attempts this week" />
        <StatCard icon={Crown} label="Active Plan" value={(profile?.plan ?? "free").toUpperCase()} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Struggling Topics</h2>
          </div>
          {struggling.length > 0 ? (
            <ul className="space-y-3">
              {struggling.map((s) => (
                <li key={s.subject + s.subtopic} className="rounded-lg bg-secondary/40 border border-border p-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{s.subtopic} <span className="text-muted-foreground text-xs">· {s.subject}</span></span>
                    <span className={s.avg < 45 ? "text-destructive" : s.avg < 75 ? "text-yellow-400" : "text-green-400"}>{s.avg}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full" style={{ width: `${s.avg}%`, background: s.avg < 45 ? "oklch(0.65 0.24 25)" : s.avg < 75 ? "oklch(0.78 0.17 80)" : "oklch(0.75 0.18 155)" }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No insights yet. Once students take your quizzes, weak subtopics will appear here ranked by average score.</p>
          )}
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-2">Get started</h2>
          <p className="text-sm text-muted-foreground mb-4">Create your first quiz in seconds — students can start practicing immediately.</p>
          <a href="/teacher/quizzes" className="inline-block rounded-xl px-5 py-2.5 text-sm font-medium text-primary-foreground glow" style={{ background: "var(--gradient-primary)" }}>
            Open Quiz Generator
          </a>
        </div>
      </div>
    </DashboardShell>
  );
}
