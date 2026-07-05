import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { getLandingPage } from "../../../../agent/lib/store";
import {
  WORKSPACE_COOKIE,
  inCookieWorkspace,
} from "../../../../agent/lib/workspace";
import type { LandingPage } from "../../../../agent/lib/types";
import { CompanyLogo } from "./company-logo";

export const dynamic = "force-dynamic";

// Landing pages are stored in the workspace of the visitor whose pipeline
// run created them, so resolve reads through the viewer's workspace cookie.
async function getWorkspaceLandingPage(
  slug: string,
): Promise<LandingPage | null> {
  const cookieStore = await cookies();
  return inCookieWorkspace(cookieStore.get(WORKSPACE_COOKIE)?.value, () =>
    getLandingPage(slug),
  );
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getWorkspaceLandingPage(slug);
  if (!page) {
    return { title: "Vercel" };
  }
  return {
    title: `Vercel × ${page.company}`,
    description: page.subheadline,
    robots: { index: false, follow: false },
  };
}

function VercelMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 76 65"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M37.59.25l36.95 64H.64l36.95-64z" />
    </svg>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--brand)]">
      {children}
    </div>
  );
}

export default async function ProspectLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getWorkspaceLandingPage(slug);
  if (!page) {
    notFound();
  }

  return <LandingPageView page={page} />;
}

