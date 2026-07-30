import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { DashboardShell, PageHeader, PaidGate, isPaidPlan } from "@/components/DashboardShell";
import { TopicExplorer } from "@/components/TopicExplorer";

export const Route = createFileRoute("/_authenticated/student/topic-explorer")({
  head: () => ({
    meta: [
      { title: "Topic Explorer — EduSense" },
      { name: "description", content: "Pick your class and subject, then get an instant AI-generated study overview of common topics." },
      { property: "og:title", content: "Topic Explorer — EduSense" },
      { property: "og:description", content: "Pick your class and subject, then get an instant AI-generated study overview of common topics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { profile } = useAuth();
  return (
    <DashboardShell role="student" greeting="Topic Explorer">
      <PageHeader title="Topic Explorer" desc="Common topics by class and subject, with AI-generated overviews." />
      {isPaidPlan(profile?.plan) ? <TopicExplorer /> : <PaidGate role="student" feature="Topic Explorer" />}
    </DashboardShell>
  );
}
