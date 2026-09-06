import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/** Human-friendly tool name for a route path. */
export function toolNameFor(path: string): string {
  const p = path.replace(/\/$/, "") || "/";
  const map: Record<string, string> = {
    "/": "Landing",
    "/auth": "Auth",
    "/team": "Team",
    "/payment-success": "Payments",
    "/vr-learning": "VR Learning",
    "/owner-dashboard": "Owner Dashboard",
  };
  if (map[p]) return map[p];
  const seg = p.split("/").filter(Boolean);
  const last = seg[seg.length - 1] ?? "general";
  if (last.startsWith("$") || /^[0-9a-f-]{12,}$/i.test(last)) {
    const parent = seg[seg.length - 2] ?? "general";
    return pretty(parent);
  }
  return pretty(last);
}

function pretty(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Records how long the signed-in user spends on each route/tool.
 * Opens a row in `usage_sessions` on entry and closes it on exit/unload.
 */
export function UsageTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, profile } = useAuth();
  const sessionId = useRef<string | null>(null);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const started = Date.now();
    startedAt.current = started;

    (async () => {
      const { data } = await supabase
        .from("usage_sessions")
        .insert({
          user_id: user.id,
          role: profile?.role ?? null,
          route: pathname,
          tool: toolNameFor(pathname),
        })
        .select("id")
        .maybeSingle();
      if (!cancelled && data) sessionId.current = data.id;
    })();

    const close = () => {
      const id = sessionId.current;
      if (!id) return;
      const seconds = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
      sessionId.current = null;
      void supabase
        .from("usage_sessions")
        .update({ ended_at: new Date().toISOString(), duration_seconds: seconds })
        .eq("id", id);
    };

    window.addEventListener("beforeunload", close);
    return () => {
      cancelled = true;
      window.removeEventListener("beforeunload", close);
      close();
    };
  }, [pathname, user, profile?.role]);

  return null;
}
