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

  const struggling = useQuery({
    queryKey: ["struggling", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("struggling_topics").select("*").eq("teacher_id", user!.id).eq("status", "pending");
      return data ?? [];
    },
    enabled: !!user,
  });

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekly = (attempts.data ?? []).filter((a) => new Date(a.taken_at).getTime() > weekAgo);
  const activeClasses = new Set((quizzes.data ?? []).map((q) => q.subject)).size;
  const engagement = attempts.data && attempts.data.length ? Math.round((weekly.length / attempts.data.length) * 100) : 0;

  const setStatus = async (id: string, status: "confirmed" | "dismissed") => {
    const { error } = await supabase.from("struggling_topics").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "confirmed" ? "Marked for follow-up" : "Dismissed");
    struggling.refetch();
  };

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
          {struggling.data && struggling.data.length > 0 ? (
            <ul className="space-y-3">
              {struggling.data.map((s: any) => (
                <li key={s.id} className="flex items-center justify-between rounded-lg bg-secondary/40 border border-border p-3">
                  <div>
                    <div className="text-sm font-medium">{s.subtopic}</div>
                    <div className="text-xs text-muted-foreground">{s.subject} · avg score {Math.round(Number(s.avg_score))}%</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setStatus(s.id, "confirmed")}><Check className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setStatus(s.id, "dismissed")}><X className="h-4 w-4" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No insights yet. Once students take your quizzes, AI-flagged weak topics will appear here.</p>
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
