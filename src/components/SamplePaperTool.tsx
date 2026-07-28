import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateSamplePaper } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Loader2, Printer, Copy, Sparkles } from "lucide-react";

export function SamplePaperTool() {
  const run = useServerFn(generateSamplePaper);
  const [topics, setTopics] = useState("");
  const [classLevel, setClassLevel] = useState("Class 8");
  const [language, setLanguage] = useState("English");
  const [count, setCount] = useState(12);
  const [busy, setBusy] = useState(false);
  const [markdown, setMarkdown] = useState("");

  const go = async () => {
    if (!topics.trim()) return toast.error("Enter 2–3 topics, comma separated");
    setBusy(true);
    try {
      const { markdown } = await run({ data: { topics, classLevel, language, totalQuestions: count } });
      setMarkdown(markdown);
    } catch (e: any) {
      toast.error(e.message ?? "Could not generate sample paper");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      <div className="glass rounded-2xl p-6 space-y-4 no-print h-fit">
        <div>
          <Label className="text-xs">Topics (comma separated, 2–5)</Label>
          <Input value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="e.g. Photosynthesis, The Water Cycle, Cells" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Class</Label>
            <select value={classLevel} onChange={(e) => setClassLevel(e.target.value)} className="w-full mt-1 rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm">
              {["Class 5","Class 6","Class 7","Class 8","Class 9","Class 10","Class 11","Class 12"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Language</Label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full mt-1 rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm">
              {["English","Hindi","Spanish","French"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <Label className="text-xs">Total questions</Label>
          <Input type="number" min={6} max={30} value={count} onChange={(e) => setCount(Number(e.target.value) || 12)} />
        </div>
        <Button onClick={go} disabled={busy} className="w-full glow" style={{ background: "var(--gradient-primary)" }}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating…</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate sample paper</>}
        </Button>
        <p className="text-[11px] text-muted-foreground">Mixes ~60% MCQ + ~40% written questions, plus an answer key.</p>
      </div>

      <div className="glass rounded-2xl p-6 print-area">
        {markdown ? (
          <>
            <div className="flex justify-between mb-4 no-print">
              <div className="text-sm text-muted-foreground">Ready to print or share.</div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(markdown); toast.success("Copied"); }}><Copy className="h-4 w-4 mr-1" /> Copy</Button>
                <Button size="sm" onClick={() => window.print()} style={{ background: "var(--gradient-primary)" }} className="glow"><Printer className="h-4 w-4 mr-1" /> Print</Button>
              </div>
            </div>
            <article className="prose prose-invert max-w-none prose-headings:text-foreground prose-strong:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90">
              <ReactMarkdown>{markdown}</ReactMarkdown>
            </article>
          </>
        ) : (
          <div className="text-center py-16 text-sm text-muted-foreground">Your printable sample paper will appear here.</div>
        )}
      </div>
    </div>
  );
}
