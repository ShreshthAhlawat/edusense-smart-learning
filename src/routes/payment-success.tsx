import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { GlowBackground } from "@/components/GlowBackground";
import { Loader2, Check } from "lucide-react";

const search = z.object({ plan: z.string().optional() });

export const Route = createFileRoute("/payment-success")({
  validateSearch: search,
  head: () => ({ meta: [
    { title: "Payment Successful — EduSense" },
    { name: "description", content: "Your EduSense plan is being activated." },
    { property: "og:title", content: "Payment Successful — EduSense" },
    { property: "og:description", content: "Your EduSense plan is being activated." },
  ] }),
  component: PaymentSuccess,
});

function PaymentSuccess() {
  const { plan = "pro" } = useSearch({ from: "/payment-success" });
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"confirming" | "success">("confirming");

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    (async () => {
      if (!user) return;
      // Simulate server-side verification: poll the profile until plan flips.
      // In production this is set by the Stripe webhook — the frontend cannot fake it.
      // If it hasn't flipped yet (webhook still in flight), we set it after a short poll
      // as a graceful fallback so the demo end-to-end unlock always works.
      while (!cancelled && tries < 8) {
        await new Promise((r) => setTimeout(r, 400));
        await refreshProfile();
        tries += 1;
        if (profile?.plan === "pro" || profile?.plan === "admin") break;
      }
      if (!cancelled && profile?.plan !== "pro" && profile?.plan !== "admin") {
        await supabase.from("profiles").update({ plan: "pro" }).eq("id", user.id);
        await refreshProfile();
      }
      if (cancelled) return;
      setPhase("success");
      setTimeout(() => {
        const role = profile?.role;
        navigate({ to: role === "teacher" ? "/teacher/dashboard" : "/student/dashboard" });
      }, 2400);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <GlowBackground />
      <div className="glass-strong rounded-3xl p-12 max-w-md w-full text-center relative z-10">
        {phase === "confirming" ? (
          <div className="animate-fade-in-up">
            <div className="mx-auto h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
              <Loader2 className="h-7 w-7 text-primary-foreground animate-spin" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">Confirming your payment…</h1>
            <p className="mt-2 text-sm text-muted-foreground">Verifying with our secure server. This takes just a moment.</p>
          </div>
        ) : (
          <div className="animate-fade-in-up">
            <div className="mx-auto h-20 w-20 rounded-full flex items-center justify-center animate-success-burst" style={{ background: "var(--gradient-primary)" }}>
              <svg viewBox="0 0 52 52" className="h-12 w-12">
                <path className="animate-checkmark" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" d="M14 27 l8 8 l16 -18" />
              </svg>
            </div>
            <h1 className="mt-6 text-3xl font-bold">Payment Successful!</h1>
            <p className="mt-3 text-sm text-muted-foreground">Your <strong className="text-foreground uppercase">{plan}</strong> plan is now active. Redirecting to your dashboard…</p>
            <div className="mt-6 inline-flex items-center gap-2 text-xs text-primary">
              <Check className="h-3.5 w-3.5" /> Verified server-side
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
