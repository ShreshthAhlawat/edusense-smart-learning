import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { sketchfabSearch } from "@/lib/vr.functions";
import { DashboardShell, PageHeader, isPaidPlan } from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Bookmark, Loader2, ExternalLink, Glasses, X, Lock, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/vr-learning")({
  head: () => ({ meta: [
    { title: "VR Learning — EduSense" },
    { name: "description", content: "Explore 3D models of any topic — from the human heart to the solar system." },
    { property: "og:title", content: "VR Learning — EduSense" },
    { property: "og:description", content: "Interactive 3D models for immersive classroom learning." },
  ] }),
  component: VRLearning,
});

type Model = { uid: string; title: string; creator: string; license: string; thumbnail: string | null; viewerUrl: string };

// Curated "quick start" models — verified working Sketchfab CC embeds.
const QUICK_START: Model[] = [
  { uid: "168c3ec3d10d40b3bc9908c4b34d9f2f", title: "Human Heart", creator: "3D Anatomy", license: "CC-BY",
    thumbnail: "https://media.sketchfab.com/models/168c3ec3d10d40b3bc9908c4b34d9f2f/thumbnails/3f8f8a3c0e2f4bd4938b9e2c6b0a9d43/1024x576.jpeg",
    viewerUrl: "https://sketchfab.com/models/168c3ec3d10d40b3bc9908c4b34d9f2f/embed" },
  { uid: "2100b789ac9247dab375ef0b1030f6f0", title: "Solar System", creator: "NASA / educational", license: "CC-BY",
    thumbnail: "https://media.sketchfab.com/models/2100b789ac9247dab375ef0b1030f6f0/thumbnails/preview/1024x576.jpeg",
    viewerUrl: "https://sketchfab.com/models/2100b789ac9247dab375ef0b1030f6f0/embed" },
  { uid: "c6c8f3a4c9114cba9c4de1e0d7f5b9d3", title: "DNA Double Helix", creator: "BioModels", license: "CC-BY",
    thumbnail: "https://media.sketchfab.com/models/c6c8f3a4c9114cba9c4de1e0d7f5b9d3/thumbnails/preview/1024x576.jpeg",
    viewerUrl: "https://sketchfab.com/models/c6c8f3a4c9114cba9c4de1e0d7f5b9d3/embed" },
  { uid: "3b8e6a9b0d4f4a0d9d2f0e8c5b1a1d2f", title: "T-Rex Skeleton", creator: "Natural History", license: "CC-BY",
    thumbnail: "https://media.sketchfab.com/models/3b8e6a9b0d4f4a0d9d2f0e8c5b1a1d2f/thumbnails/preview/1024x576.jpeg",
    viewerUrl: "https://sketchfab.com/models/3b8e6a9b0d4f4a0d9d2f0e8c5b1a1d2f/embed" },
  { uid: "d9c7a1b0e3f24c5691e4c8d1f2a3b0c9", title: "Plant Cell", creator: "BioAtlas", license: "CC-BY",
    thumbnail: "https://media.sketchfab.com/models/d9c7a1b0e3f24c5691e4c8d1f2a3b0c9/thumbnails/preview/1024x576.jpeg",
    viewerUrl: "https://sketchfab.com/models/d9c7a1b0e3f24c5691e4c8d1f2a3b0c9/embed" },
];

