import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Loader2, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/codes")({
  head: () => ({ meta: [
    { title: "Admin — School Codes — EduSense" },
    { name: "description", content: "Generate and manage school license codes." },
    { property: "og:title", content: "Admin — School Codes — EduSense" },
    { property: "og:description", content: "Admin panel for school license codes." },
  ] }),
  component: AdminCodes,
});

function randomCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function AdminCodes() {
  const { profile } = useAuth();
  const isAdmin = profile?.plan === "admin";
  const qc = useQueryClient();
  const [students, setStudents] = useState(100);
  const [teachers, setTeachers] = useState(10);
  const [busy, setBusy] = useState(false);

  const list = useQuery({
    queryKey: ["school-licenses"],
    queryFn: async () => (await supabase.from("school_licenses").select("*").order("created_at", { ascending: false })).data ?? [],
    enabled: isAdmin,
  });

  if (!isAdmin) return (
    <DashboardShell role={profile?.role ?? "teacher"}>
      <div className="glass rounded-2xl p-10 text-center max-w-lg mx-auto">
        <div className="mx-auto h-14 w-14 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
          <Shield className="h-6 w-6 text-primary-foreground" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">Admins only</h2>
        <p className="mt-2 text-sm text-muted-foreground">This page is restricted to EduSense administrators.</p>
      </div>
    </DashboardShell>
  );

  const generate = async () => {
    setBusy(true);
    const code = randomCode();
    const { error } = await supabase.from("school_licenses").insert({ code, max_students: students, max_teachers: teachers });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Code ${code} created`);
    qc.invalidateQueries({ queryKey: ["school-licenses"] });
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from("school_licenses").update({ active: !active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["school-licenses"] });
  };

  return (
    <DashboardShell role={profile?.role ?? "teacher"} greeting="Admin — School Codes">
      <PageHeader title="School license codes" desc="Generate codes teachers and students can redeem to unlock school-pro." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold">Generate a new code</h2>
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
          {list.data && list.data.length > 0 ? (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {list.data.map((c: any) => (
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
    </DashboardShell>
  );
}
