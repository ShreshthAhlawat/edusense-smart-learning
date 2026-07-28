import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { createRazorpayOrder, confirmDemoPayment, redeemSchoolCode, submitSchoolRequest } from "@/lib/payments.functions";
import { isPaidPlan } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, Sparkles, Loader2, Ticket, QrCode, X, Building2 } from "lucide-react";

type Role = "teacher" | "student";

const PLAN_DEFS: Record<Role, { key: string; name: string; price: string; features: string[]; featured?: boolean; upgradeKey?: "student-pro" | "teacher-pro"; enterprise?: boolean }[]> = {
  teacher: [
    { key: "free", name: "Free", price: "₹0", features: ["Quiz generator (limited)", "Basic analytics", "1 class"] },
    { key: "pro", name: "Teacher Pro", price: "₹149/mo", features: ["Unlimited AI-generated quizzes", "AI content generator", "Struggling-topic insights", "VR/3D library"], featured: true, upgradeKey: "teacher-pro" },
    { key: "school-pro", name: "School", price: "Custom", features: ["All Pro features", "Bulk teacher & student seats", "Priority support"], enterprise: true },
  ],
  student: [
    { key: "free", name: "Free", price: "₹0", features: ["Quiz practice", "Homework tracker", "Progress dashboard"] },
    { key: "pro", name: "Student Pro", price: "₹99/mo", features: ["AI Chatbot", "PDF Summarizer", "Story Generator", "Topic Explainer", "Confidence Booster", "VR/3D library"], featured: true, upgradeKey: "student-pro" },
    { key: "school-pro", name: "School", price: "Custom", features: ["Unlocked by your school", "All Pro features"], enterprise: true },
  ],
};

export function PlansView({ role }: { role: Role }) {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const createOrder = useServerFn(createRazorpayOrder);
  const confirm = useServerFn(confirmDemoPayment);
  const redeem = useServerFn(redeemSchoolCode);
  const requestSchool = useServerFn(submitSchoolRequest);

  const [order, setOrder] = useState<null | { orderId: string; qrUrl: string; upiIntent: string; amountInr: number; mode: string; plan: "student-pro" | "teacher-pro" }>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [submittingSchool, setSubmittingSchool] = useState(false);
  const [schoolForm, setSchoolForm] = useState({
    school_name: "", contact_person: profile?.username ?? "",
    contact_email: profile?.email ?? "", contact_phone: "",
    estimated_students: "", estimated_teachers: "", notes: "",
  });

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

  const submitSchool = async () => {
    if (!schoolForm.school_name.trim() || !schoolForm.contact_person.trim() || !schoolForm.contact_email.trim()) {
      return toast.error("Please fill in school name, contact person and email.");
    }
    setSubmittingSchool(true);
    try {
      const res = await requestSchool({ data: {
        school_name: schoolForm.school_name,
        contact_person: schoolForm.contact_person,
        contact_email: schoolForm.contact_email,
        contact_phone: schoolForm.contact_phone || null,
        estimated_students: schoolForm.estimated_students ? Number(schoolForm.estimated_students) : null,
        estimated_teachers: schoolForm.estimated_teachers ? Number(schoolForm.estimated_teachers) : null,
        notes: schoolForm.notes || null,
      }});
      if (!res.ok) throw new Error(res.error ?? "Could not submit");
      toast.success("Thanks — we'll get back to you within 1 business day.");
      setSchoolOpen(false);
      setSchoolForm({ ...schoolForm, school_name: "", contact_phone: "", estimated_students: "", estimated_teachers: "", notes: "" });
    } catch (e: any) {
      toast.error(e.message ?? "Could not submit");
    } finally {
      setSubmittingSchool(false);
    }
  };

  const plans = PLAN_DEFS[role];
  const currentPlan = profile?.plan ?? "free";
  const pro = isPaidPlan(profile?.plan);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((p) => {
          const active = currentPlan === p.key || (p.key === "pro" && pro && currentPlan !== "school-pro");
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
              ) : p.enterprise ? (
                <Button
                  onClick={() => setSchoolOpen(true)}
                  className="mt-6 w-full"
                  variant="secondary"
                >
                  <Building2 className="h-4 w-4 mr-2" /> Request a School License
                </Button>
              ) : (
                <Button disabled className="mt-6 w-full" variant="secondary">{active ? "Current plan" : "Free forever"}</Button>
              )}
            </div>
          );
        })}
      </div>

      {/* School code redemption — works for both teachers and students */}
      <div className="mt-8 glass rounded-2xl p-6 max-w-xl">
        <div className="flex items-center gap-2 mb-3">
          <Ticket className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Have a school code?</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">Redeem your school license code to unlock full access — works for both teachers and students.</p>
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

      {schoolOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !submittingSchool && setSchoolOpen(false)}>
          <div className="glass-strong rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Request a School License</h3>
              </div>
              <button onClick={() => !submittingSchool && setSchoolOpen(false)} className="rounded-md glass p-1.5"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">School plans are custom-priced. Fill this in and our team will get back to you.</p>
            <div className="space-y-3">
              <div><Label className="text-xs">School name *</Label><Input value={schoolForm.school_name} onChange={(e) => setSchoolForm({ ...schoolForm, school_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Contact person *</Label><Input value={schoolForm.contact_person} onChange={(e) => setSchoolForm({ ...schoolForm, contact_person: e.target.value })} /></div>
                <div><Label className="text-xs">Contact email *</Label><Input type="email" value={schoolForm.contact_email} onChange={(e) => setSchoolForm({ ...schoolForm, contact_email: e.target.value })} /></div>
              </div>
              <div><Label className="text-xs">Contact phone</Label><Input value={schoolForm.contact_phone} onChange={(e) => setSchoolForm({ ...schoolForm, contact_phone: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Est. students</Label><Input type="number" min={0} value={schoolForm.estimated_students} onChange={(e) => setSchoolForm({ ...schoolForm, estimated_students: e.target.value })} /></div>
                <div><Label className="text-xs">Est. teachers</Label><Input type="number" min={0} value={schoolForm.estimated_teachers} onChange={(e) => setSchoolForm({ ...schoolForm, estimated_teachers: e.target.value })} /></div>
              </div>
              <div><Label className="text-xs">Anything else?</Label>
                <textarea rows={3} value={schoolForm.notes} onChange={(e) => setSchoolForm({ ...schoolForm, notes: e.target.value })} className="w-full rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm" />
              </div>
            </div>
            <Button onClick={submitSchool} disabled={submittingSchool} className="mt-5 w-full glow" style={{ background: "var(--gradient-primary)" }}>
              {submittingSchool ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit request
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
