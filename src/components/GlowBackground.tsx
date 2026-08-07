export function GlowBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary/30 blur-[120px] animate-pulse-glow animate-drift orb-parallax" />
      <div
        className="absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full bg-accent/25 blur-[140px] animate-pulse-glow animate-drift orb-parallax"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute -bottom-40 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[130px] animate-pulse-glow animate-drift orb-parallax"
        style={{ animationDelay: "4s" }}
      />
    </div>
  );
}
