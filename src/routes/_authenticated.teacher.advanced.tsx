import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teacher/advanced")({
  head: () => ({ meta: [
    { title: "Advanced Analytics — EduSense" },
    { name: "description", content: "Reserved for custom analytics script to be connected later." },
    { property: "og:title", content: "Advanced Analytics — EduSense" },
    { property: "og:description", content: "Reserved for custom analytics script." },
  ] }),
  component: () => (
    <DashboardShell role="teacher" greeting="Advanced Analytics">
      <PageHeader title="Advanced Analytics" />
      <div className="glass rounded-2xl p-10 text-center">
        <TrendingUp className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-4 text-lg font-semibold">Reserved</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          This page is reserved for a custom analytics script to be connected later via an external API — not yet built.
        </p>
      </div>
    </DashboardShell>
  ),
});
