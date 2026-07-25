import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { Lock, MessageSquare, FileText, BookMarked, Rocket, Compass, Glasses } from "lucide-react";

const TOOLS: Record<string, { title: string; desc: string; icon: any }> = {
  chatbot: { title: "AI Chatbot", desc: "Ask any doubt — get a friendly, curriculum-aware answer.", icon: MessageSquare },
  "pdf-summarizer": { title: "PDF Summarizer", desc: "Drop a PDF and get key concepts in seconds.", icon: FileText },
  "story-generator": { title: "Story Generator", desc: "Turn any concept into a memorable short story.", icon: BookMarked },
  "confidence-booster": { title: "Confidence Booster", desc: "Personalized encouragement based on your progress.", icon: Rocket },
  "topic-explainer": { title: "Topic Explainer", desc: "Get any concept explained at your level.", icon: Compass },
  "ar-learning": { title: "AR Learning", desc: "Immersive AR experiences for classroom concepts.", icon: Glasses },
};

export const Route = createFileRoute("/_authenticated/student/tool/$slug")({
  head: () => ({ meta: [
    { title: "AI Tool — EduSense" },
    { name: "description", content: "Premium AI learning tool." },
    { property: "og:title", content: "AI Tool — EduSense" },
    { property: "og:description", content: "Premium AI learning tool." },
  ] }),
  component: ToolPage,
});

function ToolPage() {
  const { slug } = Route.useParams();
  const { profile } = useAuth();
  const tool = TOOLS[slug];
  const unlocked = profile?.plan === "pro" || profile?.plan === "admin";

  if (!tool) return <DashboardShell role="student"><PageHeader title="Tool not found" /></DashboardShell>;
  const Icon = tool.icon;

  return (
    <DashboardShell role="student" greeting={tool.title}>
      <PageHeader title={tool.title} desc={tool.desc} />
      {!unlocked ? (
        <div className="glass rounded-2xl p-10 text-center max-w-lg mx-auto">
          <div className="mx-auto h-14 w-14 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <Lock className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">Upgrade to access</h2>
          <p className="mt-2 text-sm text-muted-foreground">This tool is part of the Pro plan. Upgrade to unlock {tool.title} and all premium tools.</p>
          <Link to="/student/plans" className="mt-6 inline-flex rounded-xl px-5 py-2.5 text-sm font-medium text-primary-foreground glow" style={{ background: "var(--gradient-primary)" }}>
            See plans
          </Link>
        </div>
      ) : (
        <div className="glass rounded-2xl p-10 text-center max-w-lg mx-auto">
          <div className="mx-auto h-14 w-14 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <Icon className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">{tool.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You have access! The full AI experience is being finalized — this placeholder confirms your plan unlocks it.
          </p>
        </div>
      )}
    </DashboardShell>
  );
}
