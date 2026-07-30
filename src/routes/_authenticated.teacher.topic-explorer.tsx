import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { DashboardShell, PageHeader, PaidGate, isPaidPlan } from "@/components/DashboardShell";
import { TopicExplorer } from "@/components/TopicExplorer";

export const Route = createFileRoute("/_authenticated/teacher/topic-explorer")({
  head: () => ({
    meta: [
      { title: "Topic Explorer — EduSense Teacher" },
      { name: "description", content: "Browse common topics by class and subject and get instant AI-generated study overviews." },
      { property: "og:title", content: "Topic Explorer — EduSense Teacher" },
      { property: "og:description", content: "Browse common topics by class and subject and get instant AI-generated study overviews." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { profile } = useAuth();
  return (
    <DashboardShell role="teacher" greeting="Topic Explorer">
      <PageHeader title="Topic Explorer" desc="Common topics by class and subject, with AI-generated overviews." />
      {isPaidPlan(profile?.plan) ? <TopicExplorer /> : <PaidGate role="teacher" feature="Topic Explorer" />}
    </DashboardShell>
  );
}
