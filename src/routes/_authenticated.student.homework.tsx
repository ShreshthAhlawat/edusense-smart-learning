import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardShell, PageHeader } from "@/components/DashboardShell";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/student/homework")({
  head: () => ({ meta: [
    { title: "Homework — EduSense" },
    { name: "description", content: "Track and complete your homework tasks." },
    { property: "og:title", content: "Homework — EduSense" },
    { property: "og:description", content: "Track and complete your homework." },
  ] }),
  component: Homework,
});

function Homework() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const hw = useQuery({
    queryKey: ["hw", user?.id],
    queryFn: async () => (await supabase.from("homework").select("*").eq("student_id", user!.id).order("created_at", { ascending: false })).data ?? [],
    enabled: !!user,
  });

  const add = async () => {
    if (!title.trim() || !user) return;
    const { error } = await supabase.from("homework").insert({ student_id: user.id, title });
    if (error) return toast.error(error.message);
    setTitle(""); hw.refetch();
  };

  return (
    <DashboardShell role="student" greeting="Homework">
      <PageHeader title="Homework" desc="Add tasks and check them off as you go." />
      <div className="glass rounded-2xl p-6 max-w-2xl">
        <div className="flex gap-2 mb-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="e.g. Read chapter 5" className="flex-1 rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm" />
          <Button onClick={add} style={{ background: "var(--gradient-primary)" }} className="glow">Add</Button>
        </div>
        {hw.data?.length === 0 && <p className="text-sm text-muted-foreground">No tasks. Add your first one above.</p>}
        <ul className="space-y-2">
          {hw.data?.map((h: any) => (
            <li key={h.id} className="flex items-center gap-3 rounded-lg bg-secondary/40 border border-border p-3">
              <input type="checkbox" checked={h.completed}
                onChange={async () => { await supabase.from("homework").update({ completed: !h.completed }).eq("id", h.id); hw.refetch(); }}
                className="h-4 w-4 accent-primary" />
              <span className={"flex-1 text-sm " + (h.completed ? "line-through text-muted-foreground" : "")}>{h.title}</span>
              <button className="text-xs text-muted-foreground hover:text-destructive"
                onClick={async () => { await supabase.from("homework").delete().eq("id", h.id); hw.refetch(); }}>Delete</button>
            </li>
          ))}
        </ul>
      </div>
    </DashboardShell>
  );
}
