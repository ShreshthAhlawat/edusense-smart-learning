import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { BookOpen, Beaker, Globe2, Landmark, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/quiz-practice")({
  head: () => ({ meta: [
    { title: "Quiz Practice — EduSense" },
    { name: "description", content: "Pick a subject and practice quizzes tailored to your class." },
    { property: "og:title", content: "Quiz Practice — EduSense" },
    { property: "og:description", content: "Pick a subject and practice quizzes." },
  ] }),
  component: QuizPractice,
});

const SUBJECTS = [
  { key: "Math", icon: BookOpen, active: true },
  { key: "Science", icon: Beaker, active: true },
  { key: "English", icon: Globe2, active: true },
  { key: "History", icon: Landmark, active: false },
];

function QuizPractice() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const quizzes = useQuery({
    queryKey: ["all-quizzes"],
    queryFn: async () => (await supabase.from("quizzes").select("id, title, subject").order("created_at", { ascending: false })).data ?? [],
    enabled: !!user,
  });

  return (
    <DashboardShell role="student" greeting="Quiz Practice">
      <PageHeader title="Pick a subject" desc="Practice with quizzes created by your teachers." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUBJECTS.map((s) => {
          const has = (quizzes.data ?? []).filter((q) => q.subject === s.key);
          return (
            <div key={s.key} className={"glass rounded-2xl p-6 relative " + (s.active ? "hover:-translate-y-0.5 hover:glow transition-all cursor-pointer" : "opacity-60")}>
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "var(--gradient-primary)" }}>
                {s.active ? <s.icon className="h-5 w-5 text-primary-foreground" /> : <Lock className="h-5 w-5 text-primary-foreground" />}
              </div>
              <div className="font-semibold">{s.key}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {s.active ? `${has.length} quiz${has.length === 1 ? "" : "zes"} available` : "Coming soon"}
              </div>
              {s.active && has.length > 0 && (
                <div className="mt-3 space-y-1">
                  {has.slice(0, 3).map((q) => (
                    <button key={q.id} onClick={() => navigate({ to: "/student/quiz/$quizId", params: { quizId: q.id } })}
                      className="block w-full text-left text-xs text-primary hover:underline truncate">
                      → {q.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </DashboardShell>
  );
}
