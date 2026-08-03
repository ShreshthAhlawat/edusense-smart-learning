import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DAYS, parseTimetableFile, normalizeTime, downloadCsv, type TimetableRow } from "@/lib/engagement";
import { Loader2, Upload, Plus, Trash2, CalendarClock, Download } from "lucide-react";

export function useTimetable(teamId: string) {
  return useQuery({
    queryKey: ["timetable", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_timetables")
        .select("*")
        .eq("team_id", teamId)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return (data ?? []) as unknown as TimetableRow[];
    },
    enabled: !!teamId,
  });
}

const emptyDraft = { day_of_week: "Monday", period: "1", subject: "", start_time: "09:00", end_time: "10:00", teacher_name: "" };

export function TimetableManager({ teamId, teacherId, teamName }: { teamId: string; teacherId: string; teamName: string }) {
  const qc = useQueryClient();
  const rows = useTimetable(teamId);
  const [draft, setDraft] = useState({ ...emptyDraft });
  const [uploading, setUploading] = useState(false);

  const insert = useMutation({
    mutationFn: async (payload: TimetableRow[]) => {
      const { error } = await supabase.from("class_timetables").insert(
        payload.map((r) => ({
          team_id: teamId,
          teacher_id: teacherId,
          day_of_week: r.day_of_week,
          period: r.period,
          subject: r.subject,
          start_time: r.start_time,
          end_time: r.end_time,
          teacher_name: r.teacher_name || null,
        })) as any,
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timetable", teamId] });
      toast.success("Timetable updated");
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save timetable"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("class_timetables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timetable", teamId] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<TimetableRow> }) => {
      const { error } = await supabase.from("class_timetables").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timetable", teamId] }),
  });

  async function onFile(file: File) {
    setUploading(true);
    try {
      const parsed = await parseTimetableFile(file);
      if (!parsed.length) { toast.error("No rows found in that file"); return; }
      await insert.mutateAsync(parsed);
      toast.success(`Imported ${parsed.length} periods`);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not read that file");
    } finally {
      setUploading(false);
    }
  }

  const list = rows.data ?? [];

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center gap-3">
          <CalendarClock className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Timetable for {teamName}</h3>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              onClick={() =>
                downloadCsv("timetable-template.csv", [
                  ["Class", "Day", "Period", "Subject", "Start Time", "End Time", "Teacher"],
                  [teamName, "Monday", "1", "Mathematics", "09:00", "09:45", ""],
                ])
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs hover:bg-secondary"
            >
              <Download className="h-3.5 w-3.5" /> CSV template
            </button>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-primary-foreground glow" style={{ background: "var(--gradient-primary)" }}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload CSV / Excel
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ""; }}
              />
            </label>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Columns: Class, Day, Period, Subject, Start Time, End Time, Teacher (optional). Upload once — edit any time.
        </p>
      </div>

      {/* Manual entry */}
      <div className="glass rounded-2xl p-6">
        <h4 className="mb-3 text-sm font-semibold">Add a period manually</h4>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <select value={draft.day_of_week} onChange={(e) => setDraft({ ...draft, day_of_week: e.target.value })} className="rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm">
            {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <input value={draft.period} onChange={(e) => setDraft({ ...draft, period: e.target.value })} placeholder="Period" className="rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm" />
          <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="Subject" className="rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm" />
          <input type="time" value={draft.start_time} onChange={(e) => setDraft({ ...draft, start_time: e.target.value })} className="rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm" />
          <input type="time" value={draft.end_time} onChange={(e) => setDraft({ ...draft, end_time: e.target.value })} className="rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm" />
          <input value={draft.teacher_name} onChange={(e) => setDraft({ ...draft, teacher_name: e.target.value })} placeholder="Teacher (optional)" className="rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm" />
        </div>
        <button
          onClick={() => {
            if (!draft.subject.trim()) { toast.error("Subject is required"); return; }
            insert.mutate([{ ...draft, start_time: normalizeTime(draft.start_time), end_time: normalizeTime(draft.end_time) }]);
            setDraft({ ...emptyDraft });
          }}
          disabled={insert.isPending}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground glow"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Plus className="h-4 w-4" /> Add period
        </button>
      </div>

      <div className="glass rounded-2xl p-6">
        <h4 className="mb-4 text-sm font-semibold">Current timetable ({list.length} periods)</h4>
        {rows.isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : list.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="text-left">
                  <th className="pb-2">Day</th><th className="pb-2">Period</th><th className="pb-2">Subject</th>
                  <th className="pb-2">Start</th><th className="pb-2">End</th><th className="pb-2">Teacher</th><th />
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="py-2">{r.day_of_week}</td>
                    <td className="py-2">{r.period}</td>
                    <td className="py-2">
                      <input
                        defaultValue={r.subject}
                        onBlur={(e) => e.target.value !== r.subject && update.mutate({ id: r.id!, patch: { subject: e.target.value } })}
                        className="w-40 rounded-md border border-transparent bg-transparent px-2 py-1 hover:border-input focus:border-input"
                      />
                    </td>
                    <td className="py-2">{String(r.start_time).slice(0, 5)}</td>
                    <td className="py-2">{String(r.end_time).slice(0, 5)}</td>
                    <td className="py-2 text-muted-foreground">{r.teacher_name ?? "—"}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => remove.mutate(r.id!)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No timetable yet — upload a file or add periods manually. Subject detection needs this.</p>
        )}
      </div>
    </div>
  );
}
