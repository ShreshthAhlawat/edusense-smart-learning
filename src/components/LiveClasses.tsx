import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MeetingRoom, type Meeting } from "@/components/MeetingRoom";
import { toast } from "sonner";
import {
  Loader2, Video, CalendarClock, Sparkles, Users2, Clock,
} from "lucide-react";

const SUBJECT_KEYWORDS: Array<[string, string[]]> = [
  ["Physics", ["physics", "motion", "force", "optics", "electricity", "magnetism"]],
  ["Chemistry", ["chemistry", "acid", "mole", "reaction", "organic", "periodic"]],
  ["Biology", ["biology", "cell", "photosynthesis", "genetics", "human body", "plant"]],
  ["Mathematics", ["math", "maths", "algebra", "geometry", "trigonometry", "calculus", "probability"]],
  ["English", ["english", "grammar", "essay", "literature", "poem"]],
  ["History", ["history", "revolution", "ancient", "freedom struggle"]],
  ["Geography", ["geography", "climate", "map", "river", "monsoon"]],
  ["Computer Science", ["computer", "code", "python", "programming", "ai"]],
  ["Economics", ["economics", "demand", "supply", "budget"]],
];

function detectSubject(title: string): string | null {
  const t = title.toLowerCase();
  for (const [subject, keys] of SUBJECT_KEYWORDS) {
    if (keys.some((k) => t.includes(k))) return subject;
  }
  return null;
}

function makeRoomCode() {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** "Live classes" tab content inside a Team Space. Host = the teacher who owns the team. */
export function LiveClasses({ teamId, isHost }: { teamId: string; isHost: boolean }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<Meeting | null>(null);

  const meetings = useQuery({
    queryKey: ["meetings", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Meeting[];
    },
  });

  const createMeeting = async (mode: "live" | "scheduled") => {
    if (!title.trim()) return toast.error("Give the class a title first.");
    setBusy(true);
    const detected = detectSubject(title) || subject.trim() || null;
    const values = {
      team_id: teamId,
      title: title.trim(),
      subject: detected,
      room_code: makeRoomCode(),
      status: mode === "live" ? "live" : "scheduled",
      scheduled_at: mode === "scheduled" && scheduleAt ? new Date(scheduleAt).toISOString() : null,
    };
    const { data, error } = await supabase.from("meetings").insert(values).select("*").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    setTitle(""); setSubject(""); setScheduleAt("");
    qc.invalidateQueries({ queryKey: ["meetings", teamId] });
    if (mode === "live") setActive(data as Meeting);
    else toast.success("Class scheduled — your team will see it in Live Classes.");
  };

  const startScheduled = async (m: Meeting) => {
    const { data, error } = await supabase
      .from("meetings")
      .update({ status: "live" })
      .eq("id", m.id)
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["meetings", teamId] });
    setActive(data as Meeting);
  };

  const list = useMemo(() => meetings.data ?? [], [meetings.data]);

  return (
    <div className="space-y-4">
      {active ? (
        <MeetingRoom meeting={active} isHost={isHost} onClose={() => setActive(null)} />
      ) : null}

      {isHost ? (
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Video className="h-4 w-4 text-primary" /> Host a live class
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Class title — e.g. Photosynthesis revision" />
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (auto-detected from the title)" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button disabled={busy} className="glow" style={{ background: "var(--gradient-primary)" }} onClick={() => createMeeting("live")}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Video className="h-4 w-4 mr-1" />} Start now
            </Button>
            <div className="flex gap-2 flex-1">
              <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="text-xs" />
              <Button variant="outline" disabled={busy || !scheduleAt} onClick={() => createMeeting("scheduled")}>
                <CalendarClock className="h-4 w-4 mr-1" /> Schedule
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Attendance is recorded automatically, and an AI summary (key points + suggested homework) is generated when you end the class.
          </p>
        </div>
      ) : null}

      {meetings.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : list.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">
          {isHost ? "No classes yet — start your first live class above." : "No live classes yet — they'll appear here when your teacher hosts one."}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((m) => {
            const live = m.status === "live";
            const scheduled = m.status === "scheduled";
            return (
              <div key={m.id} className="glass rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center bg-primary/15 border border-primary/30">
                    {scheduled ? <Clock className="h-4 w-4 text-primary" /> : <Video className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{m.title}</span>
                      {live ? (
                        <span className="planner-chip text-[10px] px-2 py-0.5 rounded-full font-semibold">LIVE</span>
                      ) : scheduled ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-secondary text-muted-foreground">
                          {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Scheduled"}
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-secondary text-muted-foreground">Ended</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {m.subject ? `${m.subject} · ` : ""}
                      {new Date(m.started_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                    {m.summary ? (
                      <div className="mt-2 rounded-xl bg-primary/5 border border-primary/20 p-3">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary mb-1">
                          <Sparkles className="h-3 w-3" /> Class summary
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{m.summary.replace(/[#*]/g, "").slice(0, 400)}</p>
                      </div>
                    ) : null}
                    <div className="mt-3 flex gap-2">
                      {isHost ? (
                        scheduled ? (
                          <Button size="sm" className="glow" style={{ background: "var(--gradient-primary)" }} onClick={() => startScheduled(m)}>
                            <Video className="h-4 w-4 mr-1" /> Start class
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setActive(m)}>
                            {live ? "Open room" : "Reopen room"}
                          </Button>
                        )
                      ) : (
                        <Button size="sm" className="glow" style={{ background: "var(--gradient-primary)" }} onClick={() => setActive(m)}>
                          {live ? <><Video className="h-4 w-4 mr-1" /> Join class</> : "Open room"}
                        </Button>
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground self-center">
                        <Users2 className="h-3 w-3" /> attendance auto-recorded
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
