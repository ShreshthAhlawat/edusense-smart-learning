import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { downloadCsv, downloadPdf, fmtDuration, EXPRESSIONS, type EngagementSession } from "@/lib/engagement";
import { Loader2, FileDown, FileText, TrendingUp, TrendingDown } from "lucide-react";

type TeamOpt = { id: string; name: string };

export function EngagementReports({ teacherId, teams }: { teacherId: string; teams: TeamOpt[] }) {
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [range, setRange] = useState<"daily" | "weekly" | "monthly" | "all">("all");

  const q = useQuery({
    queryKey: ["engagement-sessions", teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("engagement_sessions")
        .select("*")
        .eq("teacher_id", teacherId)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EngagementSession[];
    },
    enabled: !!teacherId,
  });

  const all = q.data ?? [];
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "Class";

  const sessions = useMemo(() => {
    const now = Date.now();
    const cutoff = range === "daily" ? 24 * 3600e3 : range === "weekly" ? 7 * 24 * 3600e3 : range === "monthly" ? 30 * 24 * 3600e3 : Infinity;
    return all.filter(
      (s) =>
        (teamFilter === "all" || s.team_id === teamFilter) &&
        (subjectFilter === "all" || s.subject === subjectFilter) &&
        now - new Date(s.started_at).getTime() <= cutoff,
    );
  }, [all, teamFilter, subjectFilter, range]);

  const subjects = [...new Set(all.map((s) => s.subject))];

  const bySubject = useMemo(() => {
    const m: Record<string, { subject: string; total: number; n: number }> = {};
    sessions.forEach((s) => {
      m[s.subject] ??= { subject: s.subject, total: 0, n: 0 };
      m[s.subject].total += Number(s.engagement_score);
      m[s.subject].n += 1;
    });
    return Object.values(m).map((x) => ({ subject: x.subject, avg: Math.round(x.total / x.n), sessions: x.n })).sort((a, b) => b.avg - a.avg);
  }, [sessions]);

  const byTeam = useMemo(() => {
    const m: Record<string, { team: string; total: number; n: number; students: number }> = {};
    sessions.forEach((s) => {
      const k = teamName(s.team_id);
      m[k] ??= { team: k, total: 0, n: 0, students: 0 };
      m[k].total += Number(s.engagement_score);
      m[k].students += s.max_students;
      m[k].n += 1;
    });
    return Object.values(m).map((x) => ({ team: x.team, avg: Math.round(x.total / x.n), sessions: x.n, students: Math.round(x.students / x.n) }));
  }, [sessions]); // eslint-disable-line react-hooks/exhaustive-deps

  const trend = useMemo(() => {
    const m: Record<string, { day: string; total: number; n: number; students: number }> = {};
    sessions.forEach((s) => {
      const day = s.session_date;
      m[day] ??= { day, total: 0, n: 0, students: 0 };
      m[day].total += Number(s.engagement_score);
      m[day].students += s.max_students;
      m[day].n += 1;
    });
    return Object.values(m)
      .map((x) => ({ day: x.day, engagement: Math.round(x.total / x.n), students: Math.round(x.students / x.n) }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [sessions]);

  const distTotals = useMemo(() => {
    const m: Record<string, number> = {};
    sessions.forEach((s) => Object.entries(s.expression_distribution ?? {}).forEach(([k, v]) => (m[k] = (m[k] ?? 0) + Number(v))));
    const total = Object.values(m).reduce((a, b) => a + b, 0);
    return EXPRESSIONS.map((e) => ({ name: e, value: total ? Math.round(((m[e] ?? 0) / total) * 100) : 0 }));
  }, [sessions]);

  const avgScore = sessions.length ? Math.round(sessions.reduce((s, x) => s + Number(x.engagement_score), 0) / sessions.length) : 0;

  const csvRows = () => [
    ["Date", "Class", "Subject", "Start", "End", "Duration", "Students present", "Max students", "Engagement %", ...EXPRESSIONS],
    ...sessions.map((s) => [
      s.session_date, teamName(s.team_id), s.subject,
      new Date(s.started_at).toLocaleTimeString(), new Date(s.ended_at).toLocaleTimeString(),
      fmtDuration(s.duration_seconds), s.students_present, s.max_students, Math.round(Number(s.engagement_score)),
      ...EXPRESSIONS.map((e) => s.expression_distribution?.[e] ?? 0),
    ]),
  ];

  return (
    <div className="space-y-6">
      <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-5">
        <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm">
          <option value="all">All classes</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm">
          <option value="all">All subjects</option>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={range} onChange={(e) => setRange(e.target.value as any)} className="rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm">
          <option value="all">All time</option>
          <option value="daily">Last 24 hours</option>
          <option value="weekly">Last 7 days</option>
          <option value="monthly">Last 30 days</option>
        </select>
        <div className="ml-auto flex gap-2">
          <button onClick={() => downloadCsv("engagement-report.csv", csvRows())} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs hover:bg-secondary">
            <FileDown className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button
            onClick={() =>
              downloadPdf(
                "Classroom Engagement Report",
                [
                  `Sessions: ${sessions.length}`,
                  `Average engagement: ${avgScore}%`,
                  `Most engaging subject: ${bySubject[0]?.subject ?? "—"}`,
                  `Least engaging subject: ${bySubject[bySubject.length - 1]?.subject ?? "—"}`,
                ],
                { head: ["Date", "Class", "Subject", "Students", "Engagement"], body: sessions.map((s) => [s.session_date, teamName(s.team_id), s.subject, s.max_students, `${Math.round(Number(s.engagement_score))}%`]) },
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-primary-foreground glow"
            style={{ background: "var(--gradient-primary)" }}
          >
            <FileText className="h-3.5 w-3.5" /> Export PDF
          </button>
        </div>
      </div>

      {q.isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !sessions.length ? (
        <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">
          No sessions recorded yet for this filter. Run “Start Analytics” on a class to build history.
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card label="Sessions" value={String(sessions.length)} />
            <Card label="Average engagement" value={`${avgScore}%`} />
            <Card label="Peak students" value={String(Math.max(...sessions.map((s) => s.max_students)))} />
            <Card label="Total time analysed" value={fmtDuration(sessions.reduce((a, s) => a + s.duration_seconds, 0))} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Engagement trend">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
                  <XAxis dataKey="day" stroke="oklch(0.75 0.04 275)" fontSize={12} />
                  <YAxis stroke="oklch(0.75 0.04 275)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "oklch(0.2 0.05 278)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="engagement" stroke="oklch(0.65 0.22 280)" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="students" stroke="oklch(0.6 0.2 250)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Subject-wise engagement">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySubject}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
                  <XAxis dataKey="subject" stroke="oklch(0.75 0.04 275)" fontSize={12} />
                  <YAxis stroke="oklch(0.75 0.04 275)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "oklch(0.2 0.05 278)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }} />
                  <Bar dataKey="avg" fill="oklch(0.65 0.22 280)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="glass rounded-2xl p-6">
              <h3 className="mb-4 font-semibold">Expression mix</h3>
              <ul className="space-y-2">
                {distTotals.map((d) => (
                  <li key={d.name}>
                    <div className="flex justify-between text-xs"><span>{d.name}</span><span className="text-muted-foreground">{d.value}%</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full" style={{ width: `${d.value}%`, background: "var(--gradient-primary)" }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass rounded-2xl p-6">
              <h3 className="mb-4 flex items-center gap-2 font-semibold"><TrendingUp className="h-4 w-4 text-green-400" /> Most engaging subjects</h3>
              <ul className="space-y-2 text-sm">
                {bySubject.slice(0, 5).map((s) => (
                  <li key={s.subject} className="flex justify-between rounded-lg border border-border bg-secondary/40 p-3">
                    <span>{s.subject}</span><span className="text-green-400">{s.avg}%</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass rounded-2xl p-6">
              <h3 className="mb-4 flex items-center gap-2 font-semibold"><TrendingDown className="h-4 w-4 text-destructive" /> Least engaging subjects</h3>
              <ul className="space-y-2 text-sm">
                {[...bySubject].reverse().slice(0, 5).map((s) => (
                  <li key={s.subject} className="flex justify-between rounded-lg border border-border bg-secondary/40 p-3">
                    <span>{s.subject}</span><span className="text-destructive">{s.avg}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <h3 className="mb-4 font-semibold">Class-wise analytics</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="text-xs text-muted-foreground"><tr className="text-left"><th className="pb-2">Class</th><th className="pb-2">Sessions</th><th className="pb-2">Avg students</th><th className="pb-2">Avg engagement</th></tr></thead>
                <tbody>
                  {byTeam.map((t) => (
                    <tr key={t.team} className="border-t border-border/60">
                      <td className="py-2">{t.team}</td><td className="py-2">{t.sessions}</td><td className="py-2">{t.students}</td><td className="py-2">{t.avg}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <h3 className="mb-4 font-semibold">Session history</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left">
                    <th className="pb-2">Date</th><th className="pb-2">Class</th><th className="pb-2">Subject</th><th className="pb-2">Time</th>
                    <th className="pb-2">Duration</th><th className="pb-2">Present</th><th className="pb-2">Max</th><th className="pb-2">Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className="border-t border-border/60">
                      <td className="py-2">{s.session_date}</td>
                      <td className="py-2">{teamName(s.team_id)}</td>
                      <td className="py-2">{s.subject}</td>
                      <td className="py-2 text-muted-foreground">{new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–{new Date(s.ended_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="py-2">{fmtDuration(s.duration_seconds)}</td>
                      <td className="py-2">{s.students_present}</td>
                      <td className="py-2">{s.max_students}</td>
                      <td className="py-2">{Math.round(Number(s.engagement_score))}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="mb-4 font-semibold">{title}</h3>
      <div className="h-72">{children}</div>
    </div>
  );
}
