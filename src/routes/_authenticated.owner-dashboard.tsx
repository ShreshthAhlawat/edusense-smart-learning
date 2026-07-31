import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, isOwner } from "@/lib/auth";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Loader2, ShieldCheck, Building2, Mail } from "lucide-react";

export const Route = createFileRoute("/_authenticated/owner-dashboard")({
  head: () => ({ meta: [
    { title: "Owner — EduSense" },
    { name: "description", content: "Internal owner dashboard." },
  ] }),
  component: OwnerDashboard,
});

function randomCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "EDU";
  for (let i = 0; i < 7; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function OwnerDashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [students, setStudents] = useState(100);
  const [teachers, setTeachers] = useState(10);
  const [busy, setBusy] = useState(false);
  const allowed = !!user && isOwner(user);

  // Server-side style access gate: check email exactly matches, redirect otherwise.
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!allowed) {
      // Redirect to their regular dashboard, no admin badge/UI shown.
      const to = profile?.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
      navigate({ to });
    }
  }, [loading, user, allowed, profile, navigate]);

  const licenses = useQuery({
    queryKey: ["owner-licenses"],
    queryFn: async () => (await supabase.from("school_licenses").select("*").order("created_at", { ascending: false })).data ?? [],
    enabled: allowed,
  });

  const requests = useQuery({
    queryKey: ["owner-school-requests"],
    queryFn: async () => (await supabase.from("school_requests").select("*").order("created_at", { ascending: false })).data ?? [],
    enabled: allowed,
  });

  if (!allowed) {
    return (
      <DashboardShell role={profile?.role ?? "teacher"}>
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </DashboardShell>
    );
  }

  const generate = async () => {
    setBusy(true);
    const code = randomCode();
    const { error } = await supabase.from("school_licenses").insert({ code, max_students: students, max_teachers: teachers });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Code ${code} created`);
    qc.invalidateQueries({ queryKey: ["owner-licenses"] });
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from("school_licenses").update({ active: !active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["owner-licenses"] });
  };

  return (
    <DashboardShell role={profile?.role ?? "teacher"} greeting="Owner dashboard">
      <PageHeader title="Owner dashboard" desc="Internal only — generate school license codes and review school enquiries." />

      <div className="glass rounded-2xl p-4 mb-6 flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div className="text-sm">Signed in as owner (<code className="text-xs">{user!.email}</code>)</div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Generate a new school code</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Student seats</Label><Input type="number" min={0} value={students} onChange={(e) => setStudents(Number(e.target.value))} /></div>
            <div><Label>Teacher seats</Label><Input type="number" min={0} value={teachers} onChange={(e) => setTeachers(Number(e.target.value))} /></div>
          </div>
          <Button onClick={generate} disabled={busy} className="glow" style={{ background: "var(--gradient-primary)" }}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate code"}
          </Button>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-3">Active codes</h2>
          {licenses.data && licenses.data.length > 0 ? (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {licenses.data.map((c: any) => (
                <li key={c.id} className="rounded-lg bg-secondary/40 border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-mono font-bold tracking-widest">{c.code}</div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Copied"); }} className="text-muted-foreground hover:text-primary"><Copy className="h-4 w-4" /></button>
                      <button onClick={() => toggle(c.id, c.active)} className={"text-xs rounded-full px-2 py-0.5 " + (c.active ? "bg-primary/20 border border-primary/40" : "bg-secondary border border-border text-muted-foreground")}>
                        {c.active ? "Active" : "Inactive"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Students {c.students_redeemed}/{c.max_students} · Teachers {c.teachers_redeemed}/{c.max_teachers}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No codes yet.</p>
          )}
        </div>
      </div>

      <UserManagement />

      <div className="mt-6 glass rounded-2xl p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> School license enquiries</h2>
        {requests.data && requests.data.length > 0 ? (
          <ul className="space-y-3 max-h-[500px] overflow-y-auto">
            {requests.data.map((r: any) => (
              <li key={r.id} className="rounded-lg bg-secondary/40 border border-border p-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="font-semibold">{r.school_name}</div>
                    <div className="text-xs text-muted-foreground">{r.contact_person} · <a className="text-primary hover:underline" href={`mailto:${r.contact_email}`}>{r.contact_email}</a>{r.contact_phone ? ` · ${r.contact_phone}` : ""}</div>
                  </div>
                  <span className="text-[10px] rounded-full bg-primary/20 border border-primary/40 px-2 py-0.5">{r.status}</span>
                </div>
                <div className="mt-2 text-xs">
                  Students: <strong>{r.estimated_students ?? "—"}</strong> · Teachers: <strong>{r.estimated_teachers ?? "—"}</strong>
                </div>
                {r.notes && <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{r.notes}</p>}
                <div className="mt-1 text-[10px] text-muted-foreground">Submitted {new Date(r.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No enquiries yet.</p>
        )}
      </div>
    </DashboardShell>
  );
}

const ROLES = ["teacher", "student"] as const;
const PLANS = ["free", "pro", "school-pro"] as const;

/** Owner-only user management: search users and edit their role / plan. */
function UserManagement() {
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const users = useQuery({
    queryKey: ["owner-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, email, role, plan, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const update = async (id: string, patch: Record<string, any>) => {
    setSavingId(id);
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success("User updated");
    qc.invalidateQueries({ queryKey: ["owner-users"] });
  };

  const q = term.trim().toLowerCase();
  const rows = (users.data ?? []).filter((u: any) =>
    !q || (u.email ?? "").toLowerCase().includes(q) || (u.username ?? "").toLowerCase().includes(q));

  return (
    <div className="mt-6 glass rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> User management</h2>
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search by name or email" className="max-w-xs" />
      </div>

      {users.isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-2 pr-3">User</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Plan</th>
                <th className="py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u: any) => (
                <tr key={u.id} className="border-b border-border/60">
                  <td className="py-2 pr-3">
                    <div className="font-medium">{u.username ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <select
                      value={u.role ?? ""}
                      disabled={savingId === u.id}
                      onChange={(e) => update(u.id, { role: e.target.value || null })}
                      className="rounded-md border border-input bg-secondary/40 px-2 py-1 text-xs"
                    >
                      <option value="">— none —</option>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <select
                      value={u.plan}
                      disabled={savingId === u.id}
                      onChange={(e) => update(u.id, { plan: e.target.value })}
                      className="rounded-md border border-input bg-secondary/40 px-2 py-1 text-xs"
                    >
                      {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </td>
                  <td className="py-2 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No users match that search.</p>
      )}
    </div>
  );
}