function LandingPageView({ page }: { page: LandingPage }) {
  const first = firstName(page.recipientName);
  const ctaHref = page.ctaUrl ?? "https://vercel.com/contact/sales";
  const createdAt = new Date(page.createdAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className="min-h-screen bg-[var(--geist-hero-background)] text-[var(--geist-hero-foreground)]"
      style={{ "--brand": page.brandColor ?? "var(--geist-success)" } as React.CSSProperties}
    >
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[var(--geist-hero-border)] bg-[color-mix(in_srgb,var(--geist-hero-background)_85%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <VercelMark className="h-4.5 w-5" />
            <span className="text-sm font-semibold tracking-tight">Vercel</span>
            <span className="text-[var(--geist-hero-muted)]">×</span>
            <span className="flex items-center gap-2">
              <CompanyLogo domain={page.companyDomain} company={page.company} size={22} />
              <span className="text-sm font-semibold tracking-tight">
                {page.company}
              </span>
            </span>
          </div>
          <a
            href={ctaHref}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-[8px] bg-[var(--geist-hero-foreground)] px-3.5 py-1.5 text-sm font-medium text-[var(--geist-hero-background)] transition-opacity hover:opacity-85 sm:inline-flex"
          >
            {page.ctaLabel}
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-180px] h-[420px] w-[720px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in srgb, var(--brand) 55%, transparent), transparent)",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-6 pb-16 pt-20 text-center sm:pt-24">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--geist-hero-border)] bg-[var(--geist-hero-surface)] px-4 py-1.5 text-xs font-medium text-[var(--geist-hero-muted)]">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]"
              aria-hidden
            />
            Prepared exclusively for {page.company}
          </div>

          <div className="mb-8 flex items-center justify-center gap-5">
            <span className="flex h-14 w-14 items-center justify-center rounded-[12px] border border-[var(--geist-hero-border)] bg-[var(--geist-hero-surface)]">
              <VercelMark className="h-6 w-7" />
            </span>
            <span className="text-xl text-[var(--geist-hero-muted)]">×</span>
            <span className="flex h-14 w-14 items-center justify-center rounded-[12px] border border-[var(--geist-hero-border)] bg-[var(--geist-hero-surface)]">
              <CompanyLogo domain={page.companyDomain} company={page.company} size={34} />
            </span>
          </div>

          <h1
            className="mx-auto max-w-3xl bg-clip-text text-5xl font-semibold leading-[1.1] tracking-tight text-transparent sm:text-6xl"
            style={{
              backgroundImage:
                "linear-gradient(180deg, var(--geist-hero-foreground) 55%, color-mix(in srgb, var(--geist-hero-foreground) 55%, transparent))",
            }}
          >
            {page.headline}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--geist-hero-muted)]">
            {page.subheadline}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href={ctaHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center rounded-[8px] bg-[var(--geist-hero-foreground)] px-6 text-sm font-medium text-[var(--geist-hero-background)] transition-opacity hover:opacity-85"
            >
              {page.ctaLabel}
            </a>
            <a
              href="#proof"
              className="inline-flex h-11 items-center rounded-[8px] border border-[var(--geist-hero-border)] bg-[var(--geist-hero-surface)] px-6 text-sm font-medium transition-colors hover:border-[var(--geist-hero-muted)]"
            >
              See the proof
            </a>
          </div>
        </div>
      </section>

      {/* Personal note */}
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="mx-auto max-w-2xl rounded-[12px] border border-[var(--geist-hero-border)] bg-[var(--geist-hero-surface)] p-6">
          <div className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[var(--brand)]">
            A note for {first}
          </div>
          <p className="text-[15px] leading-relaxed text-[color-mix(in_srgb,var(--geist-hero-foreground)_82%,transparent)]">
            {page.personalNote}
          </p>
        </div>
      </section>

      {/* Stats band */}
      {page.stats.length > 0 ? (
        <section className="border-y border-[var(--geist-hero-border)] bg-[var(--geist-hero-surface)]">
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-px sm:grid-cols-4">
            {page.stats.map((stat) => (
              <div key={stat.label} className="px-6 py-8 text-center">
                <div className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-2 text-xs leading-relaxed text-[var(--geist-hero-muted)]">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Opportunities */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <SectionLabel>Built for your roadmap</SectionLabel>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Where Vercel fits at {page.company}
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--geist-hero-muted)]">
          Based on what your team is building today — each of these maps a real
          constraint to what shipping on Vercel looks like.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {page.opportunities.map((opportunity, index) => (
            <div
              key={opportunity.title}
              className="flex flex-col rounded-[12px] border border-[var(--geist-hero-border)] bg-[var(--geist-hero-surface)] p-6 transition-colors hover:border-[color-mix(in_srgb,var(--brand)_45%,var(--geist-hero-border))]"
            >
              <div className="mb-4 text-xs font-medium text-[var(--geist-hero-muted)]">
                {String(index + 1).padStart(2, "0")}
              </div>
              <h3 className="text-lg font-semibold tracking-tight">
                {opportunity.title}
              </h3>
              <div className="mt-4 space-y-4 text-sm leading-relaxed">
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--geist-hero-muted)]">
                    Today
                  </div>
                  <p className="text-[color-mix(in_srgb,var(--geist-hero-foreground)_72%,transparent)]">
                    {opportunity.pain}
                  </p>
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--brand)]">
                    With Vercel
                  </div>
                  <p className="text-[color-mix(in_srgb,var(--geist-hero-foreground)_72%,transparent)]">
                    {opportunity.solution}
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-[8px] border border-[color-mix(in_srgb,var(--brand)_30%,transparent)] bg-[color-mix(in_srgb,var(--brand)_10%,transparent)] px-4 py-3 text-sm leading-relaxed">
                {opportunity.outcome}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Customer stories */}
      <section
        id="proof"
        className="border-t border-[var(--geist-hero-border)] bg-[var(--geist-hero-surface)]"
      >
        <div className="mx-auto max-w-4xl px-6 py-20">
          <SectionLabel>Customer proof</SectionLabel>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Teams like {page.company} on Vercel
          </h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {page.stories.map((story) => (
              <a
                key={story.url}
                href={story.url}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col rounded-[12px] border border-[var(--geist-hero-border)] bg-[var(--geist-hero-background)] p-6 transition-colors hover:border-[color-mix(in_srgb,var(--brand)_45%,var(--geist-hero-border))]"
              >
                <div className="text-4xl font-semibold tracking-tight text-[var(--brand)]">
                  {story.metric}
                </div>
                <div className="mt-1 text-sm text-[var(--geist-hero-muted)]">
                  {story.metricLabel}
                </div>
                <div className="mt-5 text-sm font-semibold">{story.company}</div>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[color-mix(in_srgb,var(--geist-hero-foreground)_65%,transparent)]">
                  {story.summary}
                </p>
                <div className="mt-5 text-sm font-medium text-[var(--geist-hero-muted)] transition-colors group-hover:text-[var(--geist-hero-foreground)]">
                  Read the story →
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden border-t border-[var(--geist-hero-border)]">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 bottom-[-220px] h-[380px] w-[680px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in srgb, var(--brand) 55%, transparent), transparent)",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center">
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Let&apos;s make this real for {page.company}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--geist-hero-muted)]">
            Everything on this page is grounded in what your team is building
            right now. We&apos;d love to walk through it together.
          </p>
          <div className="mt-8">
            <a
              href={ctaHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center rounded-[8px] bg-[var(--geist-hero-foreground)] px-6 text-sm font-medium text-[var(--geist-hero-background)] transition-opacity hover:opacity-85"
            >
              {page.ctaLabel}
            </a>
          </div>
          <p className="mt-8 text-xs text-[var(--geist-hero-muted)]">
            Prepared for {page.recipientName} · {createdAt}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--geist-hero-border)]">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-[var(--geist-hero-muted)]">
          <div className="flex items-center gap-2">
            <VercelMark className="h-3 w-3.5" />
            <span>
              Vercel × {page.company} — made for {page.recipientName}
            </span>
          </div>
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-[var(--geist-hero-foreground)]"
          >
            vercel.com
          </a>
        </div>
      </footer>
    </div>
  );
}
