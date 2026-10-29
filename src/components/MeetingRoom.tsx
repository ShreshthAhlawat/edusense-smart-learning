import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { summarizeMeeting } from "@/lib/meeting.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Markdown } from "@/components/Markdown";
import { toast } from "sonner";
import {
  Loader2, X, Video, VideoOff, Mic, MicOff, LogOut, MessageSquare, Users2, Sparkles,
} from "lucide-react";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => any;
  }
}

function loadJitsi(): Promise<NonNullable<Window["JitsiMeetExternalAPI"]>> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve(window.JitsiMeetExternalAPI);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-jitsi="1"]');
    if (existing) {
      existing.addEventListener("load", () => window.JitsiMeetExternalAPI && resolve(window.JitsiMeetExternalAPI));
      existing.addEventListener("error", () => reject(new Error("load failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://meet.jit.si/external_api.js";
    s.async = true;
    s.dataset.jitsi = "1";
    s.onload = () => (window.JitsiMeetExternalAPI ? resolve(window.JitsiMeetExternalAPI) : reject(new Error("missing API")));
    s.onerror = () => reject(new Error("Could not reach the video service"));
    document.head.appendChild(s);
  });
}

export type Meeting = {
  id: string;
  team_id: string;
  host_id: string;
  title: string;
  subject: string | null;
  room_code: string;
  status: string;
  scheduled_at: string | null;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
};

function fmtDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m ? `${m}m ${s}s` : `${s}s`;
}

export function MeetingRoom({ meeting, isHost, onClose }: { meeting: Meeting; isHost: boolean; onClose: () => void }) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const videoRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<any>(null);
  const attendanceIdRef = useRef<string | null>(null);
  const joinedAtRef = useRef<number>(Date.now());
  const leftRef = useRef(false);
  const [videoOn, setVideoOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [status, setStatus] = useState<"loading" | "live" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [ending, setEnding] = useState(false);
  const [ended, setEnded] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [panel, setPanel] = useState<"chat" | "people">("chat");

  const displayName = profile?.username || profile?.email || "Guest";

  const markLeft = useCallback(() => {
    if (leftRef.current) return;
    leftRef.current = true;
    const id = attendanceIdRef.current;
    if (!id) return;
    const seconds = Math.round((Date.now() - joinedAtRef.current) / 1000);
    void supabase
      .from("meeting_attendance")
      .update({ left_at: new Date().toISOString(), duration_seconds: seconds })
      .eq("id", id);
  }, []);

  // Join the video room + record attendance.
  useEffect(() => {
    let api: any;
    let cancelled = false;
    const join = async () => {
      try {
        const Jitsi = await loadJitsi();
        if (cancelled || !videoRef.current) return;
        api = new Jitsi("meet.jit.si", {
          roomName: `edusense-${meeting.room_code}`,
          width: "100%",
          height: "100%",
          parentNode: videoRef.current,
          userInfo: { displayName },
          configOverrides: {
            prejoinConfig: { enabled: false },
            startWithVideoMuted: false,
            startWithAudioMuted: false,
            disableDeepLinking: true,
          },
        });
        apiRef.current = api;
        api.addEventListener("videoConferenceJoined", () => setStatus("live"));
        api.addEventListener("participantJoined", (p: any) =>
          setParticipants((prev) => (p?.displayName && !prev.includes(p.displayName) ? [...prev, p.displayName] : prev)));
        api.addEventListener("participantLeft", (p: any) =>
          setParticipants((prev) => prev.filter((n) => n !== p?.displayName)));
        api.addEventListener("videoConferenceLeft", () => markLeft());
        api.addEventListener("readyToClose", () => { markLeft(); if (!isHost) onClose(); });
        setStatus("live");
      } catch (e: any) {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg(e?.message ?? "The video service could not be reached.");
        }
      }
    };
    void join();

    // attendance row
    void (async () => {
      const { data, error } = await supabase
        .from("meeting_attendance")
        .insert({ meeting_id: meeting.id, user_id: user?.id ?? "", display_name: displayName })
        .select("id")
        .single();
      if (!error && data) attendanceIdRef.current = data.id;
    })();

    const onUnload = () => markLeft();
    window.addEventListener("beforeunload", onUnload);
    return () => {
      cancelled = true;
      window.removeEventListener("beforeunload", onUnload);
      markLeft();
      try { api?.dispose?.(); } catch { /* noop */ }
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting.id]);

  const endClass = async () => {
    setEnding(true);
    markLeft();
    try { apiRef.current?.executeCommand("endConference"); } catch { /* noop */ }
    const { error } = await supabase
      .from("meetings")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", meeting.id);
    if (error) toast.error(error.message);
    setEnded(true);
    try {
      const { summary: s } = await summarizeMeeting({ data: { meetingId: meeting.id } });
      setSummary(s ?? null);
    } catch (e: any) {
      toast.error(e?.message ?? "Summary could not be generated.");
    }
    qc.invalidateQueries({ queryKey: ["meetings", meeting.team_id] });
    setEnding(false);
  };

  const leaveClass = () => {
    markLeft();
    if (isHost && meeting.status === "live") {
      void supabase
        .from("meetings")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", meeting.id);
      qc.invalidateQueries({ queryKey: ["meetings", meeting.team_id] });
    }
    onClose();
  };

  const toggleVideo = () => {
    try { apiRef.current?.executeCommand("toggleVideo"); setVideoOn((v) => !v); } catch { /* noop */ }
  };
  const toggleMic = () => {
    try { apiRef.current?.executeCommand("toggleAudio"); setMicOn((v) => !v); } catch { /* noop */ }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col">
      {/* header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/60">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
          <Video className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{meeting.title}</div>
          <div className="text-[11px] text-muted-foreground">
            {meeting.subject ? `${meeting.subject} · ` : ""}
            {ended ? "Class ended" : "Live"} · {participants.length + 1} in room
          </div>
        </div>
        {isHost && !ended ? (
          <Button size="sm" variant="destructive" onClick={endClass} disabled={ending}>
            {ending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <LogOut className="h-4 w-4 mr-1" />}
            End class
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={leaveClass}><X className="h-4 w-4" /></Button>
      </div>

      {ended && summary ? (
        <div className="px-4 py-3 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
            <Sparkles className="h-3.5 w-3.5" /> AI class summary
          </div>
          <div className="text-xs max-h-40 overflow-y-auto print-area"><Markdown>{summary}</Markdown></div>
        </div>
      ) : null}

      {/* body */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 relative min-w-0">
          {status === "loading" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-sm">Connecting to the classroom…</div>
              <div className="text-xs">Allow camera and microphone when your browser asks.</div>
            </div>
          ) : null}
          {status === "error" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-8">
              <VideoOff className="h-8 w-8 text-destructive" />
              <div className="text-sm font-semibold">Video room unavailable</div>
              <div className="text-xs text-muted-foreground max-w-sm">{errorMsg}</div>
              <Button size="sm" variant="outline" onClick={onClose}>Back to team</Button>
            </div>
          ) : null}
          <div ref={videoRef} className="absolute inset-0" />
        </div>

        {/* side panel */}
        <aside className="hidden md:flex w-80 shrink-0 border-l border-border bg-card/40 flex-col">
          <div className="flex border-b border-border">
            {(["chat", "people"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPanel(p)}
                className={"flex-1 px-3 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors " +
                  (panel === p ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}
              >
                {p === "chat" ? <><MessageSquare className="h-3.5 w-3.5" /> Chat</> : <><Users2 className="h-3.5 w-3.5" /> People</>}
              </button>
            ))}
          </div>
          {panel === "chat" ? <MeetingChat meetingId={meeting.id} /> : <AttendancePanel meetingId={meeting.id} extraNames={participants} />}
        </aside>
      </div>

      {/* quick controls */}
      <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-border bg-card/60">
        <Button size="icon" variant={micOn ? "secondary" : "destructive"} className="rounded-full" onClick={toggleMic} aria-label={micOn ? "Mute microphone" : "Unmute microphone"}>
          {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant={videoOn ? "secondary" : "destructive"} className="rounded-full" onClick={toggleVideo} aria-label={videoOn ? "Turn camera off" : "Turn camera on"}>
          {videoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="outline" className="rounded-full" onClick={leaveClass}>
          <LogOut className="h-4 w-4 mr-1" /> {ended ? "Close" : "Leave"}
        </Button>
      </div>

      {/* mobile chat */}
      <div className="md:hidden max-h-[30vh] overflow-y-auto border-t border-border bg-card/40">
        <MeetingChat meetingId={meeting.id} />
      </div>
    </div>
  );
}

export function MeetingChat({ meetingId }: { meetingId: string }) {
  const { user, profile } = useAuth();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement | null>(null);

  const messages = useQuery({
    queryKey: ["meeting-messages", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_messages")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 4000,
  });

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages.data?.length]);

  const send = async () => {
    if (!user || !body.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("meeting_messages").insert({
      meeting_id: meetingId,
      user_id: user.id,
      author_name: profile?.username || profile?.email || "Member",
      body: body.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setBody("");
  };

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div ref={scroller} className="flex-1 overflow-y-auto p-3 space-y-2">
        {(messages.data ?? []).length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-6">Class chat — say hello 👋</div>
        ) : (
          (messages.data ?? []).map((m: any) => (
            <div key={m.id} className="rounded-xl bg-secondary/40 border border-border px-3 py-2">
              <div className="text-[11px] font-semibold text-primary">{m.author_name}</div>
              <p className="text-xs whitespace-pre-wrap break-words">{m.body}</p>
            </div>
          ))
        )}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); void send(); }}
        className="p-2 border-t border-border flex gap-2"
      >
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message…" className="h-9 text-xs" />
        <Button type="submit" size="sm" disabled={busy || !body.trim()} style={{ background: "var(--gradient-primary)" }}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}

