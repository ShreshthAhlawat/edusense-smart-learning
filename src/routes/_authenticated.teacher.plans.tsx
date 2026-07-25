import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const PLANS = [
  { key: "free", name: "Free", price: "$0", features: ["Quiz generator (5/mo)", "Basic analytics", "1 class"] },
  { key: "pro", name: "Teacher Pro", price: "$9/mo", features: ["Unlimited quizzes", "Struggling-topic insights", "All AI tools", "Priority support"], featured: true },
  { key: "school", name: "School", price: "Contact", features: ["All Pro features", "Unlimited teachers", "SSO", "Dedicated success manager"] },
];

function makePlansPage(role: "teacher" | "student") {
  return function Plans() {
    const { user, profile, refreshProfile } = useAuth();
    const [loading, setLoading] = useState<string | null>(null);

    const upgrade = async (planKey: string) => {
      if (!user) return;
      setLoading(planKey);
      // Simulated Stripe test checkout — in production this hits a serverFn creating a Checkout Session.
      await new Promise((r) => setTimeout(r, 900));
      const newPlan = planKey === "pro" ? "pro" : planKey === "school" ? "pro" : "free";
      const { error } = await supabase.from("profiles").update({ plan: newPlan }).eq("id", user.id);
      setLoading(null);
      if (error) return toast.error(error.message);
      await refreshProfile();
      toast.success(planKey === "free" ? "Switched to Free" : `Test payment complete — ${planKey.toUpperCase()} unlocked!`);
    };

    return (
      <DashboardShell role={role} greeting="Plans & Pricing">
        <PageHeader title="Choose your plan" desc="Test-mode Stripe integration — try upgrading to unlock all paid tools instantly." />
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
                  disabled={loading !== null || active}
                  onClick={() => upgrade(p.key)}
                  className="mt-6 w-full"
                  style={p.featured ? { background: "var(--gradient-primary)" } : undefined}
                  variant={p.featured ? "default" : "secondary"}
                >
                  {active ? "Current plan" : loading === p.key ? "Processing…" : "Upgrade"}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Payments run in Stripe test mode. Real card capture is disabled during preview.
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
