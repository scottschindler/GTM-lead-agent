"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import type { Lead } from "../../agent/lib/types";
import { countNeedsReview, withDemoLeads } from "../lib/review-queue";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/configure", label: "Configure" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type AppHeaderProps = {
  subtitle?: string;
  dashboardNotificationCount?: number | null;
};

function formatNotificationCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

export function AppHeader({
  subtitle,
  dashboardNotificationCount,
}: AppHeaderProps) {
  const pathname = usePathname();
  const [loadedDashboardCount, setLoadedDashboardCount] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (dashboardNotificationCount !== undefined) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/leads", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { leads: Lead[] };
        if (!cancelled) {
          setLoadedDashboardCount(countNeedsReview(withDemoLeads(data.leads)));
        }
      } catch {
        if (!cancelled) setLoadedDashboardCount(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dashboardNotificationCount]);

  const dashboardCount =
    dashboardNotificationCount === undefined
      ? loadedDashboardCount
      : dashboardNotificationCount;

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--geist-border)] bg-[var(--geist-background)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
        <div>
          <div className="text-sm font-medium">GTM Lead Factory</div>
          {subtitle ? (
            <div className="text-xs text-[var(--geist-muted)]">{subtitle}</div>
          ) : null}
        </div>
        <nav aria-label="Main" className="geist-nav">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="geist-nav-link"
              >
                <span>{item.label}</span>
                {item.href === "/" &&
                dashboardCount !== null &&
                dashboardCount > 0 ? (
                  <>
                    <span className="sr-only">
                      {dashboardCount} needs review
                    </span>
                    <span className="geist-nav-badge" aria-hidden="true">
                      {formatNotificationCount(dashboardCount)}
                    </span>
                  </>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
