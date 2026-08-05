import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, PageHeader, isPaidPlan } from "@/components/DashboardShell";
import { PAYMENTS_ENABLED } from "@/lib/features";
import { useAuth } from "@/lib/auth";
import { Crown, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";

function makeMyPlan(role: "teacher" | "student") {
  return function MyPlan() {
    const { profile } = useAuth();
    const plan = profile?.plan ?? "free";
    const isPro = isPaidPlan(plan);
    return (
      <DashboardShell role={role} greeting="My Active Plan">
        <PageHeader title="My Active Plan" />
        <div className="glass rounded-2xl p-8 max-w-xl">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
              {isPro ? <Zap className="h-6 w-6 text-primary-foreground" /> : <Crown className="h-6 w-6 text-primary-foreground" />}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Current plan</div>
              <div className="text-2xl font-bold capitalize">{plan}</div>
            </div>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            {isPro
              ? "You have full access to all EduSense features. Manage billing in the customer portal (coming soon)."
              : "You're on the Free plan. Upgrade to unlock all AI-powered tools."}
          </p>
          {PAYMENTS_ENABLED && (
          <Link to={`/${role}/plans`} className="mt-6 inline-flex rounded-xl px-5 py-2.5 text-sm font-medium text-primary-foreground glow" style={{ background: "var(--gradient-primary)" }}>
            {isPro ? "Manage plan" : "Upgrade"}
          </Link>
          )}
        </div>
      </DashboardShell>
    );
  };
}

export const Route = createFileRoute("/_authenticated/teacher/my-plan")({
  head: () => ({ meta: [
    { title: "My Plan — EduSense" },
    { name: "description", content: "Your current EduSense subscription." },
    { property: "og:title", content: "My Plan — EduSense" },
    { property: "og:description", content: "Your current EduSense subscription." },
  ] }),
  component: makeMyPlan("teacher"),
});
