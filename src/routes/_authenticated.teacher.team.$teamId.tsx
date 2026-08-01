import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardShell, PageHeader, PaidGate, isPaidPlan } from "@/components/DashboardShell";
import { TeamSpace } from "@/components/TeamSpace";
import { Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teacher/team/$teamId")({
  head: () => ({
    meta: [
      { title: "Team Space — EduSense Teacher" },
      { name: "description", content: "Review everything shared with this class and answer student doubts in the team discussion board." },
      { property: "og:title", content: "Team Space — EduSense Teacher" },
      { property: "og:description", content: "Shared class material and the student doubt board for this team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeacherTeamSpace,
});

function TeacherTeamSpace() {
  const { teamId } = Route.useParams();
  const { profile } = useAuth();

  const team = useQuery({
    queryKey: ["team", teamId],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("id, name, join_code").eq("id", teamId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!isPaidPlan(profile?.plan)) {
    return (
      <DashboardShell role="teacher" greeting="Team Space">
        <PageHeader title="Team Space" />
        <PaidGate role="teacher" feature="Teams" />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell role="teacher" greeting="Team Space">
      <Link to="/teacher/teams" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to my teams
      </Link>
      <PageHeader title={team.data?.name ?? "Team"} desc="Everything shared with this class, plus student doubts you can reply to." />
      {team.isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : team.data ? (
        <TeamSpace teamId={teamId} teamName={team.data.name} />
      ) : (
        <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">Team not found.</div>
      )}
    </DashboardShell>
  );
}
