import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, Loader2, X, Copy, KeyRound, Check, Ban, Clock } from "lucide-react";

const STUDENT_PRICE = 99;
const TEACHER_PRICE = 149;

function randomCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "EDU";
  for (let i = 0; i < 7; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

type Req = any;

export function SchoolRequests() {
  const qc = useQueryClient();
  const [accepting, setAccepting] = useState<Req | null>(null);
  const [busy, setBusy] = useState(false);

  const requests = useQuery({
    queryKey: ["owner-school-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("school_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const reject = async (r: Req) => {
    setBusy(true);
    const { error } = await supabase.from("school_requests").update({ status: "rejected" }).eq("id", r.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Request rejected");
    qc.invalidateQueries({ queryKey: ["owner-school-requests"] });
  };

  return (
    <div className="mt-6 glass rounded-2xl p-6" data-reveal>
      <h2 className="font-semibold mb-4 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" /> School license requests
      </h2>

      {requests.isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : (requests.data ?? []).length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-2 pr-3">School</th>
                <th className="py-2 pr-3">Students</th>
                <th className="py-2 pr-3">Teachers</th>
                <th className="py-2 pr-3">Duration</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Requested</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(requests.data ?? []).map((r: Req) => (
                <tr key={r.id} className="border-b border-border/60 align-top">
                  <td className="py-2 pr-3">
                    <div className="font-medium">{r.school_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.contact_person} · <a className="text-primary hover:underline" href={`mailto:${r.contact_email}`}>{r.contact_email}</a>
                    </div>
                  </td>
                  <td className="py-2 pr-3">{r.estimated_students ?? "—"}</td>
                  <td className="py-2 pr-3">{r.estimated_teachers ?? "—"}</td>
                  <td className="py-2 pr-3">{r.duration_months} mo</td>
                  <td className="py-2 pr-3"><StatusBadge status={r.status} /></td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="py-2">
                    {r.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button size="sm" disabled={busy} onClick={() => setAccepting(r)} className="glow" style={{ background: "var(--gradient-primary)" }}>
                          <Check className="h-3.5 w-3.5 mr-1" /> Accept
                        </Button>
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => reject(r)}>Reject</Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No enquiries yet.</p>
      )}

      {accepting && <AcceptModal req={accepting} onClose={() => setAccepting(null)} />}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-500/20 border-amber-500/40 text-amber-400",
    accepted: "bg-primary/20 border-primary/50",
    rejected: "bg-destructive/20 border-destructive/40 text-destructive",
  };
  return <span className={"text-[10px] rounded-full border px-2 py-0.5 capitalize " + (map[status] ?? "bg-secondary border-border")}>{status}</span>;
}

function AcceptModal({ req, onClose }: { req: Req; onClose: () => void }) {
  const qc = useQueryClient();
  const [students, setStudents] = useState<number>(req.estimated_students ?? 100);
  const [teachers, setTeachers] = useState<number>(req.estimated_teachers ?? 10);
  const [months, setMonths] = useState<number>(req.duration_months ?? 12);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  const studentCost = students * STUDENT_PRICE;
  const teacherCost = teachers * TEACHER_PRICE;
  const total = studentCost + teacherCost;

  const chartData = useMemo(() => ([
    { name: "Students", value: studentCost },
    { name: "Teachers", value: teacherCost },
  ]), [studentCost, teacherCost]);

  const generate = async () => {
    setBusy(true);
    const newCode = randomCode();
    const expires = new Date(Date.now() + months * 30 * 24 * 3600 * 1000).toISOString();
    const { data: lic, error } = await supabase
      .from("school_licenses")
      .insert({ code: newCode, max_students: students, max_teachers: teachers, duration_months: months, expires_at: expires, label: req.school_name, request_id: req.id })
      .select()
      .single();
    if (error) { setBusy(false); return toast.error(error.message); }
    const { error: e2 } = await supabase.from("school_requests")
      .update({ status: "accepted", license_id: lic!.id, duration_months: months })
      .eq("id", req.id);
    setBusy(false);
    if (e2) return toast.error(e2.message);
    setCode(newCode);
    toast.success("License code generated");
    qc.invalidateQueries({ queryKey: ["owner-school-requests"] });
    qc.invalidateQueries({ queryKey: ["owner-licenses"] });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <div className="glass-strong rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /> Generate access code — {req.school_name}</h3>
          <button onClick={() => !busy && onClose()} className="rounded-md glass p-1.5"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div><Label className="text-xs">Student seats</Label><Input type="number" min={0} value={students} onChange={(e) => setStudents(Number(e.target.value))} /></div>
          <div><Label className="text-xs">Teacher seats</Label><Input type="number" min={0} value={teachers} onChange={(e) => setTeachers(Number(e.target.value))} /></div>
          <div><Label className="text-xs">Months</Label><Input type="number" min={1} value={months} onChange={(e) => setMonths(Number(e.target.value))} /></div>
        </div>

        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} animationDuration={800}>
                <Cell fill="hsl(217 91% 60%)" />
                <Cell fill="hsl(0 84% 60%)" />
              </Pie>
              <Tooltip formatter={(v: any) => `₹${v}`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl bg-secondary/40 border border-border p-3 text-sm space-y-1">
          <div className="flex justify-between"><span>Students × ₹{STUDENT_PRICE}</span><strong>₹{studentCost.toLocaleString()}</strong></div>
          <div className="flex justify-between"><span>Teachers × ₹{TEACHER_PRICE}</span><strong>₹{teacherCost.toLocaleString()}</strong></div>
          <div className="flex justify-between border-t border-border pt-1 mt-1"><span>Total</span><strong className="text-primary">₹{total.toLocaleString()}</strong></div>
        </div>

        {code ? (
          <div className="mt-4 rounded-xl border border-primary/50 bg-primary/10 p-4 text-center">
            <div className="text-xs text-muted-foreground mb-1">School access code</div>
            <div className="font-mono text-2xl font-bold tracking-widest">{code}</div>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => { navigator.clipboard.writeText(code); toast.success("Copied"); }}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy code
            </Button>
          </div>
        ) : (
          <Button onClick={generate} disabled={busy} className="mt-4 w-full glow" style={{ background: "var(--gradient-primary)" }}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
            Accept & generate code
          </Button>
        )}
      </div>
    </div>
  );
}

/** Full lifecycle management of school access codes. */
export function LicenseManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);

  const licenses = useQuery({
    queryKey: ["owner-licenses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("school_licenses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const patch = async (id: string, values: Record<string, unknown>) => {
    const { error } = await supabase.from("school_licenses").update(values as never).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["owner-licenses"] });
    toast.success("Code updated");
  };

  const discard = async (id: string) => {
    const { error } = await supabase.from("school_licenses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["owner-licenses"] });
    toast.success("Code discarded");
  };

  const statusOf = (c: any) => {
    if (c.revoked) return "Revoked";
    if (c.expires_at && new Date(c.expires_at) < new Date()) return "Expired";
    if (c.students_redeemed >= c.max_students && c.teachers_redeemed >= c.max_teachers) return "Fully used";
    return c.active ? "Active" : "Inactive";
  };
  const badgeCls = (s: string) =>
    s === "Active" ? "bg-primary/20 border-primary/50"
    : s === "Expired" ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
    : s === "Revoked" ? "bg-destructive/20 border-destructive/40 text-destructive"
    : "bg-secondary border-border text-muted-foreground";

  return (
    <div className="mt-6 glass rounded-2xl p-6" data-reveal>
      <h2 className="font-semibold mb-4 flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /> Team code management</h2>
      {licenses.isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : (licenses.data ?? []).length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">School</th>
                <th className="py-2 pr-3">Seats used</th>
                <th className="py-2 pr-3">Valid until</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(licenses.data ?? []).map((c: any) => {
                const s = statusOf(c);
                return (
                  <tr key={c.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-mono font-bold tracking-widest">
                      {c.code}
                      <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Copied"); }} className="ml-2 text-muted-foreground hover:text-primary align-middle"><Copy className="h-3.5 w-3.5" /></button>
                    </td>
                    <td className="py-2 pr-3">{c.label ?? "—"}</td>
                    <td className="py-2 pr-3 text-xs">S {c.students_redeemed}/{c.max_students} · T {c.teachers_redeemed}/{c.max_teachers}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "No expiry"}</td>
                    <td className="py-2 pr-3"><span className={"text-[10px] rounded-full border px-2 py-0.5 " + badgeCls(s)}>{s}</span></td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setEditing(c)}>Edit</Button>
                        <Button size="sm" variant="secondary" onClick={() => patch(c.id, { expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000 + (c.expires_at && new Date(c.expires_at) > new Date() ? new Date(c.expires_at).getTime() - Date.now() : 0)).toISOString() })}>
                          <Clock className="h-3.5 w-3.5 mr-1" /> +30d
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => patch(c.id, { revoked: !c.revoked, active: c.revoked })}>
                          <Ban className="h-3.5 w-3.5 mr-1" /> {c.revoked ? "Restore" : "Revoke"}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => discard(c.id)}>Discard</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No codes yet.</p>
      )}

      {editing && (
        <EditLicense lic={editing} onClose={() => setEditing(null)} onSave={(v) => { patch(editing.id, v); setEditing(null); }} />
      )}
    </div>
  );
}

function EditLicense({ lic, onClose, onSave }: { lic: any; onClose: () => void; onSave: (v: Record<string, unknown>) => void }) {
  const [students, setStudents] = useState<number>(lic.max_students);
  const [teachers, setTeachers] = useState<number>(lic.max_teachers);
  const [until, setUntil] = useState<string>(lic.expires_at ? new Date(lic.expires_at).toISOString().slice(0, 10) : "");

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-strong rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Edit {lic.code}</h3>
          <button onClick={onClose} className="rounded-md glass p-1.5"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Student seats</Label><Input type="number" min={0} value={students} onChange={(e) => setStudents(Number(e.target.value))} /></div>
          <div><Label className="text-xs">Teacher seats</Label><Input type="number" min={0} value={teachers} onChange={(e) => setTeachers(Number(e.target.value))} /></div>
        </div>
        <div className="mt-3"><Label className="text-xs">Valid until</Label><Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} /></div>
        <Button
          className="mt-5 w-full glow"
          style={{ background: "var(--gradient-primary)" }}
          onClick={() => onSave({ max_students: students, max_teachers: teachers, expires_at: until ? new Date(until).toISOString() : null })}
        >
          Save changes
        </Button>
      </div>
    </div>
  );
}
