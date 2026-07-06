import { z } from "zod";

import { researchBriefSchema } from "./research-brief";
import type {
  ContentGenerationOutput,
  LandingPageOpportunity,
  LandingPageStat,
  LandingPageStory,
  MessagingStrategyOutput,
  PipelineStage,
  ToggleableStage,
} from "./types";

export const STAGE_TO_TOGGLE: Partial<Record<PipelineStage, ToggleableStage>> = {
  qualification: "qualification",
  hypothesis: "hypothesis",
  opportunity_mapping: "opportunity_mapping",
  sequence_planning: "sequence_planning",
  content_generation: "content_generation",
};

export const writableStageSchema = z.enum([
  "intake",
  "research",
  "qualification",
  "hypothesis",
  "opportunity_mapping",
  "sequence_planning",
  "content_generation",
]);

export type WritableStage = z.infer<typeof writableStageSchema>;

export function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const text = asText(item);
    return text ? [text] : [];
  });
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function pick(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }
}

function trimString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

const textSchema = z.preprocess(trimString, z.string().min(1));
const optionalTextSchema = z.preprocess(trimString, z.string().min(1).optional());

function coerceFirstTwo<T>(items: T[]): [T, T] {
  return [items[0], items[1]];
}

function coerceMaxTwo<T>(items: T[]): T[] {
  return items.slice(0, 2);
}

export function emailBodyWithLandingPage(
  body: string,
  landingPageUrl?: string,
): string {
  const trimmedUrl = landingPageUrl?.trim();
  if (!trimmedUrl || body.includes(trimmedUrl)) return body;
  if (body.includes("{{landingPageUrl}}")) {
    return body.replaceAll("{{landingPageUrl}}", trimmedUrl);
  }
  return `${body.trim()}\n\nI put together a short page with more detail here: ${trimmedUrl}`;
}

export function emailBodyWithoutLandingPage(body: string): string {
  return body
    .replace(
      /\s*(?:Learn more|More here|I put together[^.\n]*):?\s*\{\{landingPageUrl\}\}\s*/gi,
      " ",
    )
    .replace(/\{\{landingPageUrl\}\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeObjectionResponses(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((item) => {
    const text = asText(item);
    if (text) return text;

    const record = asRecord(item);
    if (!record) return item;

    const objection = asText(record.objection);
    const response = asText(record.response);
    if (objection && response) return `${objection} ${response}`;
    return objection ?? response ?? item;
  });
}

function normalizeMessagingStrategy(
  value: unknown,
  content: Record<string, unknown>,
): unknown {
  const fallbackCta = asText(content.cta) ?? "Reply if useful";
  const fallbackHook =
    asTextList(content.subjectLines)[0] ?? "Relevant account signal";

  const text = asText(value);
  if (text) {
    return {
      messagingAngle: text,
      technicalDepth: "medium",
      tone: "concise, peer-to-peer",
      story: text,
      hooks: [fallbackHook],
      cta: fallbackCta,
      customerExamples: [],
      likelyObjections: [],
    };
  }

  const record = asRecord(value);
  if (!record) return value;

  const messagingAngle =
    asText(record.messagingAngle) ??
    asText(record.angle) ??
    asText(record.summary) ??
    asText(record.story) ??
    fallbackHook;
  const technicalDepth = asText(record.technicalDepth);

  return {
    ...record,
    messagingAngle,
    technicalDepth:
      technicalDepth === "low" ||
      technicalDepth === "medium" ||
      technicalDepth === "high"
        ? technicalDepth
        : "medium",
    tone: asText(record.tone) ?? "concise, peer-to-peer",
    story: asText(record.story) ?? asText(record.summary) ?? messagingAngle,
    hooks: asTextList(record.hooks).length
      ? asTextList(record.hooks)
      : [fallbackHook],
    cta: asText(record.cta) ?? fallbackCta,
    customerExamples: asTextList(record.customerExamples),
    likelyObjections: asTextList(record.likelyObjections),
  };
}

export function normalizeContentOutput(value: unknown): unknown {
  const record = asRecord(value);
  if (!record) return value;
  return {
    ...record,
    messagingStrategy: normalizeMessagingStrategy(
      record.messagingStrategy,
      record,
    ),
    objectionResponses: normalizeObjectionResponses(record.objectionResponses),
  };
}

export function normalizeSequenceOutput(value: unknown): unknown {
  const record = asRecord(value);
  if (!record) return value;
  const exitConditionsText = asText(record.exitConditions);
  if (!exitConditionsText) return value;
  return {
    ...record,
    exitConditions: exitConditionsText
      .split(/(?:\.\s+|;\s+|\n+)/)
      .map((item) => item.trim().replace(/\.$/, ""))
      .filter(Boolean),
  };
}

export function normalizeStageOutput(
  stage: WritableStage,
  output: unknown,
): unknown {
  if (stage === "content_generation") return normalizeContentOutput(output);
  if (stage === "sequence_planning") return normalizeSequenceOutput(output);
  return output;
}

function normalizeScore(value: unknown): unknown {
  const number = asNumber(value);
  return number ?? value;
}

function normalizeConfidence(value: unknown): unknown {
  const number = asNumber(value);
  if (number === undefined) return value;
  return number > 1 && number <= 10 ? number / 10 : number;
}

// Writer models drift between camelCase, snake_case, "Or"-less, and
// "...Score"-suffixed spellings of the same score key, so match on letters
// only instead of enumerating every alias.
function normalizeScoreKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z]/g, "").replace(/score$/, "");
}

