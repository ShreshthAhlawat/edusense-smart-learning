import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardShell, PageHeader, PaidGate, isPaidPlan } from "@/components/DashboardShell";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { AlertTriangle, Users2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teacher/analytics")({
  head: () => ({ meta: [
    { title: "Engagement Analytics — EduSense" },
    { name: "description", content: "See how each of your teams engages with your quizzes." },
    { property: "og:title", content: "Engagement Analytics — EduSense" },
    { property: "og:description", content: "See how each of your teams engages with your quizzes." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Analytics,
});

type Breakdown = Record<string, { correct: number; total: number }>;

function Analytics() {
  const { user, profile } = useAuth();
  const [teamId, setTeamId] = useState<string | null>(null);

  const teams = useQuery({
    queryKey: ["teacher-teams-analytics", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, join_code, team_members(student_id, profiles:student_id(username, email))")
        .eq("teacher_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!user,
  });

  const team = teams.data?.find((t: any) => t.id === teamId) ?? null;
  const memberIds: string[] = (team?.team_members ?? []).map((m: any) => m.student_id);

  const q = useQuery({
    queryKey: ["team-engagement", user?.id, teamId, memberIds.length],
    queryFn: async () => {
      const { data: quizzes } = await supabase.from("quizzes").select("id, subject, title").eq("teacher_id", user!.id);
      const ids = (quizzes ?? []).map((x) => x.id);
      if (!ids.length || memberIds.length === 0) return { attempts: [] as any[] };
      const { data } = await supabase
        .from("quiz_attempts")
        .select("taken_at, score, subject, subtopic_breakdown, student_id, written_answers, quiz_id")
        .in("quiz_id", ids)
        .in("student_id", memberIds)
        .order("taken_at");
      return { attempts: data ?? [] };
    },
    enabled: !!user && !!teamId,
  });

  if (!isPaidPlan(profile?.plan)) {
    return (
      <DashboardShell role="teacher" greeting="Engagement Analytics">
        <PageHeader title="Engagement Analytics" />
        <PaidGate role="teacher" feature="Engagement Analytics" />
      </DashboardShell>
    );
  }

  // ----- Team picker -----
  if (!teamId) {
    return (
      <DashboardShell role="teacher" greeting="Engagement Analytics">
        <PageHeader title="Pick a team" desc="Analytics are scoped to one class at a time — choose which team to look at." />
        {teams.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : teams.data && teams.data.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.data.map((t: any) => (
              <button key={t.id} onClick={() => setTeamId(t.id)} className="glass rounded-2xl p-6 text-left transition-all hover:-translate-y-0.5 hover:glow">
                <div className="flex items-center gap-2 font-semibold"><Users2 className="h-4 w-4 text-primary" /> {t.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t.team_members?.length ?? 0} student{(t.team_members?.length ?? 0) === 1 ? "" : "s"} · code {t.join_code}</div>
                <div className="mt-4 text-sm text-primary">View analytics →</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">
            You don’t have any teams yet. Create one on the Teams page, share the join code, and analytics will appear here.
          </div>
        )}
      </DashboardShell>
    );
  }

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
    .map(([key, v]) => ({ subject: v.subject, subtopic: key.split("::")[1], avg: Math.round((v.correct / v.total) * 100), total: v.total }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 5);

  const nameOf = (studentId: string) => {
    const m: any = (team?.team_members ?? []).find((x: any) => x.student_id === studentId);
    return m?.profiles?.username ?? m?.profiles?.email ?? "Student";
  };

  const participants = new Set(attempts.map((a: any) => a.student_id)).size;
  const avgScore = attempts.length ? Math.round(attempts.reduce((s: number, a: any) => s + Number(a.score), 0) / attempts.length) : 0;

  return (
    <DashboardShell role="teacher" greeting="Engagement Analytics">
      <PageHeader title={team?.name ?? "Team analytics"} desc="Attempt volume, average scores, and struggling topics for this team only." />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button onClick={() => setTeamId(null)} className="text-sm text-primary hover:underline">← All teams</button>
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm">
          {(teams.data ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Stat label="Students in team" value={String(memberIds.length)} />
        <Stat label="Students who attempted" value={String(participants)} />
        <Stat label="Average score" value={attempts.length ? `${avgScore}%` : "—"} />
      </div>

      <div className="glass rounded-2xl p-6 h-96">
        {q.isLoading ? (
          <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : chart.length ? (
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
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm text-center px-6">
            No attempts from this team yet. Share a quiz with them to start collecting data.
          </div>
        )}
      </div>

      <div className="mt-6 glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Struggling Topics</h2>
          <span className="text-xs text-muted-foreground ml-auto">Lowest-to-highest average, this team only</span>
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
          <p className="text-sm text-muted-foreground">Once this team takes your quizzes, their weakest subtopics appear here.</p>
        )}
      </div>

      <div className="mt-6 glass rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Recent attempts</h2>
        {attempts.length ? (
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {[...attempts].reverse().slice(0, 30).map((a: any, i: number) => (
              <li key={i} className="rounded-lg bg-secondary/40 border border-border p-3 text-sm flex justify-between gap-3">
                <span>{nameOf(a.student_id)} <span className="text-muted-foreground">· {a.subject}</span></span>
                <span className="text-muted-foreground">{a.correct_count ?? ""}{" "}{Math.round(Number(a.score))}% · {new Date(a.taken_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No attempts recorded for this team yet.</p>
        )}
      </div>
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
