import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { GlowBackground } from "@/components/GlowBackground";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

function AuthGate() {
  const { user, loading, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (!profile?.role && typeof window !== "undefined" && !window.location.pathname.includes("select-role")) {
      navigate({ to: "/select-role" });
    }
  }, [user, loading, profile, navigate]);

  if (loading || !user) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <GlowBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <GlowBackground />
      <Outlet />
    </div>
  );
}
