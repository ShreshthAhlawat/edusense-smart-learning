import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardRouter,
});

function DashboardRouter() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!profile) return;
    if (!profile.role) navigate({ to: "/select-role" });
    else navigate({ to: profile.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard" });
  }, [profile, navigate]);
  return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
}
