import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { SamplePaperTool } from "@/components/SamplePaperTool";

export const Route = createFileRoute("/_authenticated/teacher/sample-paper")({
  head: () => ({ meta: [
    { title: "Sample Paper Generator — EduSense" },
    { name: "description", content: "Generate a printable sample paper mixing MCQs and written questions across topics." },
    { property: "og:title", content: "Sample Paper Generator — EduSense" },
    { property: "og:description", content: "Printable sample papers across multiple topics." },
  ] }),
  component: () => (
    <DashboardShell role="teacher" greeting="Sample Paper Generator">
      <PageHeader title="Generate a sample paper" desc="Enter 2–5 topics — Gemini creates a printable paper with MCQ + written sections and an answer key." />
      <SamplePaperTool />
    </DashboardShell>
  ),
});
