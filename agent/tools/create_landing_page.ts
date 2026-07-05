import { randomUUID } from "node:crypto";

import { defineTool } from "eve/tools";
import { z } from "zod";

import { inSessionWorkspace } from "../lib/workspace";

import { assertRunIsCurrent, rootSessionIdOf } from "../lib/run-guard";
import {
  getLead,
  readPipelineConfig,
  saveLandingPage,
} from "../lib/store";
import type { LandingPage } from "../lib/types";

function baseUrl(): string {
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

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "lead"
  );
}

const opportunitySchema = z.object({
  title: z.string().min(1).describe("Short capability title, e.g. 'Ship AI features without owning infra'"),
  pain: z.string().min(1).describe("The prospect's specific engineering pain, grounded in research"),
  solution: z.string().min(1).describe("What Vercel offers for this pain"),
  outcome: z.string().min(1).describe("The concrete outcome the prospect can expect"),
});

const storySchema = z.object({
  company: z.string().min(1),
  metric: z.string().min(1).describe("Headline number, e.g. '80%' or '17x'"),
  metricLabel: z.string().min(1).describe("What the metric measures, e.g. 'Black Friday growth'"),
  summary: z.string().min(1).describe("One or two sentences on what the customer achieved"),
  url: z.string().url().describe("The real vercel.com customer story URL"),
});

const statSchema = z.object({
  value: z.string().min(1).describe("e.g. '264%'"),
  label: z.string().min(1).describe("e.g. 'three-year ROI (Forrester TEI)'"),
});

export default defineTool({
  description:
    "Create a unique, personalized Vercel-branded landing page for a lead and return its URL. Call this during content generation, before drafting the email, so the email can link to the page. All content must be grounded in research, opportunities, and real customer stories.",
  inputSchema: z.object({
    leadId: z.string().min(1),
    headline: z
      .string()
      .min(1)
      .describe("Personalized hero headline addressed to the company, e.g. 'What Supabase could ship on Vercel'"),
    subheadline: z.string().min(1).describe("One supporting sentence under the headline"),
    personalNote: z
      .string()
      .min(1)
      .describe("A short note addressed to the recipient by first name explaining why this page was made for them"),
    brandColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional()
      .describe("The prospect's primary brand color as a 6-digit hex, e.g. '#3ecf8e'. Omit if unknown."),
    opportunities: z
      .array(opportunitySchema)
      .length(2)
      .describe("Exactly the top 2 opportunities from opportunity mapping, framed for the prospect"),
    stats: z
      .array(statSchema)
      .max(2)
      .default([])
      .describe("Headline proof stats, e.g. Forrester TEI numbers or story metrics"),
    stories: z
      .array(storySchema)
      .min(1)
      .max(2)
      .describe("1-2 real Vercel customer stories that best match this account"),
    ctaLabel: z.string().min(1).describe("Primary call-to-action label, e.g. 'Book 20 minutes with our team'"),
    ctaUrl: z.string().url().optional().describe("Where the CTA points; omit to use a mailto fallback"),
  }),
  async execute(input, ctx) {
    return inSessionWorkspace(ctx.session, async () => {
      await assertRunIsCurrent(rootSessionIdOf(ctx.session));

      const config = await readPipelineConfig();
      if (!config.landingPages) {
        return {
          ok: false as const,
          error:
            "Personalized landing pages are disabled in the pipeline config. Draft the email without a landing page link and continue.",
        };
      }

      const lead = await getLead(input.leadId);
      if (!lead) {
        return { ok: false as const, error: `Lead not found: ${input.leadId}` };
      }

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
      const url = `${baseUrl()}/for/${slug}`;

      return {
        ok: true as const,
        slug,
        url,
        message: `Personalized landing page created. Include this exact URL in the outreach email, then save content_generation once with the email body, landingPageSlug, landingPageUrl, and send draft: ${url}`,
      };
    });
  },
});
