import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Global scroll-reveal engine.
 * Observes cards/sections and toggles `.is-revealed` as they enter the
 * viewport, driving the CSS move+expand animations in styles.css.
 * Re-scans on every route change and on DOM mutations.
 */
const SELECTOR =
  "[data-reveal], section, main .glass, main .glass-strong, main .recharts-responsive-container";

export function ScrollReveal() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    const scan = () => {
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el, i) => {
        if (el.dataset["revealBound"]) return;
        // Never animate viewport-anchored chrome (nav, chat bubble, drawers)
        const pos = getComputedStyle(el).position;
        if (pos === "fixed" || pos === "sticky") return;
        if (el.closest("nav, header, [data-no-reveal]")) return;
        el.dataset["revealBound"] = "1";
        el.classList.add("reveal");
        el.style.setProperty("--reveal-delay", `${Math.min(i % 8, 7) * 55}ms`);
        // Already on screen at mount → reveal immediately (no flash of hidden content)
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
          el.classList.add("is-revealed");
          return;
        }
        observer.observe(el);
      });
    };

    scan();
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });
    const t = window.setTimeout(scan, 300);

    return () => {
      observer.disconnect();
      mo.disconnect();
      window.clearTimeout(t);
    };
  }, [pathname]);

  return null;
}
