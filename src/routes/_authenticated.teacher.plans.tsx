import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { PlansView } from "@/components/PlansView";

export const Route = createFileRoute("/_authenticated/teacher/plans")({
  head: () => ({ meta: [
    { title: "Plans & Pricing — EduSense" },
    { name: "description", content: "Teacher Pro and School plans for EduSense — pay by UPI." },
    { property: "og:title", content: "Plans & Pricing — EduSense" },
    { property: "og:description", content: "Teacher Pro and School plans for EduSense." },
  ] }),
  component: () => (
    <DashboardShell role="teacher" greeting="Plans & Pricing">
      <PageHeader title="Choose your plan" desc="Pay securely by UPI — server-verified unlock." />
      <PlansView role="teacher" />
    </DashboardShell>
  ),
});
