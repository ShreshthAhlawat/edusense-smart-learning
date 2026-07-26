import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { useAuth } from "@/lib/auth";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const PLANS = [
  { key: "free", name: "Free", price: "$0", features: ["Quiz practice", "Homework tracker", "Progress dashboard"] },
  { key: "pro", name: "Student Pro", price: "$5/mo", features: ["All Free features", "AI Chatbot", "PDF Summarizer", "Story Generator", "Confidence Booster", "Topic Explainer", "AR Learning"], featured: true },
  { key: "school", name: "School", price: "Provided", features: ["Everything in Pro", "Managed by your school", "Priority support"] },
];

export const Route = createFileRoute("/_authenticated/student/plans")({
  head: () => ({ meta: [
    { title: "Plans — EduSense" },
    { name: "description", content: "Upgrade to unlock all EduSense student tools." },
    { property: "og:title", content: "Plans — EduSense" },
    { property: "og:description", content: "Upgrade to unlock all EduSense student tools." },
  ] }),
  component: StudentPlans,
});

function StudentPlans() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const upgrade = async (planKey: string) => {
    if (planKey === "free") return;
    setLoading(planKey);
    await new Promise((r) => setTimeout(r, 500));
    toast.success("Opening secure checkout…");
    navigate({ to: "/payment-success", search: { plan: planKey === "school" ? "school" : "pro" } });
  };

  return (
    <DashboardShell role="student" greeting="Plans & Pricing">
      <PageHeader title="Choose your plan" desc="Secure Stripe test-mode checkout — server-verified unlock, no card charged." />
      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((p) => {
          const active = (profile?.plan ?? "free") === (p.key === "school" ? "pro" : p.key);
          return (
            <div key={p.key} className={"glass rounded-2xl p-6 relative overflow-hidden " + (p.featured ? "ring-1 ring-primary/60 glow" : "")}>
              {p.featured && <div className="absolute top-3 right-3 text-[10px] px-2 py-1 rounded-full bg-primary/30 border border-primary/60 flex items-center gap-1"><Sparkles className="h-3 w-3" /> Popular</div>}
              <div className="text-sm text-muted-foreground">{p.name}</div>
              <div className="mt-1 text-3xl font-bold">{p.price}</div>
              <ul className="mt-4 space-y-2 text-sm">
                {p.features.map((f) => (<li key={f} className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-0.5" />{f}</li>))}
              </ul>
              <Button disabled={loading !== null || active || p.key === "free"} onClick={() => upgrade(p.key)} className="mt-6 w-full"
                style={p.featured ? { background: "var(--gradient-primary)" } : undefined}
                variant={p.featured ? "default" : "secondary"}>
                {active ? "Current plan" : p.key === "free" ? "Free forever" : loading === p.key ? "Redirecting…" : "Upgrade"}
              </Button>
            </div>
          );
        })}
      </div>
    </DashboardShell>
  );
}

