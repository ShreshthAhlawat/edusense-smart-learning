import { createFileRoute, redirect } from "@tanstack/react-router";
import { PAYMENTS_ENABLED } from "@/lib/features";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { PlansView } from "@/components/PlansView";

export const Route = createFileRoute("/_authenticated/student/plans")({
  // Payments are disabled during testing — this page stays in the codebase
  // but is redirected so it cannot be reached.
  beforeLoad: () => {
    if (!PAYMENTS_ENABLED) throw redirect({ to: "/student/dashboard" });
  },
  head: () => ({ meta: [
    { title: "Plans & Pricing — EduSense" },
    { name: "description", content: "Unlock premium AI tools with EduSense Pro." },
    { property: "og:title", content: "Plans & Pricing — EduSense" },
    { property: "og:description", content: "Unlock premium AI tools with EduSense Pro." },
  ] }),
  component: () => (
    <DashboardShell role="student" greeting="Plans & Pricing">
      <PageHeader title="Choose your plan" desc="Pay securely by UPI — server-verified unlock." />
      <PlansView role="student" />
    </DashboardShell>
  ),
});
