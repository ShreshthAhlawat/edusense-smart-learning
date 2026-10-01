import { useEffect, useMemo, useState } from "react";
import { format, addDays, startOfDay, differenceInCalendarDays } from "date-fns";
import { CalendarDays, Clock3, Plus, Trash2, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/auth";

type Entry = { id: string; title: string; kind: "exam" | "revision"; time: string; completed: boolean };
type PlannerProps = { userId?: string; profile: Profile | null; refreshProfile: () => Promise<void> };
const keyFor = (date: string) => `study:${date}`;
const dayKey = (date: Date) => format(date, "yyyy-MM-dd");

function readEntries(notes: Record<string, string>, date: string): Entry[] {
  try {
    const parsed: unknown = JSON.parse(notes[keyFor(date)] ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is Entry => entry && typeof entry.id === "string" && typeof entry.title === "string" && (entry.kind === "exam" || entry.kind === "revision"));
  } catch { return []; }
}

function ProgressRing({ value }: { value: number }) {
  return (
    <div className="relative size-14 shrink-0" role="img" aria-label={`${value}% of today's revision sessions completed`}>
      <svg viewBox="0 0 48 48" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="24" cy="24" r="19" fill="none" stroke="var(--secondary)" strokeWidth="4" />
        <circle cx="24" cy="24" r="19" fill="none" stroke="var(--planner-emerald)" strokeWidth="4" strokeLinecap="round" strokeDasharray="119.38" strokeDashoffset={119.38 * (1 - value / 100)} className="planner-ring" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{value}%</span>
    </div>
  );
}

export function SmartExamPlanner({ userId, profile, refreshProfile }: PlannerProps) {
  const [today, setToday] = useState(() => startOfDay(new Date()));
  const [now, setNow] = useState(() => Date.now());
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Entry["kind"]>("revision");
  const [time, setTime] = useState("09:00");
  const [saving, setSaving] = useState(false);
  const notes = profile?.calendar_notes ?? {};

  useEffect(() => {
    const timer = window.setInterval(() => { setNow(Date.now()); setToday(startOfDay(new Date())); }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const entriesFor = (date: string) => readEntries(notes, date);
  const upcoming = useMemo(() => Object.keys(notes)
    .filter((key) => key.startsWith("study:"))
    .flatMap((key) => readEntries(notes, key.slice(6)).filter((entry) => entry.kind === "exam")
      .map((entry) => ({ ...entry, date: key.slice(6), at: new Date(`${key.slice(6)}T${entry.time || "09:00"}:00`).getTime() })))
    .filter((entry) => Number.isFinite(entry.at) && entry.at >= now)
    .sort((a, b) => a.at - b.at).slice(0, 3), [notes, now]);

  const days = useMemo(() => Array.from({ length: 30 }, (_, index) => addDays(today, index - 29)), [today]);
  const completed = days.reduce((sum, date) => sum + entriesFor(dayKey(date)).filter((entry) => entry.kind === "revision" && entry.completed).length, 0);
  const todayEntries = entriesFor(dayKey(today)).filter((entry) => entry.kind === "revision");
  const todayProgress = todayEntries.length ? Math.round(todayEntries.filter((entry) => entry.completed).length / todayEntries.length * 100) : 0;

  const saveDate = async (date: string, entries: Entry[]) => {
    if (!userId) return false;
    setSaving(true);
    const next = { ...notes };
    if (entries.length) next[keyFor(date)] = JSON.stringify(entries);
    else delete next[keyFor(date)];
    const { error } = await supabase.from("profiles").update({ calendar_notes: next }).eq("id", userId);
    if (!error) await refreshProfile();
    setSaving(false);
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  const addEntry = async () => {
    if (!selected || !title.trim() || saving) return;
    if (await saveDate(selected, [...entriesFor(selected), { id: crypto.randomUUID(), title: title.trim(), kind, time, completed: false }])) {
      setTitle(""); toast.success(kind === "exam" ? "Exam added" : "Revision session added");
    }
  };

  const changeEntry = async (entry: Entry, remove = false) => {
    if (!selected || saving) return;
    const entries = entriesFor(selected);
    const next = remove ? entries.filter((item) => item.id !== entry.id) : entries.map((item) => item.id === entry.id ? { ...item, completed: !item.completed } : item);
    if (await saveDate(selected, next)) toast.success(remove ? "Removed" : "Study session updated");
  };

  return (
    <section className="glass planner-panel rounded-2xl p-5 min-w-0" aria-label="Smart Exam Planner">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div><div className="flex items-center gap-2 text-primary"><CalendarDays className="size-4" /><span className="text-[11px] uppercase font-semibold tracking-wider">Your study space</span></div>
          <h2 className="text-lg font-semibold mt-1">Smart Exam Planner</h2></div>
        <ProgressRing value={todayProgress} />
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between mb-2"><h3 className="text-xs font-semibold uppercase text-muted-foreground">Upcoming Exams</h3><Clock3 className="size-3.5 text-muted-foreground" /></div>
        {upcoming.length ? <div className="space-y-2">{upcoming.map((exam) => {
          const left = Math.max(0, exam.at - now);
          const daysLeft = Math.floor(left / 86_400_000);
          const hoursLeft = Math.floor((left % 86_400_000) / 3_600_000);
          return <Button variant="outline" key={`${exam.date}-${exam.id}`} onClick={() => { setMonth(new Date(`${exam.date}T12:00:00`)); setSelected(exam.date); }} className="planner-chip w-full h-auto min-h-12 justify-between gap-2 px-3 py-2 text-left">
            <span className="min-w-0"><span className="block truncate text-sm font-medium">{exam.title}</span><span className="block text-[11px] text-muted-foreground">{format(new Date(`${exam.date}T12:00:00`), "MMM d")} · {exam.time}</span></span>
            <span className="shrink-0 text-xs font-semibold text-[var(--planner-cyan)]">{daysLeft}d {hoursLeft}h</span>
          </Button>;
        })}</div> : <p className="text-xs text-muted-foreground border border-dashed rounded-md p-3">No upcoming exams. Choose a date to add one.</p>}
      </div>

      <div className="border-t border-border pt-3">
        <Calendar mode="single" month={month} onMonthChange={setMonth} selected={selected ? new Date(`${selected}T12:00:00`) : undefined}
          onSelect={(date) => date && setSelected(dayKey(date))} className="pointer-events-auto mx-auto p-0 bg-transparent [--cell-size:2rem] sm:[--cell-size:2.25rem]"
          modifiers={{ exam: (date) => entriesFor(dayKey(date)).some((entry) => entry.kind === "exam"), revision: (date) => entriesFor(dayKey(date)).some((entry) => entry.kind === "revision") }}
          modifiersClassNames={{ exam: "planner-exam-day", revision: "planner-revision-day" }} />
        <p className="text-center text-[11px] text-muted-foreground mt-2">Select a day to plan revision or an exam</p>
      </div>

      <div className="border-t border-border mt-5 pt-4">
        <div className="flex items-center justify-between gap-2 mb-3"><div><h3 className="text-sm font-semibold">Last 30 days</h3><p className="text-[11px] text-muted-foreground">{completed} revision sessions completed</p></div><Sparkles className="size-4 text-[var(--planner-emerald)]" /></div>
        <div className="grid grid-cols-10 gap-1.5" aria-label="Study activity over the last 30 days">
          {days.map((date) => { const key = dayKey(date); const count = entriesFor(key).filter((entry) => entry.kind === "revision" && entry.completed).length;
            return <Button key={key} variant="ghost" size="icon" title={`${format(date, "MMM d")}: ${count} completed`} aria-label={`${format(date, "MMMM d")}: ${count} completed study sessions`} onClick={() => { setMonth(date); setSelected(key); }} className={`planner-heat size-full aspect-square min-w-0 h-auto p-0 ${count >= 3 ? "level-3" : count === 2 ? "level-2" : count === 1 ? "level-1" : ""}`} />;
          })}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground"><span>{format(days[0], "MMM d")}</span><span>Today</span></div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setTitle(""); } }}>
        <DialogContent className="glass-strong max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selected ? format(new Date(`${selected}T12:00:00`), "EEEE, MMMM d") : "Study day"}</DialogTitle></DialogHeader>
          {selected && <div className="space-y-3">
            {notes[selected] && <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3 whitespace-pre-wrap">{notes[selected]}</p>}
            {entriesFor(selected).length ? <ul className="space-y-2">{entriesFor(selected).map((entry) => <li key={entry.id} className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 p-2">
              {entry.kind === "revision" ? <Button size="icon" variant="ghost" aria-label={entry.completed ? `Mark ${entry.title} incomplete` : `Complete ${entry.title}`} disabled={saving} onClick={() => changeEntry(entry)} className={`size-8 shrink-0 ${entry.completed ? "text-[var(--planner-emerald)]" : "text-muted-foreground"}`}><Check className="size-4" /></Button> : <CalendarDays className="size-4 shrink-0 mx-2 text-primary" />}
              <span className={`min-w-0 flex-1 text-sm ${entry.completed ? "line-through text-muted-foreground" : ""}`}><span className="block break-words">{entry.title}</span><span className="text-xs text-muted-foreground">{entry.kind === "exam" ? "Exam" : "Revision"} · {entry.time}</span></span>
              <Button size="icon" variant="ghost" aria-label={`Remove ${entry.title}`} disabled={saving} onClick={() => changeEntry(entry, true)} className="size-8 shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></Button>
            </li>)}</ul> : <p className="text-sm text-muted-foreground">Nothing planned for this day.</p>}
            <div className="border-t border-border pt-3 space-y-3"><div className="flex gap-2"><Button size="sm" variant={kind === "revision" ? "default" : "outline"} onClick={() => setKind("revision")}>Revision</Button><Button size="sm" variant={kind === "exam" ? "default" : "outline"} onClick={() => setKind("exam")}>Exam</Button></div>
              <div><Label htmlFor="planner-title">{kind === "exam" ? "Subject / exam" : "Study topic"}</Label><Input id="planner-title" className="mt-1" value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addEntry()} placeholder={kind === "exam" ? "e.g. Physics final" : "e.g. Revise algebra"} /></div>
              <div><Label htmlFor="planner-time">Time</Label><Input id="planner-time" type="time" className="mt-1" value={time} onChange={(event) => setTime(event.target.value)} /></div>
              <Button onClick={addEntry} disabled={!title.trim() || !time || saving} className="w-full"><Plus className="size-4" />{saving ? "Saving…" : `Add ${kind}`}</Button>
            </div>
          </div>}
        </DialogContent>
      </Dialog>
    </section>
  );
}
