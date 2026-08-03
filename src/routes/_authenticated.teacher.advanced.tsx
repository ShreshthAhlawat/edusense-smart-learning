import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardShell, PageHeader, PaidGate, isPaidPlan } from "@/components/DashboardShell";
import { TimetableManager, useTimetable } from "@/components/TimetableManager";
import { EngagementLive } from "@/components/EngagementLive";
import { EngagementReports } from "@/components/EngagementReports";
import { detectSubject } from "@/lib/engagement";
import { Loader2, Users2, CalendarClock, Radio, BarChart3, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teacher/advanced")({
  head: () => ({ meta: [
    { title: "AI Classroom Engagement Analytics — EduSense" },
    { name: "description", content: "Run on-device AI classroom engagement analytics per class: attendance count, expressions, engagement score and long-term trends." },
    { property: "og:title", content: "AI Classroom Engagement Analytics — EduSense" },
    { property: "og:description", content: "On-device classroom engagement analytics with timetable-based subject detection." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: AdvancedAnalytics,
});

type Tab = "timetable" | "live" | "reports";

function AdvancedAnalytics() {
  const { user, profile } = useAuth();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("live");

  const teams = useQuery({
    queryKey: ["teacher-teams-engagement", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, join_code")
        .eq("teacher_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const timetable = useTimetable(teamId ?? "");

  if (!isPaidPlan(profile?.plan)) {
    return (
      <DashboardShell role="teacher" greeting="Advanced Analytics">
        <PageHeader title="AI Classroom Engagement Analytics" />
        <PaidGate role="teacher" feature="AI Classroom Engagement Analytics" />
      </DashboardShell>
    );
  }

  const team = teams.data?.find((t: any) => t.id === teamId) ?? null;

  if (!teamId || !team) {
    return (
      <DashboardShell role="teacher" greeting="Advanced Analytics">
        <PageHeader
          title="AI Classroom Engagement Analytics"
          desc="Pick the class you're teaching. Everything — face detection, expressions, engagement scoring — runs on-device in your browser."
        />
        {teams.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : teams.data && teams.data.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.data.map((t: any) => (
              <button key={t.id} onClick={() => setTeamId(t.id)} className="glass rounded-2xl p-6 text-left transition-all hover:-translate-y-0.5 hover:glow">
                <div className="flex items-center gap-2 font-semibold"><Users2 className="h-4 w-4 text-primary" /> {t.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">Join code {t.join_code}</div>
                <div className="mt-4 text-sm text-primary">Open analytics →</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">
            Create a team on the Teams page first — engagement analytics are always scoped to one class.
          </div>
        )}

        <div className="mt-8">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground">All saved sessions</h2>
          {user && <EngagementReports teacherId={user.id} teams={(teams.data ?? []) as any} />}
        </div>
      </DashboardShell>
    );
  }

  const current = detectSubject(timetable.data ?? []);
  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "live", label: "Live session", icon: Radio },
    { id: "timetable", label: "Timetable", icon: CalendarClock },
    { id: "reports", label: "Reports", icon: BarChart3 },
  ];

  return (
    <DashboardShell role="teacher" greeting="Advanced Analytics">
      <button onClick={() => setTeamId(null)} className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All classes
      </button>
      <PageHeader
        title={team.name}
        desc={current ? `Right now: ${current.subject} (period ${current.period})` : "No period scheduled for this moment — upload or edit the timetable."}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm transition-all ${tab === t.id ? "text-primary-foreground glow" : "border border-border bg-secondary/40 hover:bg-secondary"}`}
            style={tab === t.id ? { background: "var(--gradient-primary)" } : undefined}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "timetable" && user && (
        <TimetableManager teamId={team.id} teacherId={user.id} teamName={team.name} />
      )}

      {tab === "live" && user && (
        timetable.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <EngagementLive
            teamId={team.id}
            teamName={team.name}
            teacherId={user.id}
            teacherName={profile?.username ?? profile?.email ?? "Teacher"}
            timetable={timetable.data ?? []}
          />
        )
      )}

      {tab === "reports" && user && (
        <EngagementReports teacherId={user.id} teams={(teams.data ?? []) as any} />
      )}
    </DashboardShell>
  );
}
