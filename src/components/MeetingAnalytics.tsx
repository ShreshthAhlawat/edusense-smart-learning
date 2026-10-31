import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { Meeting } from "@/components/MeetingRoom";
import { X, Users2, Clock, MessageSquare, Download, Sparkles } from "lucide-react";

type Row = {
  id: string;
  user_id: string;
  display_name: string;
  joined_at: string;
  left_at: string | null;
  duration_seconds: number;
};

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m ? `${m}m ${s}s` : `${s}s`;
}

function time(t?: string | null) {
  return t ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
}

/** Detailed per-meeting analytics: attendees, time in room, chat volume, CSV export. */
export function MeetingAnalytics({ meeting, onClose }: { meeting: Meeting; onClose: () => void }) {
  const attendance = useQuery({
    queryKey: ["meeting-analytics-attendance", meeting.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_attendance")
        .select("id, user_id, display_name, joined_at, left_at, duration_seconds")
        .eq("meeting_id", meeting.id)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const messages = useQuery({
    queryKey: ["meeting-analytics-messages", meeting.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("meeting_messages")
        .select("id", { count: "exact", head: true })
        .eq("meeting_id", meeting.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const meta = useQuery({
    queryKey: ["meeting-analytics-meta", meeting.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("started_at, ended_at, status, summary")
        .eq("id", meeting.id)
        .maybeSingle();
      if (error) throw error;
      return data as { started_at: string; ended_at: string | null; status: string; summary: string | null } | null;
    },
  });

  const rows = useMemo(() => {
    const byUser = new Map<string, { name: string; sessions: number; seconds: number; first: string; last: string | null; stillIn: boolean }>();
    for (const r of attendance.data ?? []) {
      const e = byUser.get(r.user_id) ?? { name: r.display_name, sessions: 0, seconds: 0, first: r.joined_at, last: null as string | null, stillIn: false };
      e.sessions += 1;
      e.seconds += r.left_at ? r.duration_seconds : Math.max(0, Math.round((Date.now() - new Date(r.joined_at).getTime()) / 1000));
      if (r.joined_at < e.first) e.first = r.joined_at;
      if (!e.last || (r.left_at && r.left_at > e.last)) e.last = r.left_at ?? e.last;
      if (!r.left_at) e.stillIn = true;
      byUser.set(r.user_id, e);
    }
    return [...byUser.entries()]
      .map(([user_id, e]) => ({ user_id, ...e }))
      .sort((a, b) => b.seconds - a.seconds);
  }, [attendance.data]);

  const startedAt = meta.data?.started_at ?? meeting.started_at;
  const endedAt = meta.data?.ended_at ?? null;
  const meetingSeconds = Math.max(0, Math.round(((endedAt ? new Date(endedAt).getTime() : Date.now()) - new Date(startedAt).getTime()) / 1000));
  const totalSeconds = rows.reduce((s, r) => s + r.seconds, 0);
  const avgSeconds = rows.length ? Math.round(totalSeconds / rows.length) : 0;
  const maxSeconds = rows[0]?.seconds ?? 0;
  const live = meta.data?.status === "live";

  const exportCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      "Name,Sessions,First joined,Last left,Time in room,Status",
      ...rows.map((r) =>
        [
          esc(r.name),
          String(r.sessions),
          new Date(r.first).toLocaleString(),
          r.last ? new Date(r.last).toLocaleString() : "in room",
          fmt(r.seconds),
          r.stillIn ? "Present" : "Left",
        ].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `attendance-${meeting.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="fixed inset-0 z-[95] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="glass rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{meeting.title}</div>
            <div className="text-xs text-muted-foreground">
              {meeting.subject ? `${meeting.subject} · ` : ""}
              {new Date(startedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
              {" · "}
              {live ? <>Session running · {fmt(meetingSeconds)} so far</> : <>Total duration {fmt(meetingSeconds)}</>}
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close analytics"><X className="h-4 w-4" /></Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: Users2, label: "Attendees", value: String(rows.length) },
            { icon: Clock, label: "Total time", value: fmt(totalSeconds) },
            { icon: Clock, label: "Avg / person", value: fmt(avgSeconds) },
            { icon: MessageSquare, label: "Chat messages", value: String(messages.data ?? 0) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-secondary/40 border border-border p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
                <s.icon className="h-3 w-3 text-primary" /> {s.label}
              </div>
              <div className="text-lg font-semibold mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold">Attendance & timing</div>
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}>
              <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
            </Button>
          </div>
          {attendance.isLoading ? (
            <div className="text-xs text-muted-foreground text-center py-6">Loading attendance…</div>
          ) : rows.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-6">No attendance recorded yet.</div>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.user_id} className="rounded-xl bg-secondary/30 border border-border px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="font-semibold truncate">{r.name}</span>
                      {r.stillIn ? (
                        <span className="h-2 w-2 rounded-full bg-emerald-400 planner-breathe shrink-0" aria-label="Present" />
                      ) : null}
                      {r.sessions > 1 ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary shrink-0">{r.sessions} sessions</span>
                      ) : null}
                    </div>
                    <div className="text-[10px] text-muted-foreground shrink-0">
                      {time(r.first)} – {r.stillIn ? "now" : time(r.last)}
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${maxSeconds ? Math.max(4, Math.round((r.seconds / maxSeconds) * 100)) : 4}%`, background: "var(--gradient-primary)" }}
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground w-14 text-right shrink-0">{fmt(r.seconds)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {meta.data?.summary ? (
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary mb-1">
              <Sparkles className="h-3 w-3" /> AI session summary
            </div>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-6">{meta.data.summary.replace(/[#*]/g, "")}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
