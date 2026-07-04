"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Inbox" },
  { href: "/factory", label: "Factory" },
  { href: "/agents", label: "Architecture" },
  { href: "/configure", label: "Configure" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type AppHeaderProps = {
  subtitle?: string;
};

export function AppHeader({ subtitle }: AppHeaderProps) {
  const pathname = usePathname();

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
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
