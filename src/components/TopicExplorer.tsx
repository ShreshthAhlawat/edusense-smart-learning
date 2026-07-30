import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { topicOverview } from "@/lib/ai.functions";
import { Markdown } from "@/components/Markdown";
import { SpeechPlayer } from "@/components/SpeechPlayer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Compass, Info, Printer } from "lucide-react";

const CLASSES = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];

/** Pre-written common topics per Class > Subject. No external search involved. */
const TOPICS: Record<string, Record<string, string[]>> = {
  "Class 6": {
    Mathematics: ["Whole Numbers", "Fractions", "Basic Geometry"],
    Science: ["Food and Nutrition", "Separation of Substances", "Light and Shadows"],
    "Social Science": ["Early Humans", "Maps and Globes", "Rural Livelihoods"],
    English: ["Parts of Speech", "Tenses", "Story Writing"],
  },
  "Class 7": {
    Mathematics: ["Integers", "Simple Equations", "Perimeter and Area"],
    Science: ["Heat", "Acids, Bases and Salts", "Respiration in Organisms"],
    "Social Science": ["The Mughal Empire", "Climate and Weather", "Markets Around Us"],
    English: ["Active and Passive Voice", "Letter Writing", "Comprehension Skills"],
  },
  "Class 8": {
    Mathematics: ["Rational Numbers", "Linear Equations in One Variable", "Mensuration"],
    Science: ["Force and Pressure", "Cell Structure and Functions", "Chemical Effects of Electric Current"],
    "Social Science": ["The Revolt of 1857", "Indian Constitution", "Resources"],
    English: ["Reported Speech", "Essay Writing", "Modals"],
  },
  "Class 9": {
    Mathematics: ["Linear Equations in Two Variables", "Triangles", "Probability"],
    Science: ["Motion", "Atoms and Molecules", "Tissues"],
    "Social Science": ["The French Revolution", "Physical Features of India", "Democracy"],
    English: ["Clauses", "Descriptive Paragraphs", "Poetry Devices"],
  },
  "Class 10": {
    Mathematics: ["Quadratic Equations", "Trigonometry", "Arithmetic Progressions"],
    Science: ["Chemical Reactions and Equations", "Light — Reflection and Refraction", "Life Processes"],
    "Social Science": ["Nationalism in India", "Sectors of the Indian Economy", "Federalism"],
    English: ["Determiners", "Analytical Writing", "Subject-Verb Agreement"],
  },
  "Class 11": {
    Mathematics: ["Sets and Relations", "Limits and Derivatives", "Permutations and Combinations"],
    Physics: ["Laws of Motion", "Work, Energy and Power", "Thermodynamics"],
    Chemistry: ["Atomic Structure", "Chemical Bonding", "Equilibrium"],
    Biology: ["Cell — The Unit of Life", "Plant Kingdom", "Photosynthesis"],
  },
  "Class 12": {
    Mathematics: ["Integrals", "Matrices and Determinants", "Probability Distributions"],
    Physics: ["Electrostatics", "Current Electricity", "Ray Optics"],
    Chemistry: ["Electrochemistry", "Chemical Kinetics", "Organic Compounds with Functional Groups"],
    Biology: ["Human Reproduction", "Genetics and Evolution", "Biotechnology"],
  },
};

export function TopicExplorer() {
  const run = useServerFn(topicOverview);
  const [classLevel, setClassLevel] = useState("Class 9");
  const [subject, setSubject] = useState("Mathematics");
  const [active, setActive] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");

  const subjects = Object.keys(TOPICS[classLevel] ?? {});
  const currentSubject = subjects.includes(subject) ? subject : subjects[0];
  const topics = TOPICS[classLevel]?.[currentSubject] ?? [];

  const open = async (topic: string) => {
    setActive(topic); setBusy(true); setResult("");
    try {
      const { markdown } = await run({ data: { topic, subject: currentSubject, classLevel } });
      setResult(markdown);
    } catch (e: any) {
      setResult(`⚠️ ${e?.message ?? "Something went wrong"}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Compass className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Choose a class and subject</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 max-w-lg">
          <Select value={classLevel} onValueChange={(v) => { setClassLevel(v); setActive(null); setResult(""); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={currentSubject} onValueChange={(v) => { setSubject(v); setActive(null); setResult(""); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {topics.map((t) => (
            <button
              key={t}
              onClick={() => open(t)}
              className={
                "rounded-xl border px-4 py-2 text-sm transition-all hover:-translate-y-0.5 " +
                (active === t ? "border-primary bg-primary/20 glow" : "border-border bg-secondary/40 hover:bg-secondary")
              }
            >
              {t}
            </button>
          ))}
        </div>

        <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          These are AI-generated overviews, not results from an external search engine. Always cross-check with your textbook.
        </p>
      </div>

      {(busy || result) && (
        <div className="glass rounded-2xl p-6 print-area animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
            <h3 className="font-semibold">{active}</h3>
            {!busy && result && (
              <div className="flex items-center gap-2">
                <SpeechPlayer text={result} />
                <Button size="sm" variant="secondary" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-1" /> Print
                </Button>
              </div>
            )}
          </div>
          {busy ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating an overview of “{active}”…
            </div>
          ) : (
            <Markdown>{result}</Markdown>
          )}
        </div>
      )}
    </div>
  );
}