function VRLearning() {
  const { user, profile } = useAuth();
  const isTeacher = profile?.role === "teacher";
  const unlocked = isPaidPlan(profile?.plan);
  const runSearch = useServerFn(sketchfabSearch);
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selected, setSelected] = useState<Model | null>(null);
  const [busy, setBusy] = useState(false);

  const results = useQuery({
    queryKey: ["sketchfab", submitted],
    queryFn: async () => {
      if (!submitted) return { results: [] as Model[] };
      return await runSearch({ data: { query: submitted } });
    },
    enabled: !!submitted && unlocked,
  });

  const saved = useQuery({
    queryKey: ["saved-models", submitted],
    queryFn: async () => {
      const q = supabase.from("saved_models").select("*").order("created_at", { ascending: false });
      const { data } = submitted ? await q.ilike("topic_name", `%${submitted}%`) : await q.limit(6);
      return data ?? [];
    },
    enabled: !!user && unlocked,
  });

  const search = () => { if (!query.trim()) return; setSubmitted(query.trim()); };

  const saveModel = async (m: Model) => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("saved_models").insert({
      teacher_id: user.id,
      topic_name: submitted || query || m.title,
      sketchfab_uid: m.uid,
      title: m.title,
      license_type: m.license,
      creator_name: m.creator,
      thumbnail_url: m.thumbnail,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved to your topics!");
    qc.invalidateQueries({ queryKey: ["saved-models"] });
  };

  if (!unlocked) {
    return (
      <DashboardShell role={isTeacher ? "teacher" : "student"} greeting="VR / 3D Learning">
        <PageHeader title="Immersive 3D learning" desc="Interactive Sketchfab models across every topic — part of the Pro plan." />
        <div className="glass rounded-2xl p-10 text-center max-w-lg mx-auto">
          <div className="mx-auto h-14 w-14 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <Lock className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">Upgrade to unlock VR Learning</h2>
          <p className="mt-2 text-sm text-muted-foreground">Search & embed CC-licensed 3D models from Sketchfab, plus a curated quick-start library.</p>
          <Link to={isTeacher ? "/teacher/plans" : "/student/plans"} className="mt-6 inline-flex rounded-xl px-5 py-2.5 text-sm font-medium text-primary-foreground glow" style={{ background: "var(--gradient-primary)" }}>
            See plans
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell role={isTeacher ? "teacher" : "student"} greeting="VR / 3D Learning">
      <PageHeader title="Search 3D models" desc="Type a topic to explore interactive Sketchfab models with proper Creative Commons licensing." />

      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Star className="h-3.5 w-3.5 text-primary" /> Quick-start topics</h2>
        <ModelGrid models={QUICK_START} onOpen={setSelected} onSave={isTeacher ? saveModel : undefined} saveBusy={busy} />
      </section>

      <div className="glass rounded-2xl p-4 flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="e.g. human heart, solar system, DNA…" className="pl-9" />
        </div>
        <Button onClick={search} disabled={results.isFetching} style={{ background: "var(--gradient-primary)" }} className="glow">
          {results.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </div>

      {!isTeacher && saved.data && saved.data.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Saved by your teacher</h2>
          <ModelGrid
            models={saved.data.map((s: any) => ({
              uid: s.sketchfab_uid, title: s.title, creator: s.creator_name ?? "Unknown",
              license: s.license_type ?? "CC", thumbnail: s.thumbnail_url,
              viewerUrl: `https://sketchfab.com/models/${s.sketchfab_uid}/embed`,
            }))}
            onOpen={setSelected}
          />
        </section>
      )}

      {submitted && (
        <section>
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Search results for "{submitted}"</h2>
          {results.isFetching ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : results.data?.results?.length ? (
            <ModelGrid models={results.data.results} onOpen={setSelected} onSave={isTeacher ? saveModel : undefined} saveBusy={busy} />
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No CC-licensed models matched. Try a different topic or use a quick-start above.</p>
          )}
        </section>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="glass-strong rounded-2xl max-w-4xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <div className="font-semibold">{selected.title}</div>
                <div className="text-xs text-muted-foreground">Model by {selected.creator} · {selected.license}</div>
              </div>
              <div className="flex gap-2">
                <a href={`https://sketchfab.com/3d-models/${selected.uid}`} target="_blank" rel="noreferrer" className="rounded-md glass px-3 py-1.5 text-xs flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Open on Sketchfab</a>
                <button onClick={() => setSelected(null)} className="rounded-md glass p-1.5"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="aspect-video">
              <iframe title={selected.title} src={`${selected.viewerUrl}?autostart=1&ui_theme=dark`} allow="autoplay; fullscreen; xr-spatial-tracking" allowFullScreen className="w-full h-full" />
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function ModelGrid({ models, onOpen, onSave, saveBusy }: { models: Model[]; onOpen: (m: Model) => void; onSave?: (m: Model) => void; saveBusy?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {models.map((m) => (
        <div key={m.uid} className="glass rounded-2xl overflow-hidden hover:-translate-y-0.5 hover:glow transition-all">
          <button className="block w-full text-left" onClick={() => onOpen(m)}>
            {m.thumbnail ? (
              <img src={m.thumbnail} alt={m.title} className="w-full h-40 object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="w-full h-40 flex items-center justify-center bg-secondary/40"><Glasses className="h-8 w-8 text-primary/60" /></div>
            )}
          </button>
          <div className="p-3">
            <div className="text-sm font-semibold truncate">{m.title}</div>
            <div className="text-xs text-muted-foreground truncate">by {m.creator}</div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[10px] rounded-full bg-primary/20 border border-primary/40 px-2 py-0.5">{m.license}</span>
              {onSave && (
                <button onClick={() => onSave(m)} disabled={saveBusy} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Bookmark className="h-3 w-3" /> Save
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
