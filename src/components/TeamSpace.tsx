import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2, FileQuestion, FileText, ScrollText, MessageCircle, Send, CornerDownRight, Users2,
} from "lucide-react";

type Tab = "shared" | "chat";

export type SharedItem = {
  id: string;
  content_type: string;
  content_id: string;
  shared_at: string;
  title: string;
  subtitle: string;
  href: string;
};

const ICONS: Record<string, any> = { quiz: FileQuestion, worksheet: FileText, sample_paper: ScrollText };

export function useTeamShares(teamId: string | undefined) {
  return useQuery({
    queryKey: ["team-shares", teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<SharedItem[]> => {
      const { data: shares, error } = await supabase
        .from("content_shares")
        .select("*")
        .eq("team_id", teamId!)
        .order("shared_at", { ascending: false });
      if (error) throw error;
      const rows = shares ?? [];
      if (!rows.length) return [];

      const quizIds = rows.filter((r) => r.content_type === "quiz").map((r) => r.content_id);
      const contentIds = rows.filter((r) => r.content_type !== "quiz").map((r) => r.content_id);

      const [{ data: quizzes }, { data: contents }] = await Promise.all([
        quizIds.length
          ? supabase.from("quizzes").select("id, title, subject").in("id", quizIds)
          : Promise.resolve({ data: [] as any[] } as any),
        contentIds.length
          ? supabase.from("teacher_content").select("id, title, kind, topic").in("id", contentIds)
          : Promise.resolve({ data: [] as any[] } as any),
      ]);

      const quizById = new Map<string, any>((quizzes ?? []).map((q: any) => [q.id, q]));
      const contentById = new Map<string, any>((contents ?? []).map((c: any) => [c.id, c]));

      return rows.map((r) => {
        if (r.content_type === "quiz") {
          const q = quizById.get(r.content_id);
          return {
            id: r.id, content_type: r.content_type, content_id: r.content_id, shared_at: r.shared_at,
            title: q?.title ?? "Quiz", subtitle: q?.subject ?? "Quiz", href: `/quiz/${r.content_id}`,
          };
        }
        const c = contentById.get(r.content_id);
        return {
          id: r.id, content_type: r.content_type, content_id: r.content_id, shared_at: r.shared_at,
          title: c?.title ?? (r.content_type === "sample_paper" ? "Sample paper" : "Worksheet"),
          subtitle: c?.topic ?? c?.kind ?? r.content_type.replace("_", " "),
          href: `/content/${r.content_id}`,
        };
      });
    },
  });
}

/** Shared content + community doubt board for a single team. */
export function TeamSpace({ teamId, teamName }: { teamId: string; teamName: string }) {
  const [tab, setTab] = useState<Tab>("shared");
  const shares = useTeamShares(teamId);

  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
          <Users2 className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <div className="font-semibold">{teamName}</div>
          <div className="text-xs text-muted-foreground">Everything your class shares lives here.</div>
        </div>
      </div>

      <div className="flex gap-2">
        {(["shared", "chat"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "rounded-xl px-4 py-2 text-sm transition-colors border " +
              (tab === t ? "border-primary bg-primary/15 text-foreground" : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary")
            }
          >
            {t === "shared" ? "Shared with team" : "Doubts & discussion"}
          </button>
        ))}
      </div>

      {tab === "shared" ? (
        shares.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : shares.data && shares.data.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {shares.data.map((s) => {
              const Icon = ICONS[s.content_type] ?? FileText;
              return (
                <Link key={s.id} to={s.href} className="glass rounded-2xl p-4 flex items-start gap-3 transition-all hover:-translate-y-0.5 hover:glow">
                  <div className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center bg-primary/15 border border-primary/30">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{s.title}</div>
                    <div className="text-xs text-muted-foreground truncate capitalize">
                      {s.content_type.replace("_", " ")} · {s.subtitle}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Shared {new Date(s.shared_at).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">
            Nothing has been shared with this team yet.
          </div>
        )
      ) : (
        <TeamChat teamId={teamId} />
      )}
    </div>
  );
}

/** Community doubt board: any member can post a doubt, anyone can reply. */
export function TeamChat({ teamId }: { teamId: string }) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);

  const messages = useQuery({
    queryKey: ["team-messages", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_messages")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  const post = async (text: string, parent: string | null) => {
    if (!user || !text.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("team_messages").insert({
      team_id: teamId,
      user_id: user.id,
      author_name: profile?.username ?? profile?.email ?? "Member",
      parent_id: parent,
      body: text.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setBody(""); setReplyBody(""); setReplyTo(null);
    qc.invalidateQueries({ queryKey: ["team-messages", teamId] });
  };

  const all = messages.data ?? [];
  const roots = all.filter((m: any) => !m.parent_id);
  const repliesOf = (id: string) => all.filter((m: any) => m.parent_id === id);

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => { e.preventDefault(); post(body, null); }}
        className="glass rounded-2xl p-4 flex flex-col sm:flex-row gap-2"
      >
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ask a doubt to your team…" />
        <Button type="submit" disabled={busy || !body.trim()} className="glow" style={{ background: "var(--gradient-primary)" }}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />} Post
        </Button>
      </form>

      {messages.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : roots.length ? (
        <div className="space-y-3">
          {roots.map((m: any) => (
            <div key={m.id} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MessageCircle className="h-4 w-4 text-primary" /> {m.author_name}
                <span className="text-[11px] font-normal text-muted-foreground">
                  {new Date(m.created_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{m.body}</p>

              <div className="mt-3 space-y-2">
                {repliesOf(m.id).map((r: any) => (
                  <div key={r.id} className="flex gap-2 rounded-xl bg-secondary/40 border border-border p-3">
                    <CornerDownRight className="h-4 w-4 shrink-0 text-primary/70 mt-0.5" />
                    <div>
                      <div className="text-xs font-medium">{r.author_name}</div>
                      <p className="text-sm whitespace-pre-wrap">{r.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              {replyTo === m.id ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); post(replyBody, m.id); }}
                  className="mt-3 flex gap-2"
                >
                  <Input value={replyBody} autoFocus onChange={(e) => setReplyBody(e.target.value)} placeholder="Write a reply…" />
                  <Button type="submit" size="sm" disabled={busy || !replyBody.trim()}>Reply</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setReplyTo(null); setReplyBody(""); }}>Cancel</Button>
                </form>
              ) : (
                <button onClick={() => setReplyTo(m.id)} className="mt-3 text-xs text-primary hover:underline">
                  Reply
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">
          No doubts yet — be the first to ask your team a question.
        </div>
      )}
    </div>
  );
}
