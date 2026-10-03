import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Req = { id: string; user_id: string; email: string | null; username: string | null; from_role: string | null; requested_role: string; reason: string | null; status: string; created_at: string };

export function RoleChangeRequestCard() {
  const { user, profile } = useAuth();
  const current = profile?.role ?? "student";
  const target = current === "teacher" ? "student" : "teacher";
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState<Req | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("role_change_requests").select("*").eq("user_id", user.id).eq("status", "pending").maybeSingle();
    setPending((data as Req) ?? null);
  };
  useEffect(() => { load(); }, [user?.id]);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("role_change_requests").insert({
      user_id: user.id, email: profile?.email ?? null, username: profile?.username ?? null,
      from_role: current, requested_role: target as "teacher" | "student", reason: reason.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Request sent to the owner");
    setReason("");
    load();
  };

  return (
    <div className="glass rounded-2xl p-6 max-w-lg space-y-3 mt-6">
      <h3 className="font-semibold">Change role</h3>
      <p className="text-sm text-muted-foreground">You are a <b className="capitalize">{current}</b>. Request to switch to <b className="capitalize">{target}</b> — the owner will review it.</p>
      {pending ? (
        <div className="text-sm rounded-lg border border-primary/40 p-3">Request pending review (sent {new Date(pending.created_at).toLocaleDateString()}).</div>
      ) : (
        <>
          <div><Label>Reason (optional)</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1" maxLength={500} /></div>
          <Button onClick={submit} disabled={busy} variant="secondary">{busy ? "Sending…" : `Request ${target} role`}</Button>
        </>
      )}
    </div>
  );
}

export function RoleRequestsAdmin() {
  const [rows, setRows] = useState<Req[]>([]);
  const load = async () => {
    const { data } = await supabase.from("role_change_requests").select("*").eq("status", "pending").order("created_at", { ascending: false });
    setRows((data as Req[]) ?? []);
  };
  useEffect(() => { load(); }, []);
  const decide = async (id: string, d: "approved" | "denied" | "ignored") => {
    const { data, error } = await supabase.rpc("decide_role_request", { _id: id, _decision: d });
    const res = data as { ok: boolean; error?: string } | null;
    if (error || !res?.ok) return toast.error(error?.message ?? res?.error ?? "Failed");
    toast.success(`Request ${d}`);
    load();
  };
  return (
    <div className="glass rounded-2xl p-6 mt-6">
      <h3 className="font-semibold mb-3">Role change requests</h3>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No pending requests.</p> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-sm">
              <div className="flex-1 min-w-[200px]">
                <div className="font-medium">{r.username ?? r.email}</div>
                <div className="text-xs text-muted-foreground">{r.email} · <span className="capitalize">{r.from_role}</span> → <span className="capitalize">{r.requested_role}</span></div>
                {r.reason && <div className="text-xs mt-1">“{r.reason}”</div>}
              </div>
              <Button size="sm" onClick={() => decide(r.id, "approved")}>Accept</Button>
              <Button size="sm" variant="destructive" onClick={() => decide(r.id, "denied")}>Deny</Button>
              <Button size="sm" variant="ghost" onClick={() => decide(r.id, "ignored")}>Ignore</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const DRAFT_PLANS = {
  student: [
    { name: "Starter", price: "₹49/mo", features: ["Unlimited practice quizzes", "Smart Exam Planner", "Basic score analytics"] },
    { name: "Scholar", price: "₹149/mo", features: ["Everything in Starter", "PDF Summarizer & Story Generator", "Sample paper generator", "AI flashcards"] },
    { name: "Achiever", price: "₹299/mo", features: ["Everything in Scholar", "Confidence Booster coaching", "VR learning models", "Priority AI chatbot"] },
  ],
  teacher: [
    { name: "Classroom", price: "₹199/mo", features: ["Quiz Generator (50/mo)", "1 team, up to 40 students", "Shareable quiz links"] },
    { name: "Educator", price: "₹399/mo", features: ["Everything in Classroom", "Content generators & lesson chat", "5 teams", "Struggling topics insights"] },
    { name: "Department", price: "₹799/mo", features: ["Everything in Educator", "Advanced engagement analytics", "Unlimited teams", "PDF/CSV reports export"] },
  ],
};

export function DraftPlans({ role }: { role: "teacher" | "student" }) {
  return (
    <div className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold">More plans</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-primary/50 text-primary">Coming soon</span>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {DRAFT_PLANS[role].map((p) => (
          <div key={p.name} className="glass rounded-2xl p-6">
            <div className="text-sm text-muted-foreground">{p.name}</div>
            <div className="mt-1 text-2xl font-bold">{p.price}</div>
            <ul className="mt-4 space-y-2 text-sm list-disc pl-5">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
            <Button disabled variant="secondary" className="mt-6 w-full">Coming soon</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
