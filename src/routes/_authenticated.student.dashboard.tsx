import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PAYMENTS_ENABLED } from "@/lib/features";
import { SkeletonCards } from "@/components/Skeleton";
import { useAuth } from "@/lib/auth";
import { DashboardShell, PageHeader, StatCard } from "@/components/DashboardShell";
import { BookOpen, Target, ListChecks, Crown, Rocket } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useState } from "react";
import { SmartExamPlanner } from "@/components/SmartExamPlanner";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/student/dashboard")({
  head: () => ({ meta: [
    { title: "Student Dashboard — EduSense" },
    { name: "description", content: "Track your quiz progress, homework and personal notes." },
    { property: "og:title", content: "Student Dashboard — EduSense" },
    { property: "og:description", content: "Track your quiz progress and homework." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: StudentDashboard,
});

function StudentDashboard() {
  const { user, profile, refreshProfile } = useAuth();

  const attempts = useQuery({
    queryKey: ["student-attempts", user?.id],
    queryFn: async () => (await supabase.from("quiz_attempts").select("*").eq("student_id", user!.id).order("taken_at")).data ?? [],
    enabled: !!user,
  });
  const homework = useQuery({
    queryKey: ["homework", user?.id],
    queryFn: async () => (await supabase.from("homework").select("*").eq("student_id", user!.id)).data ?? [],
    enabled: !!user,
  });

  const totalAttempts = attempts.data?.length ?? 0;
  const avg = totalAttempts ? Math.round((attempts.data!.reduce((s, a: any) => s + Number(a.score), 0) / totalAttempts)) : 0;
  const due = (homework.data ?? []).filter((h: any) => !h.completed).length;
  const trend = (attempts.data ?? []).map((a: any, i) => ({ n: i + 1, score: Number(a.score) }));

  return (
    <DashboardShell role="student" greeting="Student Dashboard">
      <PageHeader title="Your progress" desc="Live data from your account." />
      {attempts.isLoading || homework.isLoading ? (
        <SkeletonCards />
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={BookOpen} label="Quizzes Taken" value={totalAttempts} />
          <StatCard icon={Target} label="Average Score" value={`${avg}%`} />
          <StatCard icon={ListChecks} label="Homework Due" value={due} />
          <StatCard icon={Crown} label="Current Plan" value={(profile?.plan ?? "free").toUpperCase()} />
        </div>
      )}


      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="glass rounded-2xl p-6 lg:col-span-2 h-80">
          <h2 className="font-semibold mb-3">Quiz score trend</h2>
          {trend.length ? (
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
                <XAxis dataKey="n" stroke="oklch(0.75 0.04 275)" fontSize={12} />
                <YAxis stroke="oklch(0.75 0.04 275)" fontSize={12} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "oklch(0.2 0.05 278)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="score" stroke="oklch(0.65 0.22 280)" strokeWidth={3} dot={{ r: 4, fill: "oklch(0.65 0.22 280)" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Take a quiz to see your trend.</div>
          )}
        </div>
        <SmartExamPlanner userId={user?.id} profile={profile} refreshProfile={refreshProfile} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <HomeworkList user={user} data={homework.data ?? []} refetch={homework.refetch} />
        {PAYMENTS_ENABLED && (
          <div className="glass rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-40" style={{ background: "var(--gradient-hero)" }} />
            <div className="relative">
              <Rocket className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold text-lg">Unlock more tools</h3>
              <p className="mt-1 text-sm text-muted-foreground">Chatbot, PDF Summarizer, Story Generator and more with Pro.</p>
              <Link to="/student/plans" className="mt-4 inline-flex rounded-xl px-4 py-2 text-sm font-medium text-primary-foreground glow" style={{ background: "var(--gradient-primary)" }}>
                See plans
              </Link>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function HomeworkList({ user, data, refetch }: any) {
  const [title, setTitle] = useState("");
  const add = async () => {
    if (!title.trim() || !user) return;
    const { error } = await supabase.from("homework").insert({ student_id: user.id, title });
    if (error) return toast.error(error.message);
    setTitle(""); refetch();
  };
  const toggle = async (id: string, completed: boolean) => {
    await supabase.from("homework").update({ completed: !completed }).eq("id", id);
    refetch();
  };
  const del = async (id: string) => { await supabase.from("homework").delete().eq("id", id); refetch(); };

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="font-semibold mb-3">Homework</h2>
      <div className="flex gap-2 mb-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a task…" className="flex-1 rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm" />
        <Button onClick={add} style={{ background: "var(--gradient-primary)" }} className="glow">Add</Button>
      </div>
      {data.length === 0 && <p className="text-sm text-muted-foreground">Nothing to do — you're all caught up!</p>}
      <ul className="space-y-2">
        {data.map((h: any) => (
          <li key={h.id} className="flex items-center gap-3 rounded-lg bg-secondary/40 border border-border p-2">
            <input type="checkbox" checked={h.completed} onChange={() => toggle(h.id, h.completed)} className="h-4 w-4 accent-primary" />
            <span className={"flex-1 text-sm " + (h.completed ? "line-through text-muted-foreground" : "")}>{h.title}</span>
            <button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => del(h.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
