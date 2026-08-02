import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardShell, PageHeader, isPaidPlan } from "@/components/DashboardShell";
import { toast } from "sonner";
import { Bookmark, ExternalLink, Glasses, X, Lock, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/vr-learning")({
  head: () => ({ meta: [
    { title: "VR Learning — EduSense" },
    { name: "description", content: "Explore interactive 3D models — atom, animal & plant cell, solar system and the human heart." },
    { property: "og:title", content: "VR Learning — EduSense" },
    { property: "og:description", content: "Interactive 3D models for immersive classroom learning." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: VRLearning,
});

type Model = {
  uid: string;
  title: string;
  creator: string;
  creatorUrl: string;
  license: string;
  blurb: string;
  viewerUrl: string;
};

/** Fixed, verified Sketchfab embeds — users choose a topic instead of searching. */
const TOPICS: Model[] = [
  {
    uid: "6a283d5b19c34e2b8fcfc6907b231aea",
    title: "Atom",
    creator: "arloopa",
    creatorUrl: "https://sketchfab.com/arloopa",
    license: "Creative Commons",
    blurb: "Nucleus, protons, neutrons & electron shells",
    viewerUrl: "https://sketchfab.com/models/6a283d5b19c34e2b8fcfc6907b231aea/embed",
  },
  {
    uid: "abaa9a651c834cdaa67072b32fb0024f",
    title: "Animal Cell",
    creator: "Forged1212",
    creatorUrl: "https://sketchfab.com/Forged1212",
    license: "Creative Commons",
    blurb: "Organelles of an animal cell",
    viewerUrl: "https://sketchfab.com/models/abaa9a651c834cdaa67072b32fb0024f/embed",
  },
  {
    uid: "6007f30d70f944c0bddd80a4626daaaa",
    title: "Plant Cell",
    creator: "arloopa",
    creatorUrl: "https://sketchfab.com/arloopa",
    license: "Creative Commons",
    blurb: "Cell wall, chloroplasts & vacuole",
    viewerUrl: "https://sketchfab.com/models/6007f30d70f944c0bddd80a4626daaaa/embed",
  },
  {
    uid: "ca0a6f6971a94fcc8d47421342dc6f40",
    title: "Solar System Model (Orrery)",
    creator: "Smoggybeard",
    creatorUrl: "https://sketchfab.com/Smoggybeard",
    license: "Creative Commons",
    blurb: "The Sun and the planets in orbit",
    viewerUrl: "https://sketchfab.com/models/ca0a6f6971a94fcc8d47421342dc6f40/embed",
  },
  {
    uid: "cc339417fcd745afafaa01623405b69a",
    title: "Labelled 3D Animated Realistic Heart",
    creator: "Anatomy by Doctor Jana",
    creatorUrl: "https://sketchfab.com/docjana",
    license: "Creative Commons",
    blurb: "Chambers, valves & blood flow — labelled",
    viewerUrl: "https://sketchfab.com/models/cc339417fcd745afafaa01623405b69a/embed",
  },
];

function VRLearning() {
  const { user, profile } = useAuth();
  const isTeacher = profile?.role === "teacher";
  const unlocked = isPaidPlan(profile?.plan);
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Model | null>(null);
  const [busy, setBusy] = useState(false);

  const saveModel = async (m: Model) => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("saved_models").insert({
      teacher_id: user.id,
      topic_name: m.title,
      sketchfab_uid: m.uid,
      title: m.title,
      license_type: m.license,
      creator_name: m.creator,
      thumbnail_url: null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved to your topics!");
    qc.invalidateQueries({ queryKey: ["saved-models"] });
  };

  if (!unlocked) {
    return (
      <DashboardShell role={isTeacher ? "teacher" : "student"} greeting="VR / 3D Learning">
        <PageHeader title="Immersive 3D learning" desc="Interactive 3D models across science topics — part of the Pro plan." />
        <div className="glass rounded-2xl p-10 text-center max-w-lg mx-auto">
          <div className="mx-auto h-14 w-14 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <Lock className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">Upgrade to unlock VR Learning</h2>
          <p className="mt-2 text-sm text-muted-foreground">Explore interactive, labelled 3D models of the atom, cells, the solar system and the human heart.</p>
          <Link to={isTeacher ? "/teacher/plans" : "/student/plans"} className="mt-6 inline-flex rounded-xl px-5 py-2.5 text-sm font-medium text-primary-foreground glow" style={{ background: "var(--gradient-primary)" }}>
            See plans
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell role={isTeacher ? "teacher" : "student"} greeting="VR / 3D Learning">
      <PageHeader title="Choose a 3D topic" desc="Pick a topic below to open its interactive 3D model — rotate, zoom and explore." />

      <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Star className="h-3.5 w-3.5 text-primary" /> Available topics
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOPICS.map((m) => (
          <div key={m.uid} className="glass rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5 hover:glow">
            <button className="block w-full text-left" onClick={() => setSelected(m)}>
              <div className="h-40 w-full flex flex-col items-center justify-center gap-2 bg-secondary/30">
                <Glasses className="h-8 w-8 text-primary" />
                <span className="text-xs text-muted-foreground">Open 3D model</span>
              </div>
            </button>
            <div className="p-3">
              <div className="text-sm font-semibold truncate">{m.title}</div>
              <div className="text-xs text-muted-foreground">{m.blurb}</div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[10px] rounded-full bg-primary/20 border border-primary/40 px-2 py-0.5 truncate">by {m.creator}</span>
                {isTeacher && (
                  <button onClick={() => saveModel(m)} disabled={busy} className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0">
                    <Bookmark className="h-3 w-3" /> Save
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="glass-strong rounded-2xl max-w-4xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <div className="font-semibold">{selected.title}</div>
                <div className="text-xs text-muted-foreground">
                  Model by{" "}
                  <a href={selected.creatorUrl} target="_blank" rel="nofollow noreferrer" className="text-primary hover:underline">{selected.creator}</a>{" "}
                  on Sketchfab · {selected.license}
                </div>
              </div>
              <div className="flex gap-2">
                <a href={`https://sketchfab.com/3d-models/${selected.uid}`} target="_blank" rel="noreferrer" className="rounded-md glass px-3 py-1.5 text-xs flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Open on Sketchfab</a>
                <button onClick={() => setSelected(null)} className="rounded-md glass p-1.5" aria-label="Close"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="aspect-video">
              <iframe
                title={selected.title}
                src={`${selected.viewerUrl}?autostart=1&ui_theme=dark`}
                allow="autoplay; fullscreen; xr-spatial-tracking"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
