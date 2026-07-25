import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/teacher/analytics")({
  head: () => ({ meta: [
    { title: "Engagement Analytics — EduSense" },
    { name: "description", content: "See how your students engage with your quizzes." },
    { property: "og:title", content: "Engagement Analytics — EduSense" },
    { property: "og:description", content: "See how your students engage with your quizzes." },
  ] }),
  component: Analytics,
});

function Analytics() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["teacher-engagement", user?.id],
    queryFn: async () => {
      const { data: quizzes } = await supabase.from("quizzes").select("id").eq("teacher_id", user!.id);
      const ids = (quizzes ?? []).map((q) => q.id);
      if (!ids.length) return [];
      const { data } = await supabase.from("quiz_attempts").select("taken_at, score").in("quiz_id", ids).order("taken_at");
      return data ?? [];
    },
    enabled: !!user,
  });

  const byDay: Record<string, { day: string; attempts: number; avg: number; total: number }> = {};
  (q.data ?? []).forEach((a: any) => {
    const day = new Date(a.taken_at).toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = { day, attempts: 0, avg: 0, total: 0 };
    byDay[day].attempts += 1;
    byDay[day].total += Number(a.score);
    byDay[day].avg = Math.round(byDay[day].total / byDay[day].attempts);
  });
  const chart = Object.values(byDay);

  return (
    <DashboardShell role="teacher" greeting="Engagement Analytics">
      <PageHeader title="Engagement" desc="Attempt volume and average scores over time." />
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
    </DashboardShell>
  );
}