function pickScore(
  scores: Record<string, unknown>,
  normalizedAliases: string[],
): unknown {
  const wanted = new Set(normalizedAliases);
  for (const [key, value] of Object.entries(scores)) {
    if (wanted.has(normalizeScoreKey(key))) {
      const number = asNumber(value);
      if (number !== undefined) return number;
    }
  }
  return undefined;
}

// Mirrors the disqualification thresholds in the pipeline_writer rubric so a
// payload that scored the lead but omitted the verdict doesn't force a retry.
function deriveVerdict(scores: {
  overallPriority: unknown;
  icpFit: unknown;
}): "qualified" | "disqualified" | undefined {
  const overall = asNumber(scores.overallPriority);
  const icp = asNumber(scores.icpFit);
  if (overall === undefined || icp === undefined) return undefined;
  return overall < 4 || icp < 3 ? "disqualified" : "qualified";
}

function normalizeVerdict(value: unknown): unknown {
  const text = asText(value)?.toLowerCase();
  if (text?.startsWith("disqualif")) return "disqualified";
  if (text?.startsWith("qualif")) return "qualified";
  return undefined;
}

function normalizeQualificationPayload(value: unknown): unknown {
  const record = asRecord(value);
  if (!record) return value;
  const scores = asRecord(record.scores) ?? record;
  const normalizedScores = {
    icpFit: normalizeScore(pickScore(scores, ["icpfit"])),
    buyingAuthority: normalizeScore(pickScore(scores, ["buyingauthority"])),
    productUsageOrIntent: normalizeScore(
      pickScore(scores, ["productusageorintent", "productusageintent"]),
    ),
    engineeringMaturity: normalizeScore(
      pickScore(scores, ["engineeringmaturity"]),
    ),
    companyGrowth: normalizeScore(pickScore(scores, ["companygrowth"])),
    businessImpact: normalizeScore(pickScore(scores, ["businessimpact"])),
    overallPriority: normalizeScore(pickScore(scores, ["overallpriority"])),
  };
  return {
    ...record,
    scores: normalizedScores,
    verdict:
      normalizeVerdict(record.verdict) ??
      deriveVerdict(normalizedScores) ??
      record.verdict,
  };
}

function normalizeHypothesisItem(value: unknown): unknown {
  const text = asText(value);
  if (text) {
    return {
      statement: text,
      confidence: 0.6,
      evidence: ["Research brief"],
      engineeringPain: text,
      businessImpact: text,
    };
  }

  const record = asRecord(value);
  if (!record) return value;

  const statement =
    asText(pick(record, ["statement", "hypothesis", "claim", "title"])) ??
    asText(pick(record, ["engineeringPain", "engineering_pain", "pain"]));
  const engineeringPain =
    asText(pick(record, ["engineeringPain", "engineering_pain", "pain"])) ??
    statement;
  const businessImpact =
    asText(pick(record, ["businessImpact", "business_impact", "impact"])) ??
    asText(record.rationale) ??
    statement;
  const evidence = asTextList(record.evidence).length
    ? asTextList(record.evidence)
    : asTextList(record.sources).length
      ? asTextList(record.sources)
      : ["Research brief"];

  return {
    ...record,
    statement,
    confidence:
      asNumber(normalizeConfidence(record.confidence ?? record.score)) ?? 0.6,
    evidence,
    engineeringPain,
    businessImpact,
  };
}

function normalizeHypothesisPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return { hypotheses: value.map(normalizeHypothesisItem) };
  }
  const record = asRecord(value);
  if (!record) return value;
  const hypotheses = Array.isArray(record.hypotheses)
    ? record.hypotheses
    : Array.isArray(record.items)
      ? record.items
      : undefined;
  return {
    ...record,
    hypotheses: hypotheses?.map(normalizeHypothesisItem),
  };
}

function normalizeOpportunityItem(value: unknown): unknown {
  const record = asRecord(value);
  if (!record) return value;
  const description = asText(pick(record, ["description", "summary"]));
  return {
    ...record,
    engineeringPain:
      asText(pick(record, ["engineeringPain", "engineering_pain", "pain"])) ??
      asText(pick(record, ["title", "opportunity", "name"])) ??
      description,
    vercelCapability:
      asText(
        pick(record, [
          "vercelCapability",
          "vercel_capability",
          "capability",
        ]),
      ) ??
      asTextList(
        pick(record, [
          "vercelCapabilities",
          "vercel_capabilities",
          "capabilities",
        ]),
      )[0] ??
      "Vercel platform",
    developerOutcome:
      asText(
        pick(record, [
          "developerOutcome",
          "developer_outcome",
          "outcome",
        ]),
      ) ??
      asText(record.solution) ??
      description,
    businessImpact:
      asText(pick(record, ["businessImpact", "business_impact", "impact"])) ??
      asText(record.outcome) ??
      description,
    estimatedRoi:
      asText(pick(record, ["estimatedRoi", "estimated_roi", "roi"])) ??
      "Potential efficiency gains",
    priority: asNumber(record.priority),
  };
}

function normalizeOpportunityPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return { opportunities: value.map(normalizeOpportunityItem) };
  }
  const record = asRecord(value);
  if (!record) return value;
  const opportunities = Array.isArray(record.opportunities)
    ? record.opportunities
    : Array.isArray(record.items)
      ? record.items
      : undefined;
  return {
    ...record,
    opportunities: opportunities?.map(normalizeOpportunityItem),
  };
}

function normalizeLandingPageOpportunity(value: unknown): unknown {
  const record = asRecord(value);
  if (!record) return value;
  const pain =
    asText(pick(record, ["pain", "engineeringPain", "engineering_pain"])) ??
    asText(record.title);
  const solution =
    asText(
      pick(record, [
        "solution",
        "vercelCapability",
        "vercel_capability",
        "capability",
      ]),
    ) ?? "Use Vercel to improve the delivery path.";
  const outcome =
    asText(
      pick(record, [
        "outcome",
        "developerOutcome",
        "developer_outcome",
        "businessImpact",
        "business_impact",
      ]),
    ) ?? "Faster shipping with less infrastructure overhead.";
  return {
    title: asText(record.title) ?? pain ?? solution,
    pain,
    solution,
    outcome,
  };
}

function normalizeLandingPageStory(value: unknown): unknown {
  const text = asText(value);
  if (text) {
    return {
      company: "Forrester TEI",
      metric: "264%",
      metricLabel: "three-year ROI",
      summary: text,
      url: "https://vercel.com/blog/forrester-total-economic-impact-vercel-roi",
    };
  }

  const record = asRecord(value);
  if (!record) return value;
  return {
    company: asText(record.company) ?? "Forrester TEI",
    metric: asText(record.metric) ?? asText(record.value) ?? "264%",
    metricLabel:
      asText(pick(record, ["metricLabel", "metric_label", "label"])) ??
      "three-year ROI",
    summary:
      asText(record.summary) ??
      asText(record.description) ??
      "Forrester found Vercel delivered strong ROI and reduced frontend infrastructure work.",
    url:
      asText(record.url) ??
      "https://vercel.com/blog/forrester-total-economic-impact-vercel-roi",
  };
}

function normalizeLandingPageStat(value: unknown): unknown {
  const text = asText(value);
  if (text) return { value: text, label: "proof point" };
  const record = asRecord(value);
  if (!record) return value;
  return {
    value: asText(record.value) ?? asText(record.metric),
    label: asText(record.label) ?? asText(record.metricLabel),
  };
}

