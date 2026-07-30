import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users2, Loader2, Check, Share2 } from "lucide-react";

export type ShareableType = "quiz" | "worksheet" | "sample_paper";

const LABEL: Record<ShareableType, string> = {
  quiz: "quiz",
  worksheet: "worksheet",
  sample_paper: "sample paper",
};

export function useMyTeams() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-teams", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams").select("*").eq("teacher_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

/**
 * "Share with Team" button + centered modal with a team picker and an
 * explicit confirmation step before the share row is written.
 */
export function ShareWithTeam({ contentType, contentId }: { contentType: ShareableType; contentId: string | null }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const teams = useMyTeams();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => { setPicked(null); setConfirming(false); };

  const share = async () => {
    if (!picked || !contentId || !user) return;
    setBusy(true);
    const { error } = await supabase.from("content_shares").insert({
      content_type: contentType, content_id: contentId, team_id: picked.id, shared_by: user.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Shared with ${picked.name}`);
    qc.invalidateQueries({ queryKey: ["content-shares"] });
    setOpen(false); reset();
  };

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        disabled={!contentId}
        onClick={() => { reset(); setOpen(true); }}
      >
        <Users2 className="h-4 w-4 mr-1" /> Share with Team
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-primary" />
              {confirming ? "Confirm sharing" : "Share with a team"}
            </DialogTitle>
            <DialogDescription>
              {confirming
                ? `Share this ${LABEL[contentType]} with ${picked?.name}? This will notify students in that team.`
                : "Pick which of your teams should receive this."}
            </DialogDescription>
          </DialogHeader>

          {!confirming ? (
            teams.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : teams.data && teams.data.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {teams.data.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => setPicked({ id: t.id, name: t.name })}
                    className={
                      "w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors " +
                      (picked?.id === t.id ? "border-primary bg-primary/15" : "border-border bg-secondary/40 hover:bg-secondary")
                    }
                  >
                    <span>
                      <span className="font-medium">{t.name}</span>
                      <span className="block text-xs text-muted-foreground font-mono">{t.join_code}</span>
                    </span>
                    {picked?.id === t.id && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                You don’t have any teams yet. Create one on the Teams page first.
              </p>
            )
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            {confirming ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Back</Button>
                <Button size="sm" onClick={share} disabled={busy} className="glow" style={{ background: "var(--gradient-primary)" }}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />} Yes, share it
                </Button>
              </>
            ) : (
              <Button size="sm" disabled={!picked} onClick={() => setConfirming(true)} className="glow" style={{ background: "var(--gradient-primary)" }}>
                Continue
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
