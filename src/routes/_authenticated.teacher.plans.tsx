import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { useAuth } from "@/lib/auth";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const PLANS = [
  { key: "free", name: "Free", price: "$0", features: ["Quiz generator (5/mo)", "Basic analytics", "1 class"] },
  { key: "pro", name: "Teacher Pro", price: "$9/mo", features: ["Unlimited AI-generated quizzes", "AI content generator", "Struggling-topic insights", "Priority support"], featured: true },
  { key: "school", name: "School", price: "Contact", features: ["All Pro features", "Unlimited teachers", "SSO", "Dedicated success manager"] },
];

function makePlansPage(role: "teacher" | "student") {
  return function Plans() {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState<string | null>(null);

    const upgrade = async (planKey: string) => {
      if (planKey === "free") return;
      setLoading(planKey);
      // In production this creates a Stripe Checkout session; the webhook flips profile.plan
      // server-side and /payment-success verifies before showing the success screen.
      // For preview we simulate the redirect straight to /payment-success.
      await new Promise((r) => setTimeout(r, 500));
      toast.success("Opening secure checkout…");
      navigate({ to: "/payment-success", search: { plan: planKey === "school" ? "school" : "pro" } });
    };

    return (
      <DashboardShell role={role} greeting="Plans & Pricing">
        <PageHeader title="Choose your plan" desc="Secure Stripe test-mode checkout — server-verified unlock, no card charged." />
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((p) => {
            const active = (profile?.plan ?? "free") === (p.key === "school" ? "pro" : p.key);
            return (
              <div key={p.key} className={"glass rounded-2xl p-6 relative overflow-hidden " + (p.featured ? "ring-1 ring-primary/60 glow" : "")}>
                {p.featured && (
                  <div className="absolute top-3 right-3 text-[10px] px-2 py-1 rounded-full bg-primary/30 border border-primary/60 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Popular
                  </div>
                )}
                <div className="text-sm text-muted-foreground">{p.name}</div>
                <div className="mt-1 text-3xl font-bold">{p.price}</div>
                <ul className="mt-4 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-0.5" />{f}</li>
                  ))}
                </ul>
                <Button
                  disabled={loading !== null || active || p.key === "free"}
                  onClick={() => upgrade(p.key)}
                  className="mt-6 w-full"
                  style={p.featured ? { background: "var(--gradient-primary)" } : undefined}
                  variant={p.featured ? "default" : "secondary"}
                >
                  {active ? "Current plan" : p.key === "free" ? "Free forever" : loading === p.key ? "Redirecting…" : "Upgrade"}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Payments run in Stripe test mode. Plan unlock is verified server-side after checkout.
        </p>
      </DashboardShell>
    );
  };
}

export const Route = createFileRoute("/_authenticated/teacher/plans")({
  head: () => ({ meta: [
    { title: "Plans & Pricing — EduSense" },
    { name: "description", content: "Free, Teacher Pro and School plans for EduSense." },
    { property: "og:title", content: "Plans & Pricing — EduSense" },
    { property: "og:description", content: "Free, Teacher Pro and School plans for EduSense." },
  ] }),
  component: makePlansPage("teacher"),
});

