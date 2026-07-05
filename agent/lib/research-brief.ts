import { z } from "zod";

// Lenient: a missing list never blocks the pipeline; it just defaults empty.
const stringList = z.array(z.string()).default([]);

function hasText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasListItems(value: string[] | undefined): boolean {
  return Array.isArray(value) && value.some((item) => hasText(item));
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

function textOrFallback(value: unknown, fallback?: string): string {
  return typeof value === "string" && value.trim() ? value : fallback ?? "";
}

function sentenceCount(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  return trimmed.split(/[.!?]+/).filter((part) => part.trim()).length || 1;
}

export type ResearchBriefFallback = {
  companyName?: string;
  personName?: string;
};

export function normalizeResearchBriefInput(
  value: unknown,
  fallback: ResearchBriefFallback = {},
): unknown {
  const brief = asRecord(value);
  if (!brief) return value;

  const company = asRecord(brief.company) ?? {};
  const person = asRecord(brief.person) ?? {};

  return {
    ...brief,
    company: {
      ...company,
      name: textOrFallback(company.name, fallback.companyName),
    },
    person: {
      ...person,
      name: textOrFallback(person.name, fallback.personName),
    },
  };
}

/**
 * Shared shape for the research stage output. Used by the foreman's
 * `save_stage_output` (research stage) and by the researcher subagent's
 * `save_research_brief` tool, so both persist paths validate identically.
 */
const researchBriefBaseSchema = z.object({
  company: z.object({
    name: z.string(),
    industry: z.string().optional(),
    employeeCount: z.string().optional(),
    funding: z.string().optional(),
    arrEstimate: z.string().optional(),
    engineeringTeamSize: z.string().optional(),
    techStack: stringList,
    hiringActivity: z.string().optional(),
    recentNews: stringList,
    growthSignals: stringList,
    sources: stringList,
  }),
  person: z.object({
    name: z.string(),
    title: z.string().optional(),
    team: z.string().optional(),
    seniority: z.string().optional(),
    linkedInUrl: z.string().optional(),
    technicalBackground: z.string().optional(),
    decisionMakingAuthority: z.string().optional(),
    sources: stringList,
  }),
  initiatives: stringList,
  productLaunches: stringList,
  aiInitiatives: stringList,
  hiringTrends: stringList,
  architectureNotes: stringList,
  competitors: stringList,
  priorities: stringList,
  // Lenient like the lists: a dropped summary shouldn't cost a failed
  // tool call plus a full retry turn.
  summary: z
    .string()
    .refine((value) => sentenceCount(value) <= 3, {
      message: "Research summary must be 3 sentences or fewer.",
    })
    .default(""),
  sources: stringList,
});

export const researchBriefSchema = researchBriefBaseSchema.superRefine(
  (brief, ctx) => {
    const hasSources =
      hasListItems(brief.sources) ||
      hasListItems(brief.company.sources) ||
      hasListItems(brief.person.sources);
    const hasSubstantiveResearch =
      hasText(brief.summary) ||
      hasText(brief.company.industry) ||
      hasText(brief.company.employeeCount) ||
      hasText(brief.company.funding) ||
      hasText(brief.company.arrEstimate) ||
      hasText(brief.company.engineeringTeamSize) ||
      hasText(brief.company.hiringActivity) ||
      hasText(brief.person.title) ||
      hasText(brief.person.team) ||
      hasText(brief.person.seniority) ||
      hasText(brief.person.technicalBackground) ||
      hasText(brief.person.decisionMakingAuthority) ||
      hasListItems(brief.company.techStack) ||
      hasListItems(brief.company.recentNews) ||
      hasListItems(brief.company.growthSignals) ||
      hasListItems(brief.initiatives) ||
      hasListItems(brief.productLaunches) ||
      hasListItems(brief.aiInitiatives) ||
      hasListItems(brief.hiringTrends) ||
      hasListItems(brief.architectureNotes) ||
      hasListItems(brief.priorities);

    if (!hasSubstantiveResearch) {
      ctx.addIssue({
        code: "custom",
        message:
          "Research brief must include a summary or at least one company/contact detail; names and sources alone are not enough.",
      });
    }

    if (!hasSources) {
      ctx.addIssue({
        code: "custom",
        message: "Research brief must include at least one source URL.",
      });
    }
  },
);
