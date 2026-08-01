import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { useAuth, isOwner, type Profile } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import {
  LayoutDashboard, FileQuestion, Sparkles, BarChart3, CreditCard,
  UserCircle, Settings, LogOut, TrendingUp, BookOpen, ListChecks,
  MessageSquare, FileText, BookMarked, Rocket, Compass, Glasses,
  Lock, Sun, Moon, Globe, Zap, ScrollText, Wand2, Users2, Telescope, ShieldCheck,
} from "lucide-react";

type NavItem = { to: string; label: string; icon: any; locked?: boolean };
type NavGroup = { label?: string; items: NavItem[] };

// Every teacher tool requires an active paid Teacher plan.
const teacherGroups: NavGroup[] = [
  { items: [
    { to: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ]},
  { label: "Teacher Tools", items: [
    { to: "/teacher/quizzes", label: "Quiz Generator", icon: FileQuestion, locked: true },
    { to: "/teacher/sample-paper", label: "Sample Paper", icon: ScrollText, locked: true },
    { to: "/teacher/content", label: "Content Generators", icon: Sparkles, locked: true },
    { to: "/teacher/chatbot", label: "AI Assistant", icon: MessageSquare, locked: true },
    { to: "/teacher/topic-explorer", label: "Topic Explorer", icon: Telescope, locked: true },
    { to: "/teacher/teams", label: "My Teams", icon: Users2, locked: true },
    { to: "/teacher/analytics", label: "Engagement Analytics", icon: BarChart3, locked: true },
    { to: "/teacher/advanced", label: "Advanced Analytics", icon: TrendingUp },
  ]},
  { label: "Account", items: [
    { to: "/teacher/plans", label: "Plans & Pricing", icon: CreditCard },
    { to: "/teacher/my-plan", label: "My Active Plan", icon: UserCircle },
    { to: "/teacher/settings", label: "Settings", icon: Settings },
  ]},
];

const studentGroups: NavGroup[] = [
  { label: "Free Features", items: [
    { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/student/quiz-practice", label: "Quiz Practice", icon: BookOpen },
    { to: "/student/quiz-generator", label: "Quiz Generator", icon: Wand2 },
    { to: "/student/sample-paper", label: "Sample Paper", icon: ScrollText },
    { to: "/student/homework", label: "Homework", icon: ListChecks },
    { to: "/student/teams", label: "My Teams", icon: Users2 },
  ]},
  { label: "Paid Features", items: [
    { to: "/student/tool/chatbot", label: "Chatbot", icon: MessageSquare, locked: true },
    { to: "/student/tool/pdf-summarizer", label: "PDF Summarizer", icon: FileText, locked: true },
    { to: "/student/tool/story-generator", label: "Story Generator", icon: BookMarked, locked: true },
    { to: "/student/tool/confidence-booster", label: "Confidence Booster", icon: Rocket, locked: true },
    { to: "/student/tool/topic-explainer", label: "Topic Explainer", icon: Compass, locked: true },
    { to: "/student/topic-explorer", label: "Topic Explorer", icon: Telescope, locked: true },
    { to: "/vr-learning", label: "VR Learning", icon: Glasses, locked: true },
  ]},
  { label: "Account", items: [
    { to: "/student/plans", label: "Plans & Pricing", icon: CreditCard },
    { to: "/student/my-plan", label: "My Active Plan", icon: UserCircle },
    { to: "/student/settings", label: "Settings", icon: Settings },
  ]},
];


export function isPaidPlan(plan: Profile["plan"] | undefined | null) {
  return plan === "pro" || plan === "school-pro";
}

export function DashboardShell({
  role, greeting, children,
}: { role: "teacher" | "student"; greeting?: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { user, profile, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const isPro = isPaidPlan(profile?.plan);
  const baseGroups = role === "teacher" ? teacherGroups : studentGroups;
  const groups: NavGroup[] = isOwner(user)
    ? [...baseGroups, { label: "Internal", items: [{ to: "/owner-dashboard", label: "Owner Dashboard", icon: ShieldCheck }] }]
    : baseGroups;


  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col glass-strong border-r border-sidebar-border">
        <div className="px-4 py-4 border-b border-sidebar-border">
          <Link to="/" className="block">
            <Logo className="w-full h-auto" />
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {groups.map((g, gi) => (
            <div key={gi}>
              {g.label && (
                <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
                  {g.label}
                </div>
              )}
              <div className="space-y-0.5">
                {g.items.map((item) => {
                  const active = pathname === item.to;
                  const showLock = item.locked && !isPro;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors " +
                        (active
                          ? "bg-primary/20 text-foreground font-medium"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground")
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {showLock && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          <button
            onClick={() => { signOut().then(() => navigate({ to: "/" })); }}
            className="mt-4 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/40 border-b border-border h-16 flex items-center justify-between px-4 md:px-8">
          <div>
            <div className="text-sm text-muted-foreground">Hi{profile?.username ? `, ${profile.username}` : ""} 👋</div>
            <div className="text-lg font-semibold">{greeting ?? "Welcome back"}</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="hidden md:flex items-center gap-1.5 rounded-lg glass px-3 py-1.5 text-sm">
              <Globe className="h-4 w-4" /> English
            </button>
            <button onClick={toggle} className="rounded-lg glass p-2" aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="ml-2 flex items-center gap-2 rounded-lg glass px-3 py-1.5">
              <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                {(profile?.username ?? profile?.email ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="text-xs font-medium">{profile?.username ?? "You"}</div>
                <div className="text-[10px] text-muted-foreground capitalize flex items-center gap-1">
                  {isPro && <Zap className="h-3 w-3 text-primary" />}
                  {profile?.plan}
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export function StatCard({
  icon: Icon, label, value, hint,
}: { icon: any; label: string; value: string | number; hint?: string }) {
  return (
    <div className="glass rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:glow">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
          <Icon className="h-4 w-4 text-primary-foreground" />
        </div>
      </div>
      <div className="mt-3 text-3xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function PageHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
      {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
    </div>
  );
}

export function useRequirePlan(profile: Profile | null, required: "pro" = "pro") {
  return { unlocked: isPaidPlan(profile?.plan), required };
}

/** Standard "upgrade to access" screen shown in place of a paid feature. */
export function PaidGate({ role, feature }: { role: "teacher" | "student"; feature: string }) {
  return (
    <div className="max-w-lg mx-auto glass rounded-2xl p-10 text-center animate-in fade-in zoom-in-95 duration-300">
      <div className="mx-auto h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
        <Lock className="h-6 w-6 text-primary-foreground" />
      </div>
      <h2 className="mt-5 text-xl font-semibold">{feature} is a paid feature</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Upgrade your plan to unlock {feature.toLowerCase()} and every other {role === "teacher" ? "teacher" : "premium"} tool in EduSense.
      </p>
      <Link
        to={role === "teacher" ? "/teacher/plans" : "/student/plans"}
        className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-primary-foreground glow transition-transform hover:-translate-y-0.5"
        style={{ background: "var(--gradient-primary)" }}
      >
        <CreditCard className="h-4 w-4" /> View plans
      </Link>
    </div>
  );
}

