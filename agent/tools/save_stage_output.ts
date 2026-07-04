import { defineTool } from "eve/tools";
import { z } from "zod";

import {
  getLead,
  isStageEnabled,
  leadSummary,
  markStageSkipped,
  saveStageOutput,
} from "../lib/store";
import type {
  ContentGenerationOutput,
  PipelineStage,
  ToggleableStage,
} from "../lib/types";

const STAGE_TO_TOGGLE: Partial<Record<PipelineStage, ToggleableStage>> = {
  qualification: "qualification",
  hypothesis: "hypothesis",
  opportunity_mapping: "opportunity_mapping",
  messaging_strategy: "messaging_strategy",
  sequence_planning: "sequence_planning",
  content_generation: "content_generation",
  engagement_intent: "engagement_intent",
  learning: "learning",
};

// Lenient: a missing list never blocks the pipeline; it just defaults empty.
const stringList = z.array(z.string()).default([]);

const researchSchema = z.object({
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
  summary: z.string().default(""),
  sources: stringList,
});

const qualificationSchema = z.object({
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
  rationale: z.string(),
});

const hypothesisSchema = z.object({
  hypotheses: z.array(
    z.object({
      statement: z.string(),
      confidence: z.number().min(0).max(1),
      evidence: z.array(z.string()),
      engineeringPain: z.string(),
      businessImpact: z.string(),
    }),
  ),
});

const opportunitySchema = z.object({
  opportunities: z.array(
    z.object({
      engineeringPain: z.string(),
      vercelCapability: z.string(),
      developerOutcome: z.string(),
      businessImpact: z.string(),
      estimatedRoi: z.string(),
      priority: z.number(),
    }),
  ),
});

const messagingSchema = z.object({
  messagingAngle: z.string(),
  technicalDepth: z.enum(["low", "medium", "high"]),
  tone: z.string(),
  story: z.string(),
  hooks: z.array(z.string()),
  cta: z.string(),
  customerExamples: z.array(z.string()),
  likelyObjections: z.array(z.string()),
});

const sequenceSchema = z.object({
  channels: z.array(z.string()),
  cadence: z.string(),
  timing: z.string(),
  steps: z.array(
    z.object({
      channel: z.string(),
      delayDays: z.number(),
      purpose: z.string(),
    }),
  ),
  followUpLogic: z.string(),
  exitConditions: z.array(z.string()),
});

const sendRecordSchema = z.object({
  status: z.enum(["drafted", "approved", "denied"]),
  subject: z.string(),
  body: z.string(),
  cta: z.string(),
  sendWindow: z.object({
    timezone: z.string(),
    earliestLocal: z.string(),
    latestLocal: z.string(),
    recommendedAt: z.string(),
  }),
  approvedAt: z.string().optional(),
  deniedAt: z.string().optional(),
});

const contentSchema = z.object({
  subjectLines: z.array(z.string()),
  emailBody: z.string(),
  cta: z.string(),
  objectionResponses: z.array(z.string()),
  // Attached by create_landing_page; allowed here so re-saves don't drop it.
  landingPageSlug: z.string().optional(),
  landingPageUrl: z.string().optional(),
  // Attached by send_message; allowed here so re-saves don't drop it.
  send: sendRecordSchema.optional(),
});

const engagementIntentSchema = z.object({
  simulated: z.literal(true),
  events: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      occurredAt: z.string(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
  intentScore: z.number().min(0).max(10),
  confidence: z.number().min(0).max(1),
  signalBreakdown: z.array(
    z.object({ signal: z.string(), weight: z.number() }),
  ),
  recommendedNextAction: z.string(),
});

const learningSchema = z.object({
  insights: z.array(
    z.object({
      category: z.enum([
        "messaging",
        "qualification",
        "hypothesis_accuracy",
        "sequence",
        "objections",
        "general",
      ]),
      insight: z.string(),
      evidence: z.string(),
      applyTo: z.string(),
    }),
  ),
  hypothesisAccuracy: z.string(),
  whatWorked: z.array(z.string()),
  whatToChange: z.array(z.string()),
});

const intakeSchema = z.object({
  leadId: z.string(),
  source: z.string(),
});

export default defineTool({
  description:
    "Persist a pipeline stage output for a lead. Validates stage shape and rejects writes for disabled stages.",
  inputSchema: z.object({
    leadId: z.string().min(1),
    stage: z.enum([
      "intake",
      "research",
      "qualification",
      "hypothesis",
      "opportunity_mapping",
      "messaging_strategy",
      "sequence_planning",
      "content_generation",
      "engagement_intent",
      "learning",
    ]),
    status: z.enum(["done", "skipped", "failed"]).optional(),
    note: z.string().optional(),
    output: z.unknown(),
  }),
  async execute({ leadId, stage, status, note, output }) {
    // Models frequently pass the payload as stringified JSON; accept both.
    if (typeof output === "string") {
      try {
        output = JSON.parse(output);
      } catch {
        return {
          ok: false as const,
          error: `Stage output for ${stage} was a string that is not valid JSON. Pass the stage output as a JSON object.`,
        };
      }
    }

    const toggle = STAGE_TO_TOGGLE[stage];
    if (toggle && !(await isStageEnabled(toggle))) {
      if (status === "skipped") {
        const lead = await markStageSkipped(
          leadId,
          stage,
          note ?? `Stage ${stage} disabled in pipeline config`,
        );
        return {
          ok: true as const,
          skipped: true as const,
          lead: leadSummary(lead),
        };
      }
      return {
        ok: false as const,
        error: `Stage ${stage} is disabled in pipeline config. Mark it skipped or continue.`,
      };
    }

    if (status === "skipped") {
      const lead = await markStageSkipped(
        leadId,
        stage,
        note ?? `Stage ${stage} skipped`,
      );
      return {
        ok: true as const,
        skipped: true as const,
        lead: leadSummary(lead),
      };
    }

    const schemas: Record<PipelineStage, z.ZodTypeAny> = {
      intake: intakeSchema,
      research: researchSchema,
      qualification: qualificationSchema,
      hypothesis: hypothesisSchema,
      opportunity_mapping: opportunitySchema,
      messaging_strategy: messagingSchema,
      sequence_planning: sequenceSchema,
      content_generation: contentSchema,
      engagement_intent: engagementIntentSchema,
      learning: learningSchema,
    };

    const parsed = schemas[stage].safeParse(output);
    if (!parsed.success) {
      return {
        ok: false as const,
        error: `Invalid output for stage ${stage}: ${parsed.error.message}`,
      };
    }

    // The landing page link is attached by create_landing_page before the
    // full content payload is written; don't let a re-save drop it.
    if (stage === "content_generation") {
      const existing = (await getLead(leadId))?.stages.content_generation
        ?.output as Partial<ContentGenerationOutput> | undefined;
      const data = parsed.data as Partial<ContentGenerationOutput>;
      data.landingPageSlug ??= existing?.landingPageSlug;
      data.landingPageUrl ??= existing?.landingPageUrl;
    }

    const lead = await saveStageOutput(leadId, stage, parsed.data, {
      status: status ?? "done",
      note,
    });
    return { ok: true as const, skipped: false as const, lead: leadSummary(lead) };
  },
});
