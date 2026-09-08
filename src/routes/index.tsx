import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode, type CSSProperties, type MouseEvent } from "react";
import { CountUp } from "@/components/CountUp";
import { GlowBackground } from "@/components/GlowBackground";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Brain, ShieldCheck, BarChart3, Users, BookOpen,
  MessageCircle, X, ArrowRight, Sun, Moon, UsersRound,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EduSense" },
      { name: "description", content: "Create quizzes, spot struggling topics, and give students personalized practice with EduSense — the premium AI-assisted classroom platform." },
      { property: "og:title", content: "EduSense" },
      { property: "og:description", content: "Create quizzes, spot struggling topics, and give students personalized practice with EduSense — the premium AI-assisted classroom platform." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Brain, title: "AI Quiz Generator", desc: "Teachers create rich MCQ quizzes in seconds — any topic, class, difficulty, or language." },
  { icon: BarChart3, title: "Struggling-topic Insights", desc: "Automatic per-subtopic analysis reveals exactly where students need help." },
  { icon: BookOpen, title: "Adaptive Practice", desc: "Students practice with tailored quizzes and see visual weak-area breakdowns." },
  { icon: ShieldCheck, title: "Privacy-first", desc: "Student data stays in your workspace. No third-party training. Ever." },
  { icon: Users, title: "For Teachers & Students", desc: "Two beautiful dashboards, one cohesive experience." },
  { icon: Sparkles, title: "Premium AI Tools", desc: "PDF summarizer, story generator, confidence booster, AR learning & more." },
];

const MARQUEE_ITEMS = [
  "AI Quiz Generator",
  "Struggling-topic Insights",
  "Adaptive Practice",
  "Privacy-first Classroom",
  "Team Collaboration",
  "Lesson Planning Assistant",
  "PDF Summarizer",
  "Story Generator",
  "Confidence Booster",
  "AR Learning",
  "Engagement Analytics",
  "Sample Paper Generator",
];

function Landing() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const authedHref = () => {
    if (!user) return "/auth";
    if (!profile?.role) return "/select-role";
    return profile.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <GlowBackground />
      <FloatingOrbs />

      {/* NAV */}
      <nav className="sticky top-0 z-30 backdrop-blur-xl bg-background/40 border-b border-border">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="glass rounded-lg p-1.5">
              <Logo className="h-6 w-auto" />
            </div>
            <span className="font-bold text-lg tracking-tight">EduSense</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/team" className="hidden sm:inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <UsersRound className="h-4 w-4" /> Meet the team
            </Link>
            <ThemeToggle />
            {user ? (
              <Button onClick={() => navigate({ to: authedHref() })} className="glow" style={{ background: "var(--gradient-primary)" }}>
                Go to dashboard
              </Button>
            ) : (
              <>
                <Link to="/auth" className="link-underline text-sm text-muted-foreground hover:text-foreground">Log in</Link>
                <Link to="/auth" search={{ mode: "signup" } as never} className="rounded-md px-4 py-2 text-sm font-medium text-primary-foreground glow"
                  style={{ background: "var(--gradient-primary)" }}>
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative mx-auto max-w-6xl px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium mb-6 animate-fade-in-up">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>AI-assisted, privacy-first classrooms</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          Teach smarter. <br />
          <span className="gradient-text">Learn deeper.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          EduSense pairs teachers with intelligent insights and gives students personalized
          practice — wrapped in a beautiful, private, distraction-free experience.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <Link
            to={user ? authedHref() : "/auth"}
            search={user ? undefined : ({ mode: "signup" } as never)}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-primary-foreground glow hover:scale-105 transition-transform"
            style={{ background: "var(--gradient-primary)" }}
          >
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/auth" className="inline-flex items-center gap-2 rounded-xl border border-border glass px-6 py-3 font-medium hover:bg-secondary transition-colors">
            Log in
          </Link>
        </div>

        {/* 3D floating decorative elements */}
        <div className="pointer-events-none absolute left-[5%] top-1/4 hidden md:block" style={{ perspective: "800px" }}>
          <div className="hero-orb orb-3d w-24 h-24 rounded-2xl" style={{ background: "var(--gradient-primary)", opacity: 0.15 }} />
        </div>
        <div className="pointer-events-none absolute right-[8%] top-1/3 hidden md:block" style={{ perspective: "800px" }}>
          <div className="hero-orb orb-3d w-16 h-16 rounded-full" style={{ background: "var(--accent)", opacity: 0.2 }} />
        </div>
        <div className="pointer-events-none absolute left-[12%] bottom-[10%] hidden md:block" style={{ perspective: "800px" }}>
          <div className="hero-orb orb-3d w-20 h-20 rounded-xl" style={{ background: "linear-gradient(135deg, oklch(0.6 0.2 250), oklch(0.55 0.24 285))", opacity: 0.12 }} />
        </div>
        <div className="pointer-events-none absolute right-[15%] bottom-[15%] hidden md:block" style={{ perspective: "800px" }}>
          <div className="hero-orb orb-3d w-28 h-28 rounded-3xl" style={{ background: "linear-gradient(135deg, oklch(0.5 0.22 300), oklch(0.6 0.2 245))", opacity: 0.1 }} />
        </div>
      </section>

      {/* Glassmorphism infinite text carousel */}
      <section className="relative py-6 overflow-hidden">
        <div className="carousel-row left">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((t, i) => (
            <span key={`l-${i}`} className="carousel-item glass">{t}</span>
          ))}
        </div>
        <div className="carousel-row right mt-3">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((t, i) => (
            <span key={`r-${i}`} className="carousel-item glass-strong">{t}</span>
          ))}
        </div>
      </section>

      {/* INTERACTIVE STATS */}
      <StatsStrip />

      {/* ROLE SWITCHER */}
      <RoleSwitcher authedHref={authedHref()} />

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-6 pb-24 pt-10">
        <div className="stagger grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <TiltCard key={f.title} to={authedHref()} delay={0.05 * i}>
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "var(--gradient-primary)" }}>
                <f.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              <div className="mt-4 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Explore →
              </div>
            </TiltCard>
          ))}
        </div>
      </section>


      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="glass-strong rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-40" style={{ background: "var(--gradient-hero)" }} />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold">Ready to transform your classroom?</h2>
            <p className="mt-3 text-muted-foreground">Free for everyone during our testing phase — every tool unlocked.</p>
            <Link
              to={user ? authedHref() : "/auth"}
              search={user ? undefined : ({ mode: "signup" } as never)}
              className="mt-6 inline-flex rounded-xl px-8 py-3 font-medium text-primary-foreground glow hover:scale-105 transition-transform"
              style={{ background: "var(--gradient-primary)" }}
            >
              Start now
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} EduSense · Built with care for classrooms</span>
          <Link to="/team" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
            <UsersRound className="h-4 w-4" /> Meet the team
          </Link>
        </div>
      </footer>

      <FaqChatbot />
    </div>
  );
}

