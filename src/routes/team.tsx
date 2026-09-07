import { createFileRoute, Link } from "@tanstack/react-router";
import { GlowBackground } from "@/components/GlowBackground";
import { Logo } from "@/components/Logo";
import { Mail, ArrowLeft, Sparkles, Code2, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "The Team Behind EduSense" },
      { name: "description", content: "Meet Shreshth Ahlawat, the founder and builder of EduSense — the privacy-first AI classroom platform for teachers and students." },
      { property: "og:title", content: "The Team Behind EduSense" },
      { property: "og:description", content: "Meet Shreshth Ahlawat, founder and builder of EduSense." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  return (
    <div className="relative min-h-screen">
      <GlowBackground />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="h-9 w-auto" />
        </Link>
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24">
        <section className="text-center py-12" data-reveal>
          <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> The people behind the product
          </span>
          <h1 className="mt-5 text-4xl sm:text-5xl font-bold gradient-text">Meet the team</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            EduSense is built by a small team obsessed with making classrooms smarter without
            compromising student privacy.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-[1.1fr_1fr]" data-reveal>
          <div className="glass rounded-2xl p-8 transition-all hover:-translate-y-1 hover:glow">
            <div
              className="h-20 w-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              SA
            </div>
            <h2 className="mt-5 text-2xl font-semibold">Shreshth Ahlawat</h2>
            <p className="text-sm text-primary">Founder &amp; Lead Developer</p>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Shreshth designs and builds every part of EduSense — from the AI quiz engine and
              classroom engagement analytics to the privacy-first architecture that keeps all
              camera processing inside the browser. He started EduSense to give teachers real
              insight into how their class is doing, and students a patient tutor available any
              hour of the day.
            </p>
            <a
              href="mailto:shreshthahlawat2012@gmail.com"
              className="mt-6 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-primary-foreground glow"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Mail className="h-4 w-4" /> Get in touch
            </a>
          </div>

          <div className="space-y-4">
            {[
              { icon: Code2, title: "Built end to end", text: "Product, design, AI pipelines and the database — all crafted in-house." },
              { icon: GraduationCap, title: "Classroom-first", text: "Every feature starts from a real teacher or student problem, not a demo." },
              { icon: Sparkles, title: "Privacy by default", text: "Engagement analysis runs on-device; no video ever leaves the classroom." },
            ].map((c) => (
              <div key={c.title} className="glass rounded-2xl p-6 transition-all hover:-translate-y-1 hover:glow">
                <c.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-semibold">{c.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="glass rounded-2xl p-10 mt-8 text-center" data-reveal>
          <h2 className="text-xl font-semibold">Want to work with us?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We love hearing from teachers, schools and builders.
          </p>
          <a href="mailto:shreshthahlawat2012@gmail.com" className="mt-4 inline-block text-sm text-primary hover:underline">
            shreshthahlawat2012@gmail.com
          </a>
        </section>
      </main>
    </div>
  );
}
