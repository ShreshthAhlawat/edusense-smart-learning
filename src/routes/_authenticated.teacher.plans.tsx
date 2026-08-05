import { createFileRoute, redirect } from "@tanstack/react-router";
import { PAYMENTS_ENABLED } from "@/lib/features";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { PlansView } from "@/components/PlansView";

export const Route = createFileRoute("/_authenticated/teacher/plans")({
  // Payments are disabled during testing — this page stays in the codebase
  // but is redirected so it cannot be reached.
  beforeLoad: () => {
    if (!PAYMENTS_ENABLED) throw redirect({ to: "/teacher/dashboard" });
  },
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
