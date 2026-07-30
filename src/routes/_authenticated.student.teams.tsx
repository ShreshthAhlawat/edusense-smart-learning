import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Users2, Loader2, LogIn } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/teams")({
  head: () => ({
    meta: [
      { title: "My Teams — EduSense" },
      { name: "description", content: "Join your teacher's class with a code and see everything they've shared with your team." },
      { property: "og:title", content: "My Teams — EduSense" },
      { property: "og:description", content: "Join your teacher's class with a code and see everything they've shared with your team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentTeams,
});

function StudentTeams() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const teams = useQuery({
    queryKey: ["student-teams", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("joined_at, teams(id, name, join_code)")
        .eq("student_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("join_team_by_code", { _code: code.trim().toUpperCase() });
    setBusy(false);
    if (error) return toast.error(error.message);
    const res = data as any;
    if (res?.ok === false) return toast.error(res.error ?? "Invalid code");
    toast.success("You've joined the team!");
    setCode("");
    qc.invalidateQueries({ queryKey: ["student-teams"] });
  };

  return (
    <DashboardShell role="student" greeting="My Teams">
      <PageHeader title="My Teams" desc="Join your class with the code your teacher gave you — always free." />

      <form onSubmit={join} className="glass rounded-2xl p-5 flex flex-col sm:flex-row gap-3 mb-6 max-w-lg">
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Enter join code" className="font-mono tracking-widest" />
        <Button type="submit" disabled={busy || !code.trim()} className="glow" style={{ background: "var(--gradient-primary)" }}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <LogIn className="h-4 w-4 mr-1" />} Join team
        </Button>
      </form>

      {teams.isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : teams.data && teams.data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.data.map((m: any) => (
            <div key={m.teams?.id} className="glass rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:glow">
              <div className="flex items-center gap-2 font-semibold"><Users2 className="h-4 w-4 text-primary" /> {m.teams?.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">Joined {new Date(m.joined_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">
          You haven’t joined any teams yet. Ask your teacher for a join code.
        </div>
      )}
    </DashboardShell>
  );
}
