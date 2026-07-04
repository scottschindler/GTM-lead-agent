"use client";

import { useState } from "react";

/**
 * Prospect logo with graceful degradation: Clearbit logo API, then the
 * Google favicon service, then a monogram tile in the brand color.
 */
export function CompanyLogo({
  domain,
  company,
  size = 40,
  className,
}: {
  domain: string;
  company: string;
  size?: number;
  className?: string;
}) {
  const sources = [
    `https://logo.clearbit.com/${domain}`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  ];
  const [sourceIndex, setSourceIndex] = useState(0);

  if (sourceIndex >= sources.length) {
    return (
      <span
        aria-hidden
        className={`flex items-center justify-center rounded-[8px] bg-[var(--brand)] font-semibold text-[var(--geist-hero-background)] ${className ?? ""}`}
        style={{ width: size, height: size, fontSize: size * 0.45 }}
      >
        {company.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external logo with runtime fallback chain
    <img
      src={sources[sourceIndex]}
      alt={`${company} logo`}
      width={size}
      height={size}
      className={`rounded-[8px] bg-[var(--geist-hero-foreground)] object-contain p-0.5 ${className ?? ""}`}
      onError={() => setSourceIndex((index) => index + 1)}
    />
  );
}