function normalizeLandingPagePayload(
  value: unknown,
  opportunities: unknown,
  content: Record<string, unknown>,
): unknown {
  const record = asRecord(value) ?? {};
  const opportunityRecord = asRecord(opportunities);
  const opportunityItems: unknown[] = Array.isArray(record.opportunities)
    ? record.opportunities
    : opportunityRecord && Array.isArray(opportunityRecord.opportunities)
      ? opportunityRecord.opportunities
      : [];
  const normalizedOpportunities = opportunityItems
    .map(normalizeLandingPageOpportunity)
    .filter((item) => asRecord(item));
  const stories =
    asTextList(record.stories).length || Array.isArray(record.stories)
      ? record.stories
      : record.customerStories ?? record.customer_stories;

  return {
    headline:
      asText(record.headline) ??
      asText(record.title) ??
      "What this could look like on Vercel",
    subheadline:
      asText(pick(record, ["subheadline", "sub_headline", "subtitle"])) ??
      asText(pick(content, ["messagingAngle", "messaging_angle"])) ??
      "A focused path to ship faster with less infrastructure work.",
    personalNote:
      asText(pick(record, ["personalNote", "personal_note", "note"])) ??
      "I put this together based on the account signals from the research pass.",
    brandColor: asText(pick(record, ["brandColor", "brand_color"])),
    opportunities: normalizedOpportunities.length
      ? normalizedOpportunities
      : [
          {
            title: "Accelerate product delivery",
            pain: "Growing teams need to ship reliable web experiences quickly.",
            solution: "Use Vercel for frontend deployment and collaboration.",
            outcome: "Faster releases with less platform overhead.",
          },
          {
            title: "Improve developer experience",
            pain: "Complex infrastructure can slow engineering momentum.",
            solution: "Use Vercel's managed frontend cloud and workflow.",
            outcome: "More time spent building product instead of operating infrastructure.",
          },
        ],
    stories: Array.isArray(stories)
      ? stories.map(normalizeLandingPageStory)
      : [
          {
            company: "Forrester TEI",
            metric: "264%",
            metricLabel: "three-year ROI",
            summary:
              "Forrester found Vercel reduced frontend infrastructure work and improved delivery efficiency.",
            url: "https://vercel.com/blog/forrester-total-economic-impact-vercel-roi",
          },
        ],
    stats: Array.isArray(record.stats)
      ? record.stats.map(normalizeLandingPageStat)
      : [],
    ctaLabel:
      asText(pick(record, ["ctaLabel", "cta_label"])) ??
      asText(content.cta) ??
      "Discuss fit",
    ctaUrl: asText(pick(record, ["ctaUrl", "cta_url"])),
  };
}

function normalizePipelineContentPayload(
  value: unknown,
  opportunities: unknown,
): unknown {
  const record = asRecord(value);
  if (!record) return value;
  const subjectLines =
    record.subjectLines ?? record.subject_lines ?? record.subjects;
  const emailBody =
    record.emailBody ?? record.email_body ?? record.body ?? record.email;
  const cta =
    asText(record.cta) ??
    asText(pick(record, ["callToAction", "call_to_action"])) ??
    "Worth a quick architecture conversation?";
  const messagingStrategy =
    record.messagingStrategy ??
    record.messaging_strategy ??
    record.strategy ??
    record.messaging;

  const normalized = {
    ...record,
    messagingStrategy: normalizeMessagingStrategy(messagingStrategy, {
      ...record,
      cta,
      subjectLines,
    }),
    landingPage: normalizeLandingPagePayload(
      record.landingPage ??
        record.landing_page ??
        record.page ??
        record.personalizedLandingPage,
      opportunities,
      record,
    ),
    subjectLines: Array.isArray(subjectLines)
      ? subjectLines
      : asText(subjectLines)
        ? [subjectLines]
        : ["Vercel fit for your team"],
    emailBody:
      asText(emailBody) ??
      `Hi,\n\nI noticed a few signals that Vercel could help with.\n\nI put together a short page with more detail: {{landingPageUrl}}\n\nWorth a quick conversation?`,
    cta,
    objectionResponses:
      normalizeObjectionResponses(
        record.objectionResponses ??
          record.objection_responses ??
          record.objections,
      ) ?? [],
  };
  return normalizeContentOutput(normalized);
}

