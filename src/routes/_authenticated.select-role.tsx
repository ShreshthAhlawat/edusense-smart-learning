import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { GraduationCap, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/select-role")({
  component: SelectRole,
});

function SelectRole() {
  const { user, profile, refreshProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState<"teacher" | "student" | null>(null);

  useEffect(() => {
    if (!loading && profile?.role) {
      navigate({ to: profile.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard" });
    }
  }, [profile, loading, navigate]);

  const pick = async (role: "teacher" | "student") => {
    if (!user) return;
    setSaving(role);
    const { error } = await supabase.from("profiles").update({ role }).eq("id", user.id);
    if (error) { toast.error(error.message); setSaving(null); return; }
    await refreshProfile();
    toast.success(`You're set up as a ${role}!`);
    navigate({ to: role === "teacher" ? "/teacher/dashboard" : "/student/dashboard" });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="glass rounded-xl p-2 mb-6">
        <Logo className="h-9 w-auto" />
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-center">One last step</h1>
      <p className="mt-2 text-muted-foreground text-center">How will you use EduSense?</p>

      <div className="mt-10 grid gap-5 md:grid-cols-2 w-full max-w-3xl">
        {[
          { role: "teacher" as const, icon: Users, title: "I'm a Teacher", desc: "Create quizzes, track student progress, spot struggling topics." },
          { role: "student" as const, icon: GraduationCap, title: "I'm a Student", desc: "Practice quizzes, track your growth, and unlock powerful learning tools." },
        ].map(({ role, icon: Icon, title, desc }) => (
          <button
            key={role}
            disabled={!!saving}
            onClick={() => pick(role)}
            className="group glass rounded-2xl p-8 text-left transition-all hover:-translate-y-1 hover:glow"
          >
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl" style={{ background: "var(--gradient-primary)" }}>
              {saving === role ? <Loader2 className="h-6 w-6 animate-spin text-primary-foreground" /> : <Icon className="h-7 w-7 text-primary-foreground" />}
            </div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
