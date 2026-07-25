import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/student/settings")({
  head: () => ({ meta: [
    { title: "Settings — EduSense" },
    { name: "description", content: "Manage your EduSense profile." },
    { property: "og:title", content: "Settings — EduSense" },
    { property: "og:description", content: "Manage your EduSense profile." },
  ] }),
  component: StudentSettings,
});

function StudentSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.username ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ username: name }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("Saved");
  };

  return (
    <DashboardShell role="student" greeting="Settings">
      <PageHeader title="Settings" desc="Manage your profile." />
      <div className="glass rounded-2xl p-6 max-w-lg space-y-4">
        <div><Label>Email</Label><Input value={profile?.email ?? ""} disabled className="mt-1" /></div>
        <div><Label>Username</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
        <div><Label>Role</Label><Input value={profile?.role ?? ""} disabled className="mt-1 capitalize" /></div>
        <Button onClick={save} disabled={saving} style={{ background: "var(--gradient-primary)" }} className="glow">
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </DashboardShell>
  );
}
