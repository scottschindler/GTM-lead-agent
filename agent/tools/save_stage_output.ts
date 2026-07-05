import { defineTool } from "eve/tools";
import { z } from "zod";

import { inSessionWorkspace } from "../lib/workspace";

import {
  normalizeResearchBriefInput,
  researchBriefSchema,
} from "../lib/research-brief";
import { assertRunIsCurrent, rootSessionIdOf } from "../lib/run-guard";
import {
  isStageEnabled,
  leadSummary,
  markStageSkipped,
  resolveLeadReference,
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
  sequence_planning: "sequence_planning",
  content_generation: "content_generation",
};

// The research stage is normally persisted by the researcher subagent via its
// own save_research_brief tool; this schema stays registered so the foreman
// can still re-save or repair a research payload if needed.
const researchSchema = researchBriefSchema;

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
  // The messaging strategy decided as the first step of content generation.
  messagingStrategy: messagingSchema.optional(),
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

const intakeSchema = z.object({
  leadId: z.string(),
  source: z.string(),
});

const writableStageSchema = z.enum([
  "intake",
  "research",
  "qualification",
  "hypothesis",
  "opportunity_mapping",
  "sequence_planning",
  "content_generation",
]);

type WritableStage = z.infer<typeof writableStageSchema>;

function emailBodyWithLandingPage(body: string, landingPageUrl?: string): string {
  const trimmedUrl = landingPageUrl?.trim();
  if (!trimmedUrl || body.includes(trimmedUrl)) return body;
  return `${body.trim()}\n\nI put together a short page with more detail here: ${trimmedUrl}`;
}

export default defineTool({
  description:
    "Persist a pipeline stage output for a lead. Validates stage shape and rejects writes for disabled stages.",
  inputSchema: z.object({
    leadId: z.string().min(1),
    stage: writableStageSchema,
    status: z.enum(["done", "skipped", "failed"]).optional(),
    note: z.string().optional(),
    output: z.unknown(),
  }),
  async execute({ leadId, stage, status, note, output }, ctx) {
    return inSessionWorkspace(ctx.session, async () => {
      await assertRunIsCurrent(rootSessionIdOf(ctx.session));

      // Fail fast with a short, actionable message instead of letting
      // saveStageOutput/markStageSkipped throw — an uncaught error here gets
      // logged (and fed back to the model) as a raw stack trace on every retry,
      // which can burn through a subagent's token budget fast.
      const resolution = await resolveLeadReference(leadId);
      const resolvedLead = resolution.lead;
      if (!resolvedLead) {
        return {
          ok: false as const,
          error: resolution.ambiguousCandidates?.length
            ? `Lead reference "${leadId}" matched multiple leads: ${resolution.ambiguousCandidates.join(", ")}. Use the exact lead id.`
            : `Lead not found: ${leadId}`,
        };
      }
      leadId = resolvedLead.id;

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

      const schemas: Record<WritableStage, z.ZodTypeAny> = {
        intake: intakeSchema,
        research: researchSchema,
        qualification: qualificationSchema,
        hypothesis: hypothesisSchema,
        opportunity_mapping: opportunitySchema,
        sequence_planning: sequenceSchema,
        content_generation: contentSchema,
      };

      const normalizedOutput =
        stage === "research"
          ? normalizeResearchBriefInput(output, {
              companyName: resolvedLead.company,
              personName: resolvedLead.name,
            })
          : output;
      const parsed = schemas[stage].safeParse(normalizedOutput);
      if (!parsed.success) {
        return {
          ok: false as const,
          error: `Invalid output for stage ${stage}: ${parsed.error.message}`,
        };
      }

      // Keep an existing landing-page link on content re-saves, and ensure the
      // saved email body contains the link before the stage is marked done.
      if (stage === "content_generation") {
        const existing = resolvedLead.stages.content_generation?.output as
          | Partial<ContentGenerationOutput>
          | undefined;
        const data = parsed.data as Partial<ContentGenerationOutput>;
        data.messagingStrategy ??= existing?.messagingStrategy;
        data.landingPageSlug ??= existing?.landingPageSlug;
        data.landingPageUrl ??= existing?.landingPageUrl;
        if (typeof data.emailBody === "string") {
          data.emailBody = emailBodyWithLandingPage(
            data.emailBody,
            data.landingPageUrl,
          );
        }
      }

      const lead = await saveStageOutput(leadId, stage, parsed.data, {
        status: status ?? "done",
        note,
      });
      return { ok: true as const, skipped: false as const, lead: leadSummary(lead) };
    });
  },
});
