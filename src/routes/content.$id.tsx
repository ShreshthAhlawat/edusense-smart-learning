import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GlowBackground } from "@/components/GlowBackground";
import { Logo } from "@/components/Logo";
import ReactMarkdown from "react-markdown";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/content/$id")({
  head: () => ({ meta: [
    { title: "Shared content — EduSense" },
    { name: "description", content: "AI-generated classroom content shared by a teacher." },
    { property: "og:title", content: "Shared content — EduSense" },
    { property: "og:description", content: "AI-generated classroom content shared by a teacher." },
  ] }),
  component: ContentView,
});

function ContentView() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["shared-content", id],
    queryFn: async () => (await supabase.from("teacher_content").select("*").eq("id", id).maybeSingle()).data,
  });

  return (
    <div className="relative min-h-screen">
      <GlowBackground />
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-background/40 border-b border-border h-16 flex items-center justify-between px-4 md:px-8 no-print">
        <Link to="/"><Logo className="h-8 w-auto" /></Link>
        <Button size="sm" variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
      </header>
      <main className="max-w-3xl mx-auto px-4 md:px-8 py-10">
        {q.isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !q.data ? (
          <div className="text-center py-20 text-muted-foreground">Content not found or has been removed.</div>
        ) : (
          <div className="glass rounded-2xl p-8 print-area">
            <div className="text-xs uppercase tracking-wider text-primary mb-2">{q.data.kind}</div>
            <h1 className="text-3xl font-bold mb-6">{q.data.title}</h1>
            <article className="prose prose-invert max-w-none prose-headings:text-foreground prose-strong:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90">
              <ReactMarkdown>{q.data.content_markdown}</ReactMarkdown>
            </article>
          </div>
        )}
      </main>
    </div>
  );
}