function AttendancePanel({ meetingId, extraNames }: { meetingId: string; extraNames: string[] }) {
  const attendance = useQuery({
    queryKey: ["meeting-attendance", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_attendance")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10000,
  });

  const rows = useMemo(() => {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const r of attendance.data ?? []) {
      if (seen.has(r.user_id)) continue;
      seen.add(r.user_id);
      out.push(r);
    }
    return out;
  }, [attendance.data]);

  const now = Date.now();
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {rows.length === 0 && extraNames.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-6">Attendance is recorded automatically as people join.</div>
      ) : null}
      {rows.map((r) => {
        const seconds = r.left_at
          ? r.duration_seconds
          : Math.round((now - new Date(r.joined_at).getTime()) / 1000);
        return (
          <div key={r.id} className="rounded-xl bg-secondary/40 border border-border px-3 py-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">{r.display_name}</div>
              <div className="text-[10px] text-muted-foreground">
                {new Date(r.joined_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {" · "}{fmtDuration(seconds)}
              </div>
            </div>
            <span className={"h-2 w-2 rounded-full shrink-0 " + (r.left_at ? "bg-muted-foreground/40" : "bg-emerald-400 planner-breathe")} />
          </div>
        );
      })}
      {extraNames.filter((n) => !rows.some((r) => r.display_name === n)).map((n) => (
        <div key={n} className="rounded-xl bg-secondary/40 border border-border px-3 py-2">
          <div className="text-xs font-semibold truncate">{n}</div>
          <div className="text-[10px] text-muted-foreground">In the video room</div>
        </div>
      ))}
    </div>
  );
}