/* --------------------------- Theme Toggle --------------------------- */
function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary/40 text-foreground transition-colors hover:bg-secondary"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

/* --------------------------- 3D Floating Orbs --------------------------- */
function FloatingOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden hidden lg:block" aria-hidden>
      <div className="absolute top-[18%] left-[12%] w-40 h-40 rounded-full bg-primary/10 blur-[60px] animate-float-3d" style={{ animationDelay: "0s" }} />
      <div className="absolute top-[45%] right-[10%] w-56 h-56 rounded-full bg-accent/10 blur-[80px] animate-float-3d" style={{ animationDelay: "2.5s" }} />
      <div className="absolute bottom-[20%] left-[22%] w-48 h-48 rounded-full bg-primary/10 blur-[70px] animate-float-3d" style={{ animationDelay: "5s" }} />
    </div>
  );
}

/* --------------------------- FAQ Chatbot --------------------------- */
const FAQ: { q: string; a: string }[] = [
  { q: "What is EduSense?", a: "EduSense is a privacy-first, AI-assisted classroom platform where teachers create quizzes and get insights, while students practice with adaptive tools." },
  { q: "Is my data private?", a: "Yes. Your data stays in your workspace and is never used to train third-party models." },
  { q: "How much does it cost?", a: "EduSense is completely free during our testing phase — every tool is unlocked for teachers and students." },
  { q: "Is this for teachers or students?", a: "Both! Teachers and students each get a tailored dashboard designed for their workflow." },
];

