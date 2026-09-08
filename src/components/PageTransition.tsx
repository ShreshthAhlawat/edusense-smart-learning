import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

/** Fades/slides route content in on every navigation, with a sweeping light bar. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <>
      <div key={`sweep-${pathname}`} className="page-sweep" aria-hidden />
      <div key={pathname} className="page-transition">
        {children}
      </div>
    </>
  );
}
