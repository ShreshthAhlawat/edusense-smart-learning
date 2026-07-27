import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { createRazorpayOrder, confirmDemoPayment, redeemSchoolCode } from "@/lib/payments.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, Sparkles, Loader2, Ticket, QrCode, X } from "lucide-react";

type Role = "teacher" | "student";

const PLAN_DEFS: Record<Role, { key: string; name: string; price: string; features: string[]; featured?: boolean; upgradeKey?: "student-pro" | "teacher-pro" }[]> = {
  teacher: [
    { key: "free", name: "Free", price: "₹0", features: ["Quiz generator (limited)", "Basic analytics", "1 class"] },
    { key: "pro", name: "Teacher Pro", price: "₹149/mo", features: ["Unlimited AI-generated quizzes", "AI content generator", "Struggling-topic insights", "VR/3D library"], featured: true, upgradeKey: "teacher-pro" },
    { key: "school-pro", name: "School", price: "Redeem code", features: ["All Pro features", "For schools", "Bulk teacher & student seats"] },
  ],
  student: [
    { key: "free", name: "Free", price: "₹0", features: ["Quiz practice", "Homework tracker", "Progress dashboard"] },
    { key: "pro", name: "Student Pro", price: "₹99/mo", features: ["AI Chatbot", "PDF Summarizer", "Story Generator", "Topic Explainer", "Confidence Booster", "VR/3D library"], featured: true, upgradeKey: "student-pro" },
    { key: "school-pro", name: "School", price: "Redeem code", features: ["Unlocked by your school", "All Pro features"] },
  ],
};

export function PlansView({ role }: { role: Role }) {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const createOrder = useServerFn(createRazorpayOrder);
  const confirm = useServerFn(confirmDemoPayment);
  const redeem = useServerFn(redeemSchoolCode);

  const [order, setOrder] = useState<null | { orderId: string; qrUrl: string; upiIntent: string; amountInr: number; mode: string; plan: "student-pro" | "teacher-pro" }>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const upgrade = async (planKey: "student-pro" | "teacher-pro") => {
    setLoading(planKey);
    try {
      const o = await createOrder({ data: { plan: planKey } });
      setOrder(o);
    } catch (e: any) {
      toast.error(e.message ?? "Could not start payment");
    } finally {
      setLoading(null);
    }
  };

  const verify = async () => {
    if (!order) return;
    setVerifying(true);
    try {
      const res = await confirm({ data: { orderId: order.orderId, plan: order.plan } });
      if (!res.ok) throw new Error(res.error ?? "Verification failed");
      await refreshProfile();
      setOrder(null);
      navigate({ to: "/payment-success", search: { plan: "pro" } });
    } catch (e: any) {
      toast.error(e.message ?? "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const doRedeem = async () => {
    if (!code.trim()) return;
    setRedeeming(true);
    try {
      const res = await redeem({ data: { code } });
      if (!res.ok) throw new Error(res.error ?? "Invalid code");
      await refreshProfile();
      toast.success("School plan unlocked!");
      setCode("");
    } catch (e: any) {
      toast.error(e.message ?? "Could not redeem");
    } finally {
      setRedeeming(false);
    }
  };

  const plans = PLAN_DEFS[role];
  const currentPlan = profile?.plan ?? "free";

  return (
    <>
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((p) => {
          const active = currentPlan === p.key || (p.key === "pro" && currentPlan === "admin");
          return (
            <div key={p.key} className={"glass rounded-2xl p-6 relative overflow-hidden hover:-translate-y-0.5 transition-all " + (p.featured ? "ring-1 ring-primary/60 glow" : "")}>
              {p.featured && (
                <div className="absolute top-3 right-3 text-[10px] px-2 py-1 rounded-full bg-primary/30 border border-primary/60 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Popular
                </div>
              )}
              <div className="text-sm text-muted-foreground">{p.name}</div>
              <div className="mt-1 text-3xl font-bold">{p.price}</div>
              <ul className="mt-4 space-y-2 text-sm">
                {p.features.map((f) => <li key={f} className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-0.5" />{f}</li>)}
              </ul>
              {p.upgradeKey ? (
                <Button
                  disabled={loading !== null || active}
                  onClick={() => upgrade(p.upgradeKey!)}
                  className="mt-6 w-full"
                  style={p.featured ? { background: "var(--gradient-primary)" } : undefined}
                  variant={p.featured ? "default" : "secondary"}
                >
                  {active ? "Current plan" : loading === p.upgradeKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <><QrCode className="h-4 w-4 mr-2" /> Pay by UPI</>}
                </Button>
              ) : p.key === "school-pro" ? (
                <p className="mt-6 text-xs text-muted-foreground">Enter your school code below to unlock.</p>
              ) : (
                <Button disabled className="mt-6 w-full" variant="secondary">{active ? "Current plan" : "Free forever"}</Button>
              )}
            </div>
          );
        })}
      </div>

      {/* School code redemption */}
      <div className="mt-8 glass rounded-2xl p-6 max-w-xl">
        <div className="flex items-center gap-2 mb-3">
          <Ticket className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Have a school code?</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">Redeem your school license code to unlock full access.</p>
        <div className="flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="EDUXXXXX" className="font-mono tracking-widest" />
          <Button onClick={doRedeem} disabled={redeeming || !code.trim()} style={{ background: "var(--gradient-primary)" }} className="glow">
            {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Redeem"}
          </Button>
        </div>
      </div>

      {order && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !verifying && setOrder(null)}>
          <div className="glass-strong rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-semibold">Scan to pay ₹{order.amountInr}</div>
                <div className="text-xs text-muted-foreground">Any UPI app — GPay, PhonePe, Paytm…</div>
              </div>
              <button onClick={() => !verifying && setOrder(null)} className="rounded-md glass p-1.5"><X className="h-4 w-4" /></button>
            </div>
            <div className="rounded-xl bg-white p-4 flex items-center justify-center">
              <img src={order.qrUrl} alt="UPI QR" width={280} height={280} />
            </div>
            <a href={order.upiIntent} className="mt-3 block text-center text-xs text-primary hover:underline">Open UPI app directly</a>
            <p className="mt-4 text-[11px] text-muted-foreground text-center">
              {order.mode === "razorpay" ? "Order via Razorpay. After paying, your plan will unlock automatically via webhook." : "Test-mode UPI QR. Tap the button once you've completed the mock payment to unlock."}
            </p>
            <Button onClick={verify} disabled={verifying} className="mt-4 w-full glow" style={{ background: "var(--gradient-primary)" }}>
              {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              I've paid — verify & unlock
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
