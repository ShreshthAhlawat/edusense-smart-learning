import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2, AlertTriangle, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Status = "idle" | "connecting" | "listening" | "speaking" | "error";

// ---- audio helpers ----
function encodePcm16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function downsampleTo16k(buffer: Float32Array, sampleRate: number): Float32Array {
  if (sampleRate === 16000) return buffer;
  const ratio = sampleRate / 16000;
  const newLen = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLen);
  let off = 0, i = 0;
  while (i < newLen) {
    const nextOff = Math.round((i + 1) * ratio);
    let acc = 0, cnt = 0;
    for (let j = off; j < nextOff && j < buffer.length; j++) { acc += buffer[j]; cnt++; }
    result[i] = cnt ? acc / cnt : 0;
    off = nextOff; i++;
  }
  return result;
}

function b64FromBytes(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function bytesFromB64(b: string): Uint8Array {
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function ConfidenceOrb() {
  const [mode, setMode] = useState<"language" | "interview" | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletRef = useRef<ScriptProcessorNode | null>(null);
  const playCtxRef = useRef<AudioContext | null>(null);
  const playheadRef = useRef<number>(0);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const relayUrl = (import.meta as any).env?.VITE_GEMINI_RELAY_URL as string | undefined;

  const cleanup = () => {
    try { wsRef.current?.close(); } catch {}
    wsRef.current = null;
    try { workletRef.current?.disconnect(); } catch {}
    workletRef.current = null;
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    streamRef.current = null;
    try { ctxRef.current?.close(); } catch {}
    ctxRef.current = null;
    sourcesRef.current.forEach((s) => { try { s.stop(); } catch {} });
    sourcesRef.current = [];
    try { playCtxRef.current?.close(); } catch {}
    playCtxRef.current = null;
    playheadRef.current = 0;
  };

  useEffect(() => () => cleanup(), []);

  const stopPlayback = () => {
    sourcesRef.current.forEach((s) => { try { s.stop(); } catch {} });
    sourcesRef.current = [];
    playheadRef.current = 0;
  };

  const playChunk = (bytes: Uint8Array) => {
    if (!playCtxRef.current) playCtxRef.current = new AudioContext({ sampleRate: 24000 });
    const ctx = playCtxRef.current;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const samples = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    const floats = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) floats[i] = samples[i] / 32768;
    const buf = ctx.createBuffer(1, floats.length, 24000);
    buf.copyToChannel(floats, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const start = Math.max(playheadRef.current, ctx.currentTime + 0.02);
    src.start(start);
    playheadRef.current = start + buf.duration;
    sourcesRef.current.push(src);
    src.onended = () => { sourcesRef.current = sourcesRef.current.filter((s) => s !== src); };
    setStatus("speaking");
  };

  const start = async (m: "language" | "interview") => {
    setError(null);
    setMode(m);
    if (!relayUrl) {
      setError("Voice relay not configured. Set VITE_GEMINI_RELAY_URL to your deployed relay's wss:// URL.");
      setStatus("error");
      return;
    }
    setStatus("connecting");

    // Ask for mic first — surfaces the browser permission prompt.
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
    } catch {
      setError("We couldn't access your microphone. Please allow mic permission and try again.");
      setStatus("error");
      return;
    }
    streamRef.current = stream;

    // Open relay socket.
    const ws = new WebSocket(relayUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "start", mode: m }));
      setStatus("listening");
      // Set up mic capture → 16k PCM chunks → send as base64.
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      workletRef.current = proc;
      proc.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        // Simple barge-in: any strong mic input while assistant is speaking → cut playback.
        let peak = 0;
        for (let i = 0; i < input.length; i++) { const a = Math.abs(input[i]); if (a > peak) peak = a; }
        if (peak > 0.06 && sourcesRef.current.length > 0) {
          stopPlayback();
          ws.send(JSON.stringify({ type: "interrupt" }));
        }
        const down = downsampleTo16k(input, ctx.sampleRate);
        const pcm = encodePcm16(down);
        const bytes = new Uint8Array(pcm.buffer);
        ws.send(JSON.stringify({ type: "audio", data: b64FromBytes(bytes) }));
      };
      source.connect(proc);
      proc.connect(ctx.destination);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data));
        if (msg.type === "audio" && msg.data) playChunk(bytesFromB64(msg.data));
        else if (msg.type === "turn_complete") setStatus("listening");
        else if (msg.type === "interrupted") { stopPlayback(); setStatus("listening"); }
        else if (msg.type === "error") { setError(msg.error || "Relay error"); setStatus("error"); }
      } catch {}
    };
    ws.onerror = () => { setError("Voice relay connection failed."); setStatus("error"); };
    ws.onclose = () => { if (status !== "error") setStatus("idle"); };
  };

  const hangup = () => { cleanup(); setStatus("idle"); setMode(null); };

  if (!mode || status === "idle") {
    return (
      <div className="max-w-2xl mx-auto grid gap-4 md:grid-cols-2">
        {[
          { key: "language", title: "Language practice", desc: "Casual English conversation with gentle corrections." },
          { key: "interview", title: "Mock interview / competition", desc: "Practice interviews and competitive exams with feedback." },
        ].map((c) => (
          <button key={c.key} onClick={() => start(c.key as any)} className="glass rounded-2xl p-6 text-left hover:-translate-y-0.5 hover:glow transition-all">
            <h3 className="font-semibold">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-primary"><Mic className="h-4 w-4" /> Start voice session</div>
          </button>
        ))}
        {!relayUrl && (
          <div className="md:col-span-2 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-4 flex gap-3 text-sm">
            <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0" />
            <div>
              <div className="font-medium">Voice relay not configured yet.</div>
              <p className="mt-1 text-muted-foreground">Deploy the small relay in <code className="text-xs">/relay</code> (see its README) and set <code className="text-xs">VITE_GEMINI_RELAY_URL</code> to its <code className="text-xs">wss://</code> URL.</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const label = status === "connecting" ? "Connecting…"
    : status === "listening" ? "Listening — speak anytime"
    : status === "speaking" ? "Coach is speaking…"
    : status === "error" ? "Something went wrong"
    : "Ready";

  return (
    <div className="max-w-xl mx-auto flex flex-col items-center py-10">
      <div className="relative h-72 w-72 flex items-center justify-center">
        {/* Outer glow ring */}
        <div className={"absolute inset-0 rounded-full opacity-40 blur-2xl transition-transform duration-500 " + (status === "speaking" ? "scale-110 animate-pulse" : status === "listening" ? "scale-100" : "scale-90")}
          style={{ background: "var(--gradient-primary)" }} />
        {/* Middle ring */}
        <div className={"absolute h-56 w-56 rounded-full border border-primary/40 " + (status === "listening" ? "animate-ping" : "")} />
        {/* Core orb */}
        <div className={"relative h-40 w-40 rounded-full flex items-center justify-center glow transition-transform " + (status === "speaking" ? "scale-105" : "scale-100")}
          style={{ background: "var(--gradient-primary)" }}>
          {status === "connecting" ? <Loader2 className="h-10 w-10 animate-spin text-primary-foreground" />
            : status === "error" ? <AlertTriangle className="h-10 w-10 text-primary-foreground" />
            : status === "listening" ? <Mic className="h-10 w-10 text-primary-foreground" />
            : <MicOff className="h-10 w-10 text-primary-foreground" />}
        </div>
      </div>

      <div className="mt-6 text-lg font-medium">{label}</div>
      <div className="mt-1 text-xs text-muted-foreground uppercase tracking-wider">Mode: {mode}</div>

      {error && (
        <div className="mt-4 max-w-sm text-center text-sm text-red-400">{error}</div>
      )}

      <div className="mt-8 flex gap-3">
        {status === "error" ? (
          <Button onClick={() => start(mode)} style={{ background: "var(--gradient-primary)" }} className="glow"><Mic className="h-4 w-4 mr-2" /> Retry</Button>
        ) : null}
        <Button variant="secondary" onClick={hangup}><PhoneOff className="h-4 w-4 mr-2" /> End session</Button>
      </div>
    </div>
  );
}
