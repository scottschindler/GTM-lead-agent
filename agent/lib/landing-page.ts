import { randomUUID } from "node:crypto";

import type { LandingPagePayload } from "./stage-schemas";
import { saveLandingPage } from "./store";
import type { LandingPage, Lead } from "./types";

export function baseUrl(): string {
  if (process.env.LANDING_PAGE_BASE_URL) {
    return process.env.LANDING_PAGE_BASE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "lead"
  );
}

export async function createLandingPageForLead(
  lead: Lead,
  input: LandingPagePayload,
): Promise<{ page: LandingPage; slug: string; url: string }> {
  const slug = `${slugify(lead.company)}-${randomUUID().slice(0, 8)}`;
  const page: LandingPage = {
    slug,
    leadId: lead.id,
    createdAt: new Date().toISOString(),
    recipientName: lead.name,
    company: lead.company,
    companyDomain: lead.companyDomain,
    brandColor: input.brandColor?.toLowerCase(),
    headline: input.headline,
    subheadline: input.subheadline,
    personalNote: input.personalNote,
    opportunities: input.opportunities,
    stats: input.stats,
    stories: input.stories,
    ctaLabel: input.ctaLabel,
    ctaUrl: input.ctaUrl,
  };

  await saveLandingPage(page);
  return { page, slug, url: `${baseUrl()}/for/${slug}` };
}
