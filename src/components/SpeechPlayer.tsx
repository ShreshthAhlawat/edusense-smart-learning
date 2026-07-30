import { useEffect, useRef, useState } from "react";
import { Play, Pause, Square, Volume2 } from "lucide-react";

/** Strips markdown/LaTeX noise so the speech output sounds natural. */
function toSpeakable(md: string) {
  return md
    .replace(/\$\$[\s\S]*?\$\$/g, " (equation) ")
    .replace(/\$[^$\n]*\$/g, " (expression) ")
    .replace(/```[\s\S]*?```/g, " (code block) ")
    .replace(/[#*_>`|]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\n{2,}/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

export function pickVoice(voices: SpeechSynthesisVoice[]) {
  return (
    voices.find((v) => v.lang === "en-IN") ??
    voices.find((v) => v.lang?.toLowerCase().startsWith("en-in")) ??
    voices.find((v) => v.lang?.startsWith("en-GB")) ??
    voices.find((v) => v.lang?.startsWith("en")) ??
    null
  );
}

/** Minimal Play / Pause / Stop bar built on the browser's speechSynthesis. */
export function SpeechPlayer({ text, label = "Listen" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const [supported, setSupported] = useState(true);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  useEffect(() => {
    return () => { try { window.speechSynthesis?.cancel(); } catch { /* noop */ } };
  }, []);

  // Reset when the source content changes.
  useEffect(() => { try { window.speechSynthesis?.cancel(); } catch { /* noop */ } setState("idle"); }, [text]);

  if (!supported) {
    return <div className="text-xs text-muted-foreground">Audio playback isn’t supported in this browser.</div>;
  }

  const play = () => {
    const synth = window.speechSynthesis;
    if (state === "paused") { synth.resume(); setState("playing"); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(toSpeakable(text));
    const v = pickVoice(synth.getVoices());
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = "en-IN"; }
    u.onend = () => setState("idle");
    u.onerror = () => setState("idle");
    utterRef.current = u;
    synth.speak(u);
    setState("playing");
  };

  const pause = () => { window.speechSynthesis.pause(); setState("paused"); };
  const stop = () => { window.speechSynthesis.cancel(); setState("idle"); };

  return (
    <div className="inline-flex items-center gap-1 rounded-full glass px-2 py-1">
      <Volume2 className="h-3.5 w-3.5 text-primary ml-1" />
      <span className="text-xs text-muted-foreground mr-1">{label}</span>
      {state !== "playing" ? (
        <button onClick={play} aria-label="Play" className="rounded-full p-1.5 hover:bg-secondary transition-colors">
          <Play className="h-3.5 w-3.5" />
        </button>
      ) : (
        <button onClick={pause} aria-label="Pause" className="rounded-full p-1.5 hover:bg-secondary transition-colors">
          <Pause className="h-3.5 w-3.5" />
        </button>
      )}
      <button onClick={stop} disabled={state === "idle"} aria-label="Stop" className="rounded-full p-1.5 hover:bg-secondary transition-colors disabled:opacity-40">
        <Square className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
