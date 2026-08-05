import { useEffect, useRef, useState } from "react";

/**
 * Lightweight count-up for numeric statistics.
 * Non-numeric values (e.g. "—", "Pro") render unchanged.
 * Respects prefers-reduced-motion.
 */
export function CountUp({
  value,
  duration = 900,
  className,
}: {
  value: string | number;
  duration?: number;
  className?: string;
}) {
  const numeric = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
  const isNumeric = typeof value === "number" || (String(value).trim() !== "" && !Number.isNaN(numeric) && /\d/.test(String(value)));
  const suffix = typeof value === "string" && isNumeric ? String(value).replace(/^[\s\d.,-]+/, "") : "";
  const decimals = isNumeric && String(numeric).includes(".") ? 1 : 0;

  const [display, setDisplay] = useState(isNumeric ? 0 : null);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (!isNumeric) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setDisplay(numeric); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(numeric * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [numeric, isNumeric, duration]);

  if (!isNumeric || display === null) return <span className={className}>{value}</span>;
  return (
    <span className={className}>
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}
