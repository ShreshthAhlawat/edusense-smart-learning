import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getFaceLandmarker, analyzeFrame } from "@/lib/faceAnalysis";
import {
  EXPRESSIONS,
  detectSubject,
  engagementFromDistribution,
  fmtDuration,
  type TimelinePoint,
  type TimetableRow,
} from "@/lib/engagement";
import { Play, Square, Users, Gauge, Loader2, Video, AlertTriangle } from "lucide-react";

const EXPR_COLORS: Record<string, string> = {
  Happy: "oklch(0.75 0.18 155)",
  Neutral: "oklch(0.7 0.05 275)",
  Sad: "oklch(0.65 0.14 250)",
  Angry: "oklch(0.65 0.24 25)",
  Surprised: "oklch(0.78 0.17 80)",
  Fearful: "oklch(0.65 0.18 320)",
};

export function EngagementLive({
  teamId,
  teamName,
  teacherId,
  teacherName,
  timetable,
}: {
  teamId: string;
  teamName: string;
  teacherId: string;
  teacherName: string;
  timetable: TimetableRow[];
}) {
  const qc = useQueryClient();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const totalsRef = useRef<Record<string, number>>({});
  const maxRef = useRef(0);
  const timelineRef = useRef<TimelinePoint[]>([]);
  const startedAtRef = useRef<Date | null>(null);
  const lastTickRef = useRef(0);

  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [students, setStudents] = useState(0);
  const [maxStudents, setMaxStudents] = useState(0);
  const [dist, setDist] = useState<Record<string, number>>({});
  const [elapsed, setElapsed] = useState(0);
  const [subject, setSubject] = useState<string>("Unscheduled");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const match = detectSubject(timetable);
    setSubject(match?.subject ?? "Unscheduled");
  }, [timetable]);

  useEffect(() => () => { stopEverything(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function stopEverything() {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function start() {
    setError(null);
    setLoading(true);
    try {
      const match = detectSubject(timetable);
      setSubject(match?.subject ?? "Unscheduled");

      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const landmarker = await getFaceLandmarker();

      totalsRef.current = {};
      maxRef.current = 0;
      timelineRef.current = [];
      startedAtRef.current = new Date();
      lastTickRef.current = 0;
      setDist({});
      setStudents(0);
      setMaxStudents(0);
      setElapsed(0);
      runningRef.current = true;
      setRunning(true);
      setLoading(false);

      const loop = () => {
        if (!runningRef.current || !videoRef.current) return;
        const now = performance.now();
        try {
          if (videoRef.current.readyState >= 2) {
            const res = landmarker.detectForVideo(videoRef.current, now);
            const frame = analyzeFrame(res);
            setStudents(frame.students);
            if (frame.students > maxRef.current) {
              maxRef.current = frame.students;
              setMaxStudents(frame.students);
            }
            // sample once per second into totals + timeline
            if (now - lastTickRef.current > 1000) {
              lastTickRef.current = now;
              Object.entries(frame.expressions).forEach(([k, v]) => {
                totalsRef.current[k] = (totalsRef.current[k] ?? 0) + v;
              });
              setDist({ ...totalsRef.current });
              const started = startedAtRef.current!.getTime();
              const secs = Math.round((Date.now() - started) / 1000);
              setElapsed(secs);
              timelineRef.current.push({
                t: new Date().toTimeString().slice(0, 8),
                students: frame.students,
                engagement: engagementFromDistribution(frame.expressions),
                expressions: frame.expressions,
              });
            }
          }
        } catch {
          /* skip frame */
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e: any) {
      setLoading(false);
      setError(e?.message ?? "Could not start the camera");
      toast.error(e?.message ?? "Could not start the camera");
      stopEverything();
    }
  }

  async function stop() {
    const startedAt = startedAtRef.current;
    stopEverything();
    setRunning(false);
    if (!startedAt) return;
    const endedAt = new Date();
    const duration = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));
    const distribution = { ...totalsRef.current };
    const timeline = timelineRef.current;
    const present = timeline.length
      ? Math.round(timeline.reduce((s, p) => s + p.students, 0) / timeline.length)
      : 0;

    const { error: err } = await supabase.from("engagement_sessions").insert({
      team_id: teamId,
      teacher_id: teacherId,
      subject,
      session_date: new Date().toISOString().slice(0, 10),
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_seconds: duration,
      students_present: present,
      max_students: maxRef.current,
      expression_distribution: distribution,
      engagement_score: engagementFromDistribution(distribution),
      timeline: timeline as any,
    } as any);

    if (err) toast.error(err.message);
    else {
      toast.success("Session saved");
      qc.invalidateQueries({ queryKey: ["engagement-sessions"] });
    }
  }

  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  const score = engagementFromDistribution(dist);

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Class / Team</div>
            <div className="font-semibold">{teamName}</div>
          </div>
          <div className="ml-0 sm:ml-6">
            <div className="text-xs text-muted-foreground">Detected subject (from timetable)</div>
            <div className="font-semibold text-primary">{subject}</div>
          </div>
          <div className="sm:ml-6">
            <div className="text-xs text-muted-foreground">Administrator</div>
            <div className="font-semibold">{teacherName}</div>
          </div>
          <div className="ml-auto flex gap-2">
            {!running ? (
              <button onClick={start} disabled={loading} className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-primary-foreground glow disabled:opacity-60" style={{ background: "var(--gradient-primary)" }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Start Analytics
              </button>
            ) : (
              <button onClick={stop} className="inline-flex items-center gap-2 rounded-xl bg-destructive px-5 py-2.5 text-sm font-medium text-destructive-foreground">
                <Square className="h-4 w-4" /> Stop Analytics
              </button>
            )}
          </div>
        </div>
        {subject === "Unscheduled" && (
          <p className="mt-3 flex items-center gap-2 text-xs text-yellow-400">
            <AlertTriangle className="h-3.5 w-3.5" /> No period matches the current day &amp; time in this class timetable — the session will be saved as “Unscheduled”.
          </p>
        )}
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        <p className="mt-3 text-[11px] text-muted-foreground">
          All face detection and expression estimation runs on-device in your browser. No video ever leaves this computer — only aggregate counts are saved.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="glass relative overflow-hidden rounded-2xl">
          <video ref={videoRef} playsInline muted className="aspect-video w-full bg-black/60 object-cover" />
          {!running && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <Video className="h-8 w-8 text-primary" />
              Camera is off. Press “Start Analytics”.
            </div>
          )}
          {running && (
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> LIVE · {fmtDuration(elapsed)}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <LiveStat icon={Users} label="Students present" value={String(students)} />
            <LiveStat icon={Users} label="Max detected" value={String(maxStudents)} />
            <LiveStat icon={Gauge} label="Engagement score" value={total ? `${score}%` : "—"} />
            <LiveStat icon={Gauge} label="Samples" value={String(total)} />
          </div>

          <div className="glass rounded-2xl p-5">
            <h4 className="mb-3 text-sm font-semibold">Expression distribution</h4>
            <ul className="space-y-2">
              {EXPRESSIONS.map((e) => {
                const v = dist[e] ?? 0;
                const pct = total ? Math.round((v / total) * 100) : 0;
                return (
                  <li key={e}>
                    <div className="flex justify-between text-xs">
                      <span>{e}</span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full transition-all" style={{ width: `${pct}%`, background: EXPR_COLORS[e] }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5 text-primary" /> {label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
