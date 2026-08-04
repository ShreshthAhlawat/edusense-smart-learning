/**
 * Helpers for the AI Classroom Engagement Analytics module.
 * All AI processing runs in the browser (MediaPipe tasks-vision); no backend AI.
 */

export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;
export type Day = (typeof DAYS)[number];

export const EXPRESSIONS = [
  "Focused",
  "Happy",
  "Neutral",
  "Confused",
  "Distracted",
  "Bored",
] as const;
export type Expression = (typeof EXPRESSIONS)[number];

export type TimetableRow = {
  id?: string;
  team_id?: string;
  day_of_week: string;
  period: string;
  subject: string;
  start_time: string;
  end_time: string;
  teacher_name?: string | null;
};

export type TimelinePoint = {
  t: string; // HH:MM:SS
  students: number;
  engagement: number;
  expressions: Record<string, number>;
};

export type EngagementSession = {
  id: string;
  team_id: string;
  subject: string;
  session_date: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  students_present: number;
  max_students: number;
  expression_distribution: Record<string, number>;
  engagement_score: number;
  timeline: TimelinePoint[];
};

/** Weight of each mood toward the overall engagement score (0-100). */
const ENGAGEMENT_WEIGHTS: Record<Expression, number> = {
  Focused: 100,
  Happy: 88,
  Neutral: 62,
  Confused: 40,
  Distracted: 18,
  Bored: 8,
};

/**
 * Engagement score. The dominant mood carries most of the weight — a class that
 * is mostly Focused scores high, a class that is mostly Bored/Distracted scores low —
 * blended with the weighted average of every other mood.
 */
export function engagementFromDistribution(dist: Record<string, number>) {
  const entries = (Object.entries(dist) as [Expression, number][]).filter(([, v]) => v > 0);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  if (!total) return 0;
  const weighted =
    entries.reduce((acc, [k, v]) => acc + (ENGAGEMENT_WEIGHTS[k] ?? 50) * v, 0) / total;
  const [domMood, domCount] = entries.sort((a, b) => b[1] - a[1])[0];
  const domShare = domCount / total; // 0..1
  const domWeight = ENGAGEMENT_WEIGHTS[domMood] ?? 50;
  // the stronger a single mood dominates, the more it pulls the final score
  const score = weighted * (1 - domShare * 0.6) + domWeight * (domShare * 0.6);
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** The mood most present in a distribution. */
export function dominantMood(dist: Record<string, number>): Expression | null {
  const entries = (Object.entries(dist) as [Expression, number][]).filter(([, v]) => v > 0);
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function normalizeTime(raw: string) {
  const s = String(raw ?? "").trim();
  const ampm = /(am|pm)$/i.exec(s);
  const core = s.replace(/\s*(am|pm)\s*$/i, "");
  let [h, m] = core.split(":").map((x) => parseInt(x, 10));
  if (isNaN(h)) return "";
  if (isNaN(m)) m = 0;
  if (ampm) {
    const isPm = ampm[1].toLowerCase() === "pm";
    if (isPm && h < 12) h += 12;
    if (!isPm && h === 12) h = 0;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function normalizeDay(raw: string): string {
  const s = String(raw ?? "").trim().toLowerCase();
  const found = DAYS.find((d) => d.toLowerCase().startsWith(s.slice(0, 3)));
  return found ?? "Monday";
}

/** Find the subject scheduled right now for a class. */
export function detectSubject(rows: TimetableRow[], now = new Date()) {
  const day = DAYS[(now.getDay() + 6) % 7];
  const mins = now.getHours() * 60 + now.getMinutes();
  const match = rows.find(
    (r) =>
      normalizeDay(r.day_of_week) === day &&
      mins >= toMinutes(r.start_time) &&
      mins < toMinutes(r.end_time),
  );
  return match ?? null;
}

/** Parse a CSV/Excel-derived matrix of rows into timetable entries. */
export function rowsFromMatrix(matrix: string[][]): TimetableRow[] {
  if (!matrix.length) return [];
  const header = matrix[0].map((h) => String(h ?? "").trim().toLowerCase());
  const idx = (...names: string[]) =>
    header.findIndex((h) => names.some((n) => h.includes(n)));
  const iDay = idx("day");
  const iPeriod = idx("period");
  const iSubject = idx("subject");
  const iStart = idx("start");
  const iEnd = idx("end");
  const iTeacher = idx("teacher");

  return matrix
    .slice(1)
    .filter((r) => r.some((c) => String(c ?? "").trim() !== ""))
    .map((r, i) => ({
      day_of_week: normalizeDay(iDay >= 0 ? r[iDay] : ""),
      period: String((iPeriod >= 0 ? r[iPeriod] : "") || i + 1).trim(),
      subject: String((iSubject >= 0 ? r[iSubject] : "") || "Subject").trim(),
      start_time: normalizeTime(iStart >= 0 ? r[iStart] : "") || "09:00",
      end_time: normalizeTime(iEnd >= 0 ? r[iEnd] : "") || "10:00",
      teacher_name: iTeacher >= 0 ? String(r[iTeacher] ?? "").trim() || null : null,
    }));
}

export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); out.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); out.push(row); }
  return out;
}

export async function parseTimetableFile(file: File): Promise<TimetableRow[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || file.type === "text/csv") {
    return rowsFromMatrix(parseCsv(await file.text()));
  }
  const XLSX: any = await import(/* @vite-ignore */ "https://esm.sh/xlsx@0.18.5" as any);
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrix: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
  return rowsFromMatrix(matrix);
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadPdf(title: string, lines: string[], table?: { head: string[]; body: (string | number)[][] }) {
  const mod: any = await import(/* @vite-ignore */ "https://esm.sh/jspdf@2.5.2" as any);
  const jsPDF = mod.jsPDF ?? mod.default?.jsPDF ?? mod.default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = 48;
  doc.setFontSize(18);
  doc.text(title, 40, y);
  y += 22;
  doc.setFontSize(11);
  lines.forEach((l) => {
    doc.text(String(l), 40, y);
    y += 16;
  });
  if (table) {
    y += 10;
    doc.setFontSize(10);
    const colW = 515 / table.head.length;
    doc.text(table.head.join("   |   "), 40, y);
    y += 14;
    table.body.forEach((r) => {
      if (y > 780) { doc.addPage(); y = 48; }
      r.forEach((c, i) => doc.text(String(c ?? "").slice(0, 22), 40 + i * colW, y));
      y += 14;
    });
  }
  doc.save(`${title.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

export function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`;
}
