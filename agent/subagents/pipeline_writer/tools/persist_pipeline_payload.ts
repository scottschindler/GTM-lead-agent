import { defineTool } from "eve/tools";
import { z } from "zod";

import { createLandingPageForLead } from "../../../lib/landing-page";
import { assertRunIsCurrent, rootSessionIdOf } from "../../../lib/run-guard";
import {
  STAGE_TO_TOGGLE,
  emailBodyWithLandingPage,
  emailBodyWithoutLandingPage,
  pipelineWriterOutputSchema,
} from "../../../lib/stage-schemas";
import {
  appendActivity,
  isStageEnabled,
  leadSummary,
  markStageSkipped,
  queueSendDraft,
  readPipelineConfig,
  resolveLeadReference,
  saveStageOutput,
} from "../../../lib/store";
import type { PipelineStage } from "../../../lib/types";
import { inSessionWorkspace } from "../../../lib/workspace";

const STAGE_SAVE_COPY: Record<
  Extract<
    PipelineStage,
    | "qualification"
    | "hypothesis"
    | "opportunity_mapping"
    | "content_generation"
    | "sequence_planning"
  >,
  { progress: string; done: string; skipped: string }
> = {
  qualification: {
    progress: "Saving the qualification decision",
    done: "Qualification decision saved",
    skipped: "Qualification skipped",
  },
  hypothesis: {
    progress: "Saving the outreach hypotheses",
    done: "Hypotheses saved",
    skipped: "Hypotheses skipped",
  },
  opportunity_mapping: {
    progress: "Saving the opportunity map",
    done: "Opportunity map saved",
    skipped: "Opportunity map skipped",
  },
  content_generation: {
    progress: "Creating the page and queuing the draft",
    done: "Message, page, and draft queued",
    skipped: "Messaging skipped",
  },
  sequence_planning: {
    progress: "Saving the follow-up sequence",
    done: "Sequence plan saved",
    skipped: "Sequence planning skipped",
  },
};

function parsePayload(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return JSON.parse(value);
}

