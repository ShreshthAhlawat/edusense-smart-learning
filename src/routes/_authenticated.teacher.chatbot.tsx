import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { DashboardShell, PageHeader, PaidGate, isPaidPlan } from "@/components/DashboardShell";
import { ChatPanel } from "@/components/ChatPanel";

export const Route = createFileRoute("/_authenticated/teacher/chatbot")({
  head: () => ({
    meta: [
      { title: "AI Teaching Assistant — EduSense" },
      { name: "description", content: "Plan lessons, build rubrics and get classroom ideas from your AI teaching assistant." },
      { property: "og:title", content: "AI Teaching Assistant — EduSense" },
      { property: "og:description", content: "Plan lessons, build rubrics and get classroom ideas from your AI teaching assistant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeacherChatbot,
});

function TeacherChatbot() {
  const { profile } = useAuth();
  return (
    <DashboardShell role="teacher" greeting="AI Assistant">
      <PageHeader title="AI Teaching Assistant" desc="Lesson planning, concept explanations and classroom support." />
      {isPaidPlan(profile?.plan) ? (
        <ChatPanel
          persona="teacher"
          heading="How can I help you teach today?"
          blurb="Ask about lesson plans, activities, rubrics or tricky concepts."
          suggestions={[
            "Plan a 40-minute lesson on photosynthesis",
            "Give me a rubric for a Class 9 essay",
            "Ideas to explain fractions to strugglers",
          ]}
        />
      ) : (
        <PaidGate role="teacher" feature="AI Assistant" />
      )}
    </DashboardShell>
  );
}
