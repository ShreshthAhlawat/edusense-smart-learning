import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardShell, PageHeader, PaidGate, isPaidPlan } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Users2, Copy, Loader2, Plus, UserRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teacher/teams")({
  head: () => ({
    meta: [
      { title: "My Teams — EduSense Teacher" },
      { name: "description", content: "Create classes, share join codes with students, and see who has joined each team." },
      { property: "og:title", content: "My Teams — EduSense Teacher" },
      { property: "og:description", content: "Create classes, share join codes with students, and see who has joined each team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeacherTeams,
});

function TeacherTeams() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const teams = useQuery({
    queryKey: ["teacher-teams", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*, team_members(student_id, joined_at, profiles:student_id(username, email))")
        .eq("teacher_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    setBusy(true);
    const { error } = await supabase.from("teams").insert({ teacher_id: user.id, name: name.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Team created");
    setName("");
    qc.invalidateQueries({ queryKey: ["teacher-teams"] });
  };

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Join code copied");
  };

  if (!isPaidPlan(profile?.plan)) {
    return (
      <DashboardShell role="teacher" greeting="My Teams">
        <PageHeader title="My Teams" />
        <PaidGate role="teacher" feature="Teams" />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell role="teacher" greeting="My Teams">
      <PageHeader title="My Teams" desc="Create a class, then share its join code so students can join." />

      <form onSubmit={create} className="glass rounded-2xl p-5 flex flex-col sm:flex-row gap-3 mb-6">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name (e.g. Class 9A Science)" />
        <Button type="submit" disabled={busy || !name.trim()} className="glow" style={{ background: "var(--gradient-primary)" }}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />} Create team
        </Button>
      </form>

      {teams.isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : teams.data && teams.data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.data.map((t: any) => (
            <div key={t.id} className="glass rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:glow">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-semibold"><Users2 className="h-4 w-4 text-primary" /> {t.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{t.team_members?.length ?? 0} student{(t.team_members?.length ?? 0) === 1 ? "" : "s"}</div>
                </div>
                <button onClick={() => copy(t.join_code)} className="flex items-center gap-2 rounded-lg bg-secondary/60 border border-border px-3 py-1.5 hover:bg-secondary transition-colors">
                  <span className="font-mono text-sm tracking-widest">{t.join_code}</span>
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
              {t.team_members?.length > 0 && (
                <ul className="mt-4 space-y-1.5 border-t border-border pt-3">
                  {t.team_members.map((m: any) => (
                    <li key={m.student_id} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UserRound className="h-3.5 w-3.5" />
                      {m.profiles?.username ?? m.profiles?.email ?? "Student"}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">
          No teams yet. Create your first team above to start sharing quizzes and worksheets.
        </div>
      )}
    </DashboardShell>
  );
}