function shortSchemaError(error: z.ZodError): string {
  return error.issues
    .slice(0, 4)
    .map((issue) => {
      const path = issue.path.length ? issue.path.join(".") : "payload";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

async function saveOrSkip(
  leadId: string,
  stage: PipelineStage,
  output: unknown,
  savedStages: string[],
  skippedStages: string[],
): Promise<"saved" | "skipped"> {
  const toggle = STAGE_TO_TOGGLE[stage];
  if (toggle && !(await isStageEnabled(toggle))) {
    await markStageSkipped(
      leadId,
      stage,
      `Stage ${stage} disabled in pipeline config`,
    );
    skippedStages.push(stage);
    return "skipped";
  }

  await saveStageOutput(leadId, stage, output);
  savedStages.push(stage);
  return "saved";
}

async function appendStageActivity(
  sessionId: string,
  leadId: string,
  stage: keyof typeof STAGE_SAVE_COPY,
  phase: "progress" | "done" | "skipped",
): Promise<void> {
  await appendActivity({
    sessionId,
    type: `pipeline.stage.${phase}`,
    summary: STAGE_SAVE_COPY[stage][phase],
    detail: {
      leadId,
      stage,
      phase,
      source: "persist_pipeline_payload",
    },
  });
}

async function saveStageWithActivity(
  sessionId: string,
  leadId: string,
  stage: keyof typeof STAGE_SAVE_COPY,
  output: unknown,
  savedStages: string[],
  skippedStages: string[],
): Promise<"saved" | "skipped"> {
  await appendStageActivity(sessionId, leadId, stage, "progress");
  const result = await saveOrSkip(leadId, stage, output, savedStages, skippedStages);
  await appendStageActivity(
    sessionId,
    leadId,
    stage,
    result === "saved" ? "done" : "skipped",
  );
  return result;
}

export default defineTool({
  description:
    "Persist the complete pipeline writer payload for a lead. Validates and repairs minor shape drift, creates the personalized page when enabled, queues the draft, and returns a compact receipt.",
  inputSchema: z.object({
    leadId: z.string().min(1),
    payload: z.unknown(),
  }),
  async execute({ leadId, payload }, ctx) {
    return inSessionWorkspace(ctx.session, async () => {
      await assertRunIsCurrent(rootSessionIdOf(ctx.session));

      const resolution = await resolveLeadReference(leadId);
      const resolvedLead = resolution.lead;
      if (!resolvedLead) {
        return {
          ok: false as const,
          error: resolution.ambiguousCandidates?.length
            ? `leadId: "${leadId}" matched multiple leads: ${resolution.ambiguousCandidates.join(", ")}. Retry with the exact canonical lead id.`
            : `leadId: lead not found "${leadId}". Retry with the exact canonical lead id.`,
        };
      }
      const canonicalLeadId = resolvedLead.id;

      try {
        payload = parsePayload(payload);
      } catch {
        return {
          ok: false as const,
          error:
            "payload: string was not valid JSON. Retry with payload as a JSON object.",
        };
      }

      const parsed = pipelineWriterOutputSchema.safeParse(payload);
      if (!parsed.success) {
        return {
          ok: false as const,
          error: shortSchemaError(parsed.error),
        };
      }

      const data = parsed.data;
      const savedStages: string[] = [];
      const skippedStages: string[] = [];
      let landingPageUrl: string | undefined;
      let draftQueued = false;

      await saveStageWithActivity(
        ctx.session.id,
        canonicalLeadId,
        "qualification",
        data.qualification,
        savedStages,
        skippedStages,
      );

      if (
        savedStages.includes("qualification") &&
        data.qualification.verdict === "disqualified"
      ) {
        return {
          ok: true as const,
          leadId: canonicalLeadId,
          verdict: data.qualification.verdict,
          savedStages,
          skippedStages,
          draftQueued,
          recommendedNextAction: data.recommendedNextAction,
          lead: leadSummary(
            (await resolveLeadReference(canonicalLeadId)).lead ?? resolvedLead,
          ),
        };
      }

      await saveStageWithActivity(
        ctx.session.id,
        canonicalLeadId,
        "hypothesis",
        data.hypothesis,
        savedStages,
        skippedStages,
      );
      await saveStageWithActivity(
        ctx.session.id,
        canonicalLeadId,
        "opportunity_mapping",
        data.opportunity_mapping,
        savedStages,
        skippedStages,
      );
      const contentToggle = STAGE_TO_TOGGLE.content_generation;
      await appendStageActivity(
        ctx.session.id,
        canonicalLeadId,
        "content_generation",
        "progress",
      );
      if (contentToggle && !(await isStageEnabled(contentToggle))) {
        await markStageSkipped(
          canonicalLeadId,
          "content_generation",
          "Stage content_generation disabled in pipeline config",
        );
        skippedStages.push("content_generation");
        await appendStageActivity(
          ctx.session.id,
          canonicalLeadId,
          "content_generation",
          "skipped",
        );
      } else {
        const config = await readPipelineConfig();
        let emailBody = data.content_generation.emailBody;
        let landingPageSlug: string | undefined;

        if (config.landingPages) {
          const landing = await createLandingPageForLead(
            resolvedLead,
            data.content_generation.landingPage,
          );
          landingPageSlug = landing.slug;
          landingPageUrl = landing.url;
          emailBody = emailBodyWithLandingPage(emailBody, landing.url);
        } else {
          emailBody = emailBodyWithoutLandingPage(emailBody);
        }

        await saveStageOutput(canonicalLeadId, "content_generation", {
          messagingStrategy: data.content_generation.messagingStrategy,
          subjectLines: data.content_generation.subjectLines,
          emailBody,
          cta: data.content_generation.cta,
          objectionResponses: data.content_generation.objectionResponses,
          landingPageSlug,
          landingPageUrl,
        });
        savedStages.push("content_generation");

        await queueSendDraft(canonicalLeadId, {
          subject: data.content_generation.subjectLines[0],
          body: emailBody,
          cta: data.content_generation.cta,
          timezone: resolvedLead.timezone,
        });
        draftQueued = true;
        await appendStageActivity(
          ctx.session.id,
          canonicalLeadId,
          "content_generation",
          "done",
        );
      }

      await saveStageWithActivity(
        ctx.session.id,
        canonicalLeadId,
        "sequence_planning",
        data.sequence_planning,
        savedStages,
        skippedStages,
      );

      const latest =
        (await resolveLeadReference(canonicalLeadId)).lead ?? resolvedLead;
      return {
        ok: true as const,
        leadId: canonicalLeadId,
        verdict: data.qualification.verdict,
        savedStages,
        skippedStages,
        landingPageUrl,
        draftQueued,
        recommendedNextAction: data.recommendedNextAction,
        lead: leadSummary(latest),
      };
    });
  },
});
