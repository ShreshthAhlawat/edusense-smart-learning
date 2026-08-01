import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { TeamSpace } from "@/components/TeamSpace";
import { Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/team/$teamId")({
  head: () => ({
    meta: [
      { title: "Team Space — EduSense" },
      { name: "description", content: "See every quiz, worksheet and assignment shared with your class, and ask doubts your classmates can answer." },
      { property: "og:title", content: "Team Space — EduSense" },
      { property: "og:description", content: "Shared class material and a community doubt board for your team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentTeamSpace,
});

function StudentTeamSpace() {
  const { teamId } = Route.useParams();

  const team = useQuery({
    queryKey: ["team", teamId],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("id, name, join_code").eq("id", teamId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <DashboardShell role="student" greeting="Team Space">
      <Link to="/student/teams" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to my teams
      </Link>
      <PageHeader title={team.data?.name ?? "Team"} desc="Shared material from your teacher and a doubt board for your class." />
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
