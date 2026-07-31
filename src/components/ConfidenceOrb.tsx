import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { chatWithTutor } from "@/lib/ai.functions";
import { Mic, MicOff, Loader2, AlertTriangle, PhoneOff, Volume2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pickVoice } from "@/components/SpeechPlayer";

type Status = "idle" | "listening" | "thinking" | "speaking" | "error";
type Turn = { role: "user" | "assistant"; content: string };

const COACH: Record<"language" | "interview", string> = {
  language:
    "You are EduSense Coach, an encouraging spoken-English conversation partner for Indian students. Keep every reply to 1-3 short spoken sentences. Gently correct grammar or pronunciation, then ask one engaging follow-up question. Never use markdown, lists, or symbols — this is read aloud.",
  interview:
    "You are EduSense Coach, a warm but rigorous mock interviewer for Indian students preparing for competitive exams and college admissions. Ask ONE question at a time. After each answer give brief honest feedback in one or two sentences, then ask the next question. Never use markdown or symbols — this is read aloud.",
};

const FEEDBACK_PROMPT =
  "The session is ending. Give the student honest, specific closing feedback in 3-4 spoken sentences: what they did well, the single biggest thing to improve, and one concrete tip to practise.";

/** Turn-based voice coach: SpeechRecognition in, Gemini in the middle, speechSynthesis out. */
export function ConfidenceOrb() {
  const runChat = useServerFn(chatWithTutor);
  const [mode, setMode] = useState<"language" | "interview" | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [interim, setInterim] = useState("");
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [sttSupported, setSttSupported] = useState(true);

  const recogRef = useRef<any>(null);
  const turnsRef = useRef<Turn[]>([]);
  const modeRef = useRef<"language" | "interview" | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { turnsRef.current = turns; }, [turns]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [turns, interim]);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    setSttSupported(!!SR);
  }, []);

  useEffect(() => () => {
    try { recogRef.current?.abort(); } catch { /* noop */ }
    try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
  }, []);

  const speak = (text: string, onDone?: () => void) => {
    const synth = window.speechSynthesis;
    if (!synth) { onDone?.(); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(synth.getVoices());
    if (v) {
      u.voice = v; u.lang = v.lang;
      if (!v.lang?.toLowerCase().startsWith("en-in")) setVoiceNote(`No Indian English (en-IN) voice found — using “${v.name}” instead.`);
      else setVoiceNote(null);
    } else {
      u.lang = "en-IN";
      setVoiceNote("No system voices detected — audio may be unavailable in this browser.");
    }
    setStatus("speaking");
    u.onend = () => { setStatus("idle"); onDone?.(); };
    u.onerror = () => { setStatus("idle"); onDone?.(); };
    synth.speak(u);
  };

  const askCoach = async (next: Turn[], extraSystem?: string) => {
    setStatus("thinking");
    try {
      const { reply } = await runChat({
        data: {
          messages: next.length ? next : [{ role: "user" as const, content: "Start the session with a warm opening line and your first question." }],
          system: COACH[modeRef.current ?? "language"] + (extraSystem ? `\n\n${extraSystem}` : ""),
          persona: "student" as const,
        },
      });
      const updated: Turn[] = [...next, { role: "assistant", content: reply }];
      setTurns(updated);
      speak(reply);
    } catch (e: any) {
      setError(e?.message ?? "The coach could not respond. Please try again.");
      setStatus("error");
    }
  };

  const listen = () => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Speech recognition isn’t supported in this browser. Try Chrome on desktop or Android."); setStatus("error"); return; }
    try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e: any) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t; else live += t;
      }
      setInterim(live);
    };
    rec.onerror = (e: any) => {
      setInterim("");
      setStatus("idle");
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        setError("Microphone access was blocked. Allow mic permission and press the orb to retry.");
        setStatus("error");
      }
    };
    rec.onend = () => {
      setInterim("");
      const said = finalText.trim();
      if (!said) { setStatus("idle"); return; }
      const next: Turn[] = [...turnsRef.current, { role: "user", content: said }];
      setTurns(next);
      askCoach(next);
    };
    recogRef.current = rec;
    setError(null);
    setStatus("listening");
    try { rec.start(); } catch { setStatus("idle"); }
  };

  const stopListening = () => { try { recogRef.current?.stop(); } catch { /* noop */ } };

  const start = (m: "language" | "interview") => {
    modeRef.current = m;
    setMode(m);
    setTurns([]);
    setError(null);
    askCoach([]);
  };

  const endSession = async () => {
    stopListening();
    try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    if (turnsRef.current.length) {
      const next: Turn[] = [...turnsRef.current, { role: "user", content: FEEDBACK_PROMPT }];
      await askCoach(next);
    } else {
      setMode(null); setStatus("idle");
    }
  };

  const leave = () => {
    stopListening();
    try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    setMode(null); setStatus("idle"); setTurns([]); setError(null);
  };

  if (!mode) {
    return (
      <div className="max-w-2xl mx-auto grid gap-4 md:grid-cols-2">
        {[
          { key: "language", title: "Language practice", desc: "Casual spoken English with gentle corrections." },
          { key: "interview", title: "Mock interview / competition", desc: "Interview and competitive-exam practice with honest feedback." },
        ].map((c) => (
          <button key={c.key} onClick={() => start(c.key as any)} className="glass rounded-2xl p-6 text-left hover:-translate-y-0.5 hover:glow transition-all">
            <h3 className="font-semibold">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-primary"><Mic className="h-4 w-4" /> Start voice session</div>
          </button>
        ))}
        {!sttSupported && (
          <div className="md:col-span-2 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-4 flex gap-3 text-sm">
            <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0" />
            <div>This browser doesn’t support speech recognition. Use Chrome (desktop or Android) for the voice experience.</div>
          </div>
        )}
      </div>
    );
  }

  const label =
    status === "listening" ? "Listening — speak now" :
    status === "thinking" ? "Thinking…" :
    status === "speaking" ? "Coach is speaking…" :
    status === "error" ? "Something went wrong" :
    "Tap the orb and answer";

  const busy = status === "thinking" || status === "speaking";

  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center py-6">
      <button
        onClick={() => (status === "listening" ? stopListening() : busy ? undefined : listen())}
        disabled={busy}
        aria-label={status === "listening" ? "Stop listening" : "Start speaking"}
        className="relative h-64 w-64 flex items-center justify-center outline-none"
      >
        <div
          className={"absolute inset-0 rounded-full opacity-40 blur-2xl transition-transform duration-500 " +
            (status === "speaking" ? "scale-110 animate-pulse" : status === "listening" ? "scale-105 animate-pulse" : status === "thinking" ? "scale-95" : "scale-90")}
          style={{ background: "var(--gradient-primary)" }}
        />
        <div className={"absolute h-52 w-52 rounded-full border border-primary/40 " + (status === "listening" ? "animate-ping" : "")} />
        <div className={"relative h-36 w-36 rounded-full flex items-center justify-center glow transition-transform " + (status === "speaking" ? "scale-105" : "scale-100")}
          style={{ background: "var(--gradient-primary)" }}>
          {status === "thinking" ? <Loader2 className="h-10 w-10 animate-spin text-primary-foreground" />
            : status === "speaking" ? <Volume2 className="h-10 w-10 text-primary-foreground" />
            : status === "error" ? <AlertTriangle className="h-10 w-10 text-primary-foreground" />
            : status === "listening" ? <Mic className="h-10 w-10 text-primary-foreground" />
            : <MicOff className="h-10 w-10 text-primary-foreground" />}
        </div>
      </button>

      <div className="mt-5 text-lg font-medium">{label}</div>
      <div className="mt-1 text-xs text-muted-foreground uppercase tracking-wider">Mode: {mode === "language" ? "Language practice" : "Mock interview"}</div>
      {interim && <div className="mt-2 text-sm text-muted-foreground italic">“{interim}”</div>}
      {error && <div className="mt-3 max-w-sm text-center text-sm text-red-400">{error}</div>}
      {voiceNote && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Info className="h-3.5 w-3.5" /> {voiceNote}</div>
      )}

      <div className="mt-6 flex gap-3">
        {status === "error" && <Button onClick={listen} style={{ background: "var(--gradient-primary)" }} className="glow"><Mic className="h-4 w-4 mr-2" /> Retry</Button>}
        <Button variant="secondary" onClick={endSession} disabled={busy}>Finish &amp; get feedback</Button>
        <Button variant="ghost" onClick={leave}><PhoneOff className="h-4 w-4 mr-2" /> Exit</Button>
      </div>

      <div ref={scrollRef} className="mt-8 w-full glass rounded-2xl p-5 max-h-72 overflow-y-auto space-y-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Transcript</div>
        {turns.length === 0 ? (
          <p className="text-sm text-muted-foreground">Your conversation will appear here as you speak.</p>
        ) : turns.filter((t) => t.content !== FEEDBACK_PROMPT).map((t, i) => (
          <div key={i} className={"flex " + (t.role === "user" ? "justify-end" : "justify-start")}>
            <div className={"max-w-[85%] rounded-2xl px-4 py-2 text-sm " + (t.role === "user" ? "bg-primary/25 border border-primary/40" : "bg-secondary/60 border border-border")}>
              {t.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
