import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Bell, FileQuestion, FileText, ScrollText, MessageCircle } from "lucide-react";

type Notif = {
  id: string;
  kind: "share" | "message";
  teamId: string;
  title: string;
  detail: string;
  at: string;
};

const SHARE_ICON: Record<string, any> = { quiz: FileQuestion, worksheet: FileText, sample_paper: ScrollText };

/** Bell showing new team shares + new team doubts since the user last opened it. */
export function NotificationBell({ role }: { role: "teacher" | "student" }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const state = useQuery({
    queryKey: ["notification-state", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("notification_state").select("last_seen_at").eq("user_id", user!.id).maybeSingle();
      return data?.last_seen_at ?? null;
    },
  });

  const feed = useQuery({
    queryKey: ["team-notifications", user?.id, role],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async (): Promise<Notif[]> => {
      const teamIds: string[] =
        role === "teacher"
          ? ((await supabase.from("teams").select("id").eq("teacher_id", user!.id)).data ?? []).map((t: any) => t.id)
          : ((await supabase.from("team_members").select("team_id").eq("student_id", user!.id)).data ?? []).map((m: any) => m.team_id);
      if (!teamIds.length) return [];

      const names = new Map<string, string>(
        (((await supabase.from("teams").select("id, name").in("id", teamIds)).data ?? []) as any[]).map((t) => [t.id, t.name]),
      );

      const [{ data: shares }, { data: msgs }] = await Promise.all([
        supabase.from("content_shares").select("*").in("team_id", teamIds).order("shared_at", { ascending: false }).limit(20),
        supabase.from("team_messages").select("*").in("team_id", teamIds).order("created_at", { ascending: false }).limit(20),
      ]);

      const out: Notif[] = [];
      for (const s of shares ?? []) {
        out.push({
          id: `s-${s.id}`,
          kind: "share",
          teamId: s.team_id,
          title: `New ${String(s.content_type).replace("_", " ")} shared`,
          detail: names.get(s.team_id) ?? "Your team",
          at: s.shared_at,
        });
      }
      for (const m of msgs ?? []) {
        if (m.user_id === user!.id) continue;
        out.push({
          id: `m-${m.id}`,
          kind: "message",
          teamId: m.team_id,
          title: m.parent_id ? `${m.author_name} replied` : `${m.author_name} asked a doubt`,
          detail: m.body.slice(0, 70),
          at: m.created_at,
        });
      }
      return out.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 20);
    },
  });

  const lastSeen = state.data ? new Date(state.data).getTime() : 0;
  const unread = useMemo(
    () => (feed.data ?? []).filter((n) => new Date(n.at).getTime() > lastSeen).length,
    [feed.data, lastSeen],
  );

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && user) {
      await supabase.from("notification_state").upsert({ user_id: user.id, last_seen_at: new Date().toISOString() });
      qc.invalidateQueries({ queryKey: ["notification-state"] });
    }
  };

  return (
    <div className="relative">
      <button onClick={toggle} className="relative rounded-lg glass p-2" aria-label="Notifications">
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-primary-foreground glow"
            style={{ background: "var(--gradient-primary)" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto z-40 glass-strong rounded-2xl border border-border p-2 animate-in fade-in slide-in-from-top-1">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notifications</div>
            {(feed.data ?? []).length ? (
              (feed.data ?? []).map((n) => {
                const Icon = n.kind === "message" ? MessageCircle : SHARE_ICON[n.title.split(" ")[1] ?? ""] ?? FileText;
                const to = role === "teacher" ? "/teacher/team/$teamId" : "/student/team/$teamId";
                return (
                  <Link
                    key={n.id}
                    to={to}
                    params={{ teamId: n.teamId }}
                    onClick={() => setOpen(false)}
                    className="flex gap-2 rounded-xl px-3 py-2 hover:bg-secondary transition-colors"
                  >
                    <Icon className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <div className="text-sm truncate">{n.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{n.detail}</div>
                      <div className="text-[10px] text-muted-foreground">{new Date(n.at).toLocaleString()}</div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">You're all caught up.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
