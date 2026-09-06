import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
} from "recharts";
import { Activity, Clock, Users, Loader2 } from "lucide-react";
import { CountUp } from "@/components/CountUp";

const RANGES = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

function fmtDuration(sec: number) {
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Owner-only platform usage analytics: users, sessions, time spent per tool and over time. */
export function PlatformAnalytics() {
  const [days, setDays] = useState(30);
  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [days]);

  const profiles = useQuery({
    queryKey: ["owner-profile-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, role, plan, created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const sessions = useQuery({
    queryKey: ["owner-usage", days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usage_sessions")
        .select("user_id, tool, route, role, duration_seconds, started_at")
        .gte("started_at", since.toISOString())
        .order("started_at", { ascending: true })
        .limit(5000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = sessions.data ?? [];
  const people = profiles.data ?? [];

  const totalSeconds = rows.reduce((s, r: any) => s + (r.duration_seconds ?? 0), 0);
  const activeUsers = new Set(rows.map((r: any) => r.user_id)).size;
  const avgSession = rows.length ? totalSeconds / rows.length : 0;

  const byDay = useMemo(() => {
    const map = new Map<string, { date: string; sessions: number; minutes: number; users: Set<string> }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { date: key.slice(5), sessions: 0, minutes: 0, users: new Set() });
    }
    for (const r of rows as any[]) {
      const key = String(r.started_at).slice(0, 10);
      const e = map.get(key);
      if (!e) continue;
      e.sessions += 1;
      e.minutes += (r.duration_seconds ?? 0) / 60;
      e.users.add(r.user_id);
    }
    return [...map.values()].map((e) => ({
      date: e.date, sessions: e.sessions, minutes: Math.round(e.minutes), users: e.users.size,
    }));
  }, [rows, days, since]);

  const byTool = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows as any[]) {
      map.set(r.tool ?? "General", (map.get(r.tool ?? "General") ?? 0) + (r.duration_seconds ?? 0) / 60);
    }
    return [...map.entries()]
      .map(([tool, minutes]) => ({ tool, minutes: Math.round(minutes) }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 8);
  }, [rows]);

  const loading = sessions.isLoading || profiles.isLoading;

  return (
    <div className="mt-6 glass rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> Platform analytics
        </h2>
        <div className="flex gap-1 rounded-full border border-border p-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={"rounded-full px-3 py-1 text-xs transition-colors " + (days === r.days ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={<Users className="h-4 w-4" />} label="Total users" value={<CountUp value={people.length} />} />
            <Stat icon={<Users className="h-4 w-4" />} label="Teachers / Students"
              value={<span>{people.filter((p: any) => p.role === "teacher").length} / {people.filter((p: any) => p.role === "student").length}</span>} />
            <Stat icon={<Activity className="h-4 w-4" />} label={`Active users (${days}d)`} value={<CountUp value={activeUsers} />} />
            <Stat icon={<Clock className="h-4 w-4" />} label="Total time on platform" value={<span>{fmtDuration(totalSeconds)}</span>} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Stat icon={<Clock className="h-4 w-4" />} label="Avg. session" value={<span>{fmtDuration(avgSession)}</span>} />
            <Stat icon={<Activity className="h-4 w-4" />} label="Sessions tracked" value={<CountUp value={rows.length} />} />
            <Stat icon={<Users className="h-4 w-4" />} label="Pro / School plans"
              value={<span>{people.filter((p: any) => p.plan && p.plan !== "free").length}</span>} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-secondary/20 p-4">
              <h3 className="text-sm font-medium mb-3">Usage over time</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={byDay} margin={{ left: -20, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="usageMinutes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="usageUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                    <Area type="monotone" dataKey="minutes" name="Minutes" stroke="hsl(var(--primary))" fill="url(#usageMinutes)" strokeWidth={2} animationDuration={900} />
                    <Area type="monotone" dataKey="users" name="Active users" stroke="hsl(var(--accent))" fill="url(#usageUsers)" strokeWidth={2} animationDuration={1200} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-secondary/20 p-4">
              <h3 className="text-sm font-medium mb-3">Time spent per tool (minutes)</h3>
              <div className="h-64">
                {byTool.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byTool} layout="vertical" margin={{ left: 40, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis type="category" dataKey="tool" width={110} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                      <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} animationDuration={900} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No usage recorded yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4 card-hover">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 text-2xl font-bold gradient-text">{value}</div>
    </div>
  );
}
