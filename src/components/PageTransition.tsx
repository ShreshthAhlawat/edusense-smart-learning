import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

/** Fades/slides route content in on every navigation. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}
