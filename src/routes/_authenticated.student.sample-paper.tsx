import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { SamplePaperTool } from "@/components/SamplePaperTool";

export const Route = createFileRoute("/_authenticated/student/sample-paper")({
  head: () => ({ meta: [
    { title: "Sample Paper — EduSense" },
    { name: "description", content: "Generate your own printable sample paper for revision." },
    { property: "og:title", content: "Sample Paper — EduSense" },
    { property: "og:description", content: "Free printable sample papers for revision." },
  ] }),
  component: () => (
    <DashboardShell role="student" greeting="Sample Paper">
      <PageHeader title="Make your own sample paper" desc="Enter 2–5 topics you want to revise — get a printable mixed paper with an answer key." />
      <SamplePaperTool />
    </DashboardShell>
  ),
});
