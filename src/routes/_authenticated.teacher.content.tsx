import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { FileText, BookMarked, Compass, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teacher/content")({
  head: () => ({ meta: [
    { title: "Content Generators — EduSense" },
    { name: "description", content: "AI-assisted content generators for teachers." },
    { property: "og:title", content: "Content Generators — EduSense" },
    { property: "og:description", content: "AI-assisted content generators for teachers." },
  ] }),
  component: () => (
    <DashboardShell role="teacher" greeting="Content Generators">
      <PageHeader title="Content Generators" desc="Generate lesson materials, summaries and stories." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { icon: FileText, title: "Lesson Notes", desc: "Detailed notes on any topic." },
          { icon: BookMarked, title: "Story Generator", desc: "Engaging stories to illustrate concepts." },
          { icon: Compass, title: "Topic Explainer", desc: "Clear, kid-friendly explanations." },
          { icon: Sparkles, title: "Worksheet Builder", desc: "Printable worksheets in seconds." },
        ].map((t) => (
          <div key={t.title} className="glass rounded-2xl p-6 hover:-translate-y-0.5 hover:glow transition-all cursor-pointer">
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
              <t.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="font-semibold">{t.title}</div>
            <div className="text-sm text-muted-foreground mt-1">{t.desc}</div>
            <div className="mt-4 text-xs text-primary">Coming soon</div>
          </div>
        ))}
      </div>
    </DashboardShell>
  ),
});