function normalizeSequenceStep(step: unknown): unknown {
  const stepRecord = asRecord(step);
  if (!stepRecord) return step;
  return {
    channel: asText(stepRecord.channel) ?? "email",
    delayDays:
      asNumber(
        pick(stepRecord, ["delayDays", "delay_days", "day", "dayOffset"]),
      ) ?? 0,
    purpose:
      asText(pick(stepRecord, ["purpose", "goal", "objective"])) ??
      "Advance the conversation",
  };
}

function normalizePipelineSequencePayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return {
      channels: ["email", "LinkedIn"],
      cadence: "First email, light social touch, one follow-up, then pause.",
      timing: "Start during the recipient's local business hours.",
      steps: value.map(normalizeSequenceStep),
      followUpLogic: "Follow up once if there is no reply; hand off on engagement.",
      exitConditions: ["Positive reply", "Explicit no", "No engagement after follow-up"],
    };
  }

  const record = asRecord(value);
  if (!record) return value;
  return normalizeSequenceOutput({
    ...record,
    channels: Array.isArray(record.channels)
      ? record.channels
      : asText(record.channel)
        ? [record.channel]
        : ["email", "LinkedIn"],
    cadence:
      asText(record.cadence) ??
      "First email, light social touch, one follow-up, then pause.",
    timing:
      asText(record.timing) ??
      asText(record.startTiming) ??
      "Start during the recipient's local business hours.",
    steps: Array.isArray(record.steps)
      ? record.steps.map(normalizeSequenceStep)
      : [
          { channel: "email", delayDays: 0, purpose: "Share the tailored page" },
          { channel: "LinkedIn", delayDays: 2, purpose: "Light social touch" },
          { channel: "email", delayDays: 5, purpose: "Follow up once" },
        ],
    followUpLogic:
      asText(pick(record, ["followUpLogic", "follow_up_logic"])) ??
      "Follow up once if there is no reply; hand off on engagement.",
    exitConditions:
      record.exitConditions ??
      record.exit_conditions ?? ["Positive reply", "Explicit no", "No engagement after follow-up"],
  });
}

function normalizePipelineWriterPayload(value: unknown): unknown {
  const record = asRecord(value);
  if (!record) return value;
  const opportunity = normalizeOpportunityPayload(record.opportunity_mapping);
  return {
    ...record,
    qualification: normalizeQualificationPayload(record.qualification),
    hypothesis: normalizeHypothesisPayload(record.hypothesis),
    opportunity_mapping: opportunity,
    content_generation: normalizePipelineContentPayload(
      record.content_generation,
      opportunity,
    ),
    sequence_planning: normalizePipelineSequencePayload(record.sequence_planning),
    recommendedNextAction:
      asText(record.recommendedNextAction) ??
      asText(record.recommended_next_action) ??
      "Queue the draft for review and follow up on engagement.",
  };
}

export const intakeSchema = z.object({
  leadId: textSchema,
  source: textSchema,
});

export const qualificationSchema = z.object({
  scores: z.object({
    icpFit: z.number().min(0).max(10),
    buyingAuthority: z.number().min(0).max(10),
    productUsageOrIntent: z.number().min(0).max(10),
    engineeringMaturity: z.number().min(0).max(10),
    companyGrowth: z.number().min(0).max(10),
    businessImpact: z.number().min(0).max(10),
    overallPriority: z.number().min(0).max(10),
  }),
  verdict: z.enum(["qualified", "disqualified"]),
  rationale: textSchema,
});

const hypothesisItemSchema = z.object({
  statement: textSchema,
  confidence: z.number().min(0).max(1),
  evidence: z.array(textSchema).min(1).max(4),
  engineeringPain: textSchema,
  businessImpact: textSchema,
});

export const hypothesisSchema = z.object({
  hypotheses: z
    .array(hypothesisItemSchema)
    .min(2)
    .max(4)
    .transform(coerceFirstTwo),
});

const opportunityItemSchema = z.object({
  engineeringPain: textSchema,
  vercelCapability: textSchema,
  developerOutcome: textSchema,
  businessImpact: textSchema,
  estimatedRoi: textSchema,
  priority: z.number().optional(),
});

export const opportunitySchema = z.object({
  opportunities: z
    .array(opportunityItemSchema)
    .min(2)
    .max(4)
    .transform((items) =>
      coerceFirstTwo(items).map((item, index) => ({
        ...item,
        priority: index + 1,
      })),
    ),
});