function FaqChatbot() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | "none" | null>(null);

  useEffect(() => { if (!open) setSelected(null); }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open help"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground shadow-2xl glow transition-transform hover:scale-110"
        style={{ background: "var(--gradient-primary)" }}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[340px] max-w-[90vw] glass-strong rounded-2xl p-4 animate-fade-in-up">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold">EduSense Assistant</div>
              <div className="text-xs text-muted-foreground">Quick answers</div>
            </div>
          </div>

          {selected === null && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground mb-2">Pick a question:</div>
              {FAQ.map((f, i) => (
                <button key={i} onClick={() => setSelected(i)}
                  className="w-full text-left text-sm rounded-lg border border-border bg-secondary/40 hover:bg-secondary transition-colors px-3 py-2">
                  {f.q}
                </button>
              ))}
              <button onClick={() => setSelected("none")}
                className="w-full text-left text-sm rounded-lg border border-border bg-secondary/40 hover:bg-secondary transition-colors px-3 py-2">
                None of these
              </button>
            </div>
          )}
          {typeof selected === "number" && (
            <div className="space-y-3">
              <div className="rounded-lg bg-primary/15 border border-primary/30 px-3 py-2 text-sm font-medium">{FAQ[selected].q}</div>
              <div className="rounded-lg bg-secondary/40 border border-border px-3 py-2 text-sm">{FAQ[selected].a}</div>
              <button onClick={() => setSelected(null)} className="text-xs text-primary hover:underline">← Back to questions</button>
            </div>
          )}
          {selected === "none" && (
            <div className="space-y-3">
              <div className="rounded-lg bg-secondary/40 border border-border px-3 py-3 text-sm">
                For anything else, contact us at{" "}
                <a href="mailto:shreshthahlawat2012@gmail.com" className="text-primary underline">
                  shreshthahlawat2012@gmail.com
                </a>
              </div>
              <button onClick={() => setSelected(null)} className="text-xs text-primary hover:underline">← Back</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* --------------------------- Interactive tilt card --------------------------- */
function TiltCard({ to, delay, children }: { to: string; delay: number; children: ReactNode }) {
  const [style, setStyle] = useState<CSSProperties>({ animationDelay: `${delay}s` });

  const onMove = (e: MouseEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    setStyle({
      animationDelay: `${delay}s`,
      ["--tx" as string]: (x - 0.5) * 2,
      ["--ty" as string]: (y - 0.5) * 2,
      ["--mx" as string]: `${x * 100}%`,
      ["--my" as string]: `${y * 100}%`,
    });
  };

  return (
    <Link
      to={to}
      onMouseMove={onMove}
      onMouseLeave={() => setStyle({ animationDelay: `${delay}s` })}
      className="group tilt-card relative overflow-hidden glass rounded-2xl p-6 animate-fade-in-up"
      style={style}
    >
      <span className="tilt-shine" aria-hidden />
      <div className="relative">{children}</div>
    </Link>
  );
}

/* --------------------------- Interactive stats --------------------------- */
const STATS = [
  { label: "Quiz questions generated", value: 12500, suffix: "+" },
  { label: "Average setup time", value: 30, suffix: "s" },
  { label: "Tools unlocked", value: 12, suffix: "" },
  { label: "Data shared with 3rd parties", value: 0, suffix: "%" },
];

function StatsStrip() {
  const [active, setActive] = useState<number | null>(null);
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {STATS.map((s, i) => (
          <button
            key={s.label}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onBlur={() => setActive(null)}
            className={`glass rounded-2xl p-5 text-left transition-all hover:-translate-y-1 hover:glow ${active === i ? "border-primary/40" : ""}`}
          >
            <div className="text-3xl font-bold gradient-text">
              {active === i ? <CountUp value={`${s.value}${s.suffix}`} /> : `${s.value}${s.suffix}`}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">Hover a card to replay the numbers</p>
    </section>
  );
}

/* --------------------------- Role switcher --------------------------- */
const ROLE_CONTENT = {
  teacher: {
    icon: Users,
    points: [
      "Generate a full MCQ or written quiz in under a minute",
      "See exactly which subtopics your class keeps missing",
      "Share worksheets and quizzes straight to your team",
      "Track weekly engagement with live analytics",
    ],
  },
  student: {
    icon: BookOpen,
    points: [
      "Practice with quizzes tailored to your weak areas",
      "Get instant feedback and clear explanations",
      "Summarize PDFs, explore topics, boost confidence",
      "Keep homework and notes in one calm place",
    ],
  },
} as const;

function RoleSwitcher({ authedHref }: { authedHref: string }) {
  const [role, setRole] = useState<"teacher" | "student">("teacher");
  const data = ROLE_CONTENT[role];
  return (
    <section className="mx-auto max-w-4xl px-6 py-8">
      <div className="glass-strong rounded-3xl p-8">
        <div className="mx-auto mb-6 inline-flex w-full max-w-xs items-center rounded-full border border-border bg-secondary/40 p-1">
          {(["teacher", "student"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium capitalize transition-all ${
                role === r ? "text-primary-foreground glow" : "text-muted-foreground hover:text-foreground"
              }`}
              style={role === r ? { background: "var(--gradient-primary)" } : undefined}
            >
              I'm a {r}
            </button>
          ))}
        </div>
        <div key={role} className="animate-fade-in-up">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "var(--gradient-primary)" }}>
            <data.icon className="h-5 w-5 text-primary-foreground" />
          </div>
          <ul className="space-y-3">
            {data.points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <Link
            to={authedHref}
            className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-primary-foreground glow hover:scale-105 transition-transform"
            style={{ background: "var(--gradient-primary)" }}
          >
            Start as a {role} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