export const messagingSchema = z.object({
  messagingAngle: textSchema,
  technicalDepth: z.enum(["low", "medium", "high"]),
  tone: textSchema,
  story: textSchema,
  hooks: z.array(textSchema).min(1).max(3),
  cta: textSchema,
  customerExamples: z.array(textSchema).max(3),
  likelyObjections: z.array(textSchema).max(3),
}) satisfies z.ZodType<MessagingStrategyOutput>;

export const landingPageOpportunitySchema = z.object({
  title: textSchema,
  pain: textSchema,
  solution: textSchema,
  outcome: textSchema,
}) satisfies z.ZodType<LandingPageOpportunity>;

export const landingPageStorySchema = z.object({
  company: textSchema,
  metric: textSchema,
  metricLabel: textSchema,
  summary: textSchema,
  url: textSchema,
}) satisfies z.ZodType<LandingPageStory>;

export const landingPageStatSchema = z.object({
  value: textSchema,
  label: textSchema,
}) satisfies z.ZodType<LandingPageStat>;

export const landingPagePayloadSchema = z.object({
  headline: textSchema,
  subheadline: textSchema,
  personalNote: textSchema,
  brandColor: z
    .preprocess(trimString, z.string().regex(/^#[0-9a-fA-F]{6}$/).optional())
    .optional(),
  opportunities: z
    .array(landingPageOpportunitySchema)
    .min(2)
    .max(4)
    .transform(coerceFirstTwo),
  stories: z
    .array(landingPageStorySchema)
    .min(1)
    .max(4)
    .transform(coerceMaxTwo),
  stats: z
    .array(landingPageStatSchema)
    .max(4)
    .default([])
    .transform(coerceMaxTwo),
  ctaLabel: textSchema,
  ctaUrl: optionalTextSchema,
});

export type LandingPagePayload = z.infer<typeof landingPagePayloadSchema>;

const sequenceStepSchema = z.object({
  channel: textSchema,
  delayDays: z.number(),
  purpose: textSchema,
});

export const sequenceSchema = z.object({
  channels: z.array(textSchema).min(1).max(4),
  cadence: textSchema,
  timing: textSchema,
  steps: z.array(sequenceStepSchema).min(1).max(5),
  followUpLogic: textSchema,
  exitConditions: z.array(textSchema).min(1).max(6),
});

export const sendRecordSchema = z.object({
  status: z.enum(["drafted", "approved", "denied"]),
  subject: textSchema,
  body: textSchema,
  cta: textSchema,
  sendWindow: z.object({
    timezone: textSchema,
    earliestLocal: textSchema,
    latestLocal: textSchema,
    recommendedAt: textSchema,
  }),
  approvedAt: optionalTextSchema,
  deniedAt: optionalTextSchema,
});

export const contentSchema = z.object({
  messagingStrategy: messagingSchema.optional(),
  subjectLines: z.array(textSchema).min(1).max(4),
  emailBody: textSchema,
  cta: textSchema,
  objectionResponses: z.array(textSchema).max(3),
  landingPageSlug: optionalTextSchema,
  landingPageUrl: optionalTextSchema,
  send: sendRecordSchema.optional(),
}) satisfies z.ZodType<ContentGenerationOutput>;

export const stageSchemas: Record<WritableStage, z.ZodTypeAny> = {
  intake: intakeSchema,
  research: researchBriefSchema,
  qualification: qualificationSchema,
  hypothesis: hypothesisSchema,
  opportunity_mapping: opportunitySchema,
  sequence_planning: sequenceSchema,
  content_generation: contentSchema,
};

export const pipelineWriterOutputSchema = z.preprocess(
  normalizePipelineWriterPayload,
  z.object({
    qualification: qualificationSchema,
    hypothesis: hypothesisSchema,
    opportunity_mapping: opportunitySchema,
    content_generation: z.object({
      messagingStrategy: messagingSchema,
      landingPage: landingPagePayloadSchema,
      subjectLines: z.array(textSchema).min(1).max(4),
      emailBody: textSchema,
      cta: textSchema,
      objectionResponses: z.array(textSchema).max(3),
    }),
    sequence_planning: sequenceSchema,
    recommendedNextAction: textSchema,
  }),
);

export type PipelineWriterOutput = z.infer<typeof pipelineWriterOutputSchema>;
