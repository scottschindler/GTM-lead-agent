import { defineTool } from "eve/tools";
import { z } from "zod";

import { createLandingPageForLead } from "../../../lib/landing-page";
import { assertRunIsCurrent, rootSessionIdOf } from "../../../lib/run-guard";
import {
  STAGE_TO_TOGGLE,
  WRITER_STAGES,
  emailBodyWithLandingPage,
  emailBodyWithoutLandingPage,
  parseWriterStagePayload,
  type WriterContentPayload,
  type WriterStage,
} from "../../../lib/stage-schemas";
import {
  appendActivity,
  isStageEnabled,
  markStageSkipped,
  queueSendDraft,
  readPipelineConfig,
  resolveLeadReference,
  saveStageOutput,
} from "../../../lib/store";
import { inSessionWorkspace } from "../../../lib/workspace";

const STAGE_SAVE_COPY: Record<
  WriterStage,
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
      const path = issue.path.length ? issue.path.join(".") : "output";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

async function appendStageActivity(
  sessionId: string,
  leadId: string,
  stage: WriterStage,
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
      source: "persist_stage_payload",
    },
  });
}

async function skipDisabledStage(
  sessionId: string,
  leadId: string,
  stage: WriterStage,
): Promise<void> {
  await markStageSkipped(
    leadId,
    stage,
    `Stage ${stage} disabled in pipeline config`,
  );
  await appendStageActivity(sessionId, leadId, stage, "skipped");
}

export default defineTool({
  description:
    "Persist one pipeline stage's output for a lead. Call once per stage, strictly in pipeline order: qualification, hypothesis, opportunity_mapping, content_generation, sequence_planning. Validates and repairs minor shape drift, creates the personalized page and queues the draft on content_generation, and returns a compact per-stage receipt.",
  inputSchema: z.object({
    leadId: z.string().min(1),
    stage: z.enum(WRITER_STAGES),
    output: z.unknown(),
  }),
  async execute({ leadId, stage, output }, ctx) {
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
      const sessionId = ctx.session.id;

      const toggle = STAGE_TO_TOGGLE[stage];
      if (toggle && !(await isStageEnabled(toggle))) {
        await skipDisabledStage(sessionId, canonicalLeadId, stage);
        return {
          ok: true as const,
          stage,
          skipped: true as const,
          proceed: true as const,
        };
      }

      // Stages must land in pipeline order so each card's output appears when
      // its stage completes. Disabled earlier stages are skipped on the way.
      for (const earlier of WRITER_STAGES.slice(
        0,
        WRITER_STAGES.indexOf(stage),
      )) {
        const record = resolvedLead.stages[earlier];
        if (record && record.status !== "pending") continue;
        const earlierToggle = STAGE_TO_TOGGLE[earlier];
        if (earlierToggle && !(await isStageEnabled(earlierToggle))) {
          await skipDisabledStage(sessionId, canonicalLeadId, earlier);
          continue;
        }
        return {
          ok: false as const,
          error: `stage: persist stages in pipeline order. Save ${earlier} before ${stage}.`,
        };
      }

      try {
        output = parsePayload(output);
      } catch {
        return {
          ok: false as const,
          error:
            "output: string was not valid JSON. Retry with output as a JSON object.",
        };
      }

      await appendStageActivity(sessionId, canonicalLeadId, stage, "progress");

      if (stage === "content_generation") {
        const parsed = parseWriterStagePayload(stage, output, {
          opportunities: resolvedLead.stages.opportunity_mapping?.output,
        });
        if (!parsed.success) {
          return { ok: false as const, error: shortSchemaError(parsed.error) };
        }
        const data = parsed.data as WriterContentPayload;

        const config = await readPipelineConfig();
        let emailBody = data.emailBody;
        let landingPageSlug: string | undefined;
        let landingPageUrl: string | undefined;

        if (config.landingPages) {
          const landing = await createLandingPageForLead(
            resolvedLead,
            data.landingPage,
          );
          landingPageSlug = landing.slug;
          landingPageUrl = landing.url;
          emailBody = emailBodyWithLandingPage(emailBody, landing.url);
        } else {
          emailBody = emailBodyWithoutLandingPage(emailBody);
        }

        await saveStageOutput(canonicalLeadId, "content_generation", {
          messagingStrategy: data.messagingStrategy,
          subjectLines: data.subjectLines,
          emailBody,
          cta: data.cta,
          objectionResponses: data.objectionResponses,
          landingPageSlug,
          landingPageUrl,
        });
        await queueSendDraft(canonicalLeadId, {
          subject: data.subjectLines[0],
          body: emailBody,
          cta: data.cta,
          timezone: resolvedLead.timezone,
        });
        await appendStageActivity(sessionId, canonicalLeadId, stage, "done");
        return {
          ok: true as const,
          stage,
          saved: true as const,
          landingPageUrl,
          draftQueued: true as const,
          proceed: true as const,
        };
      }

      const parsed = parseWriterStagePayload(stage, output);
      if (!parsed.success) {
        return { ok: false as const, error: shortSchemaError(parsed.error) };
      }
      await saveStageOutput(canonicalLeadId, stage, parsed.data);
      await appendStageActivity(sessionId, canonicalLeadId, stage, "done");

      if (stage === "qualification") {
        const verdict = (parsed.data as { verdict: "qualified" | "disqualified" })
          .verdict;
        if (verdict === "disqualified") {
          return {
            ok: true as const,
            stage,
            saved: true as const,
            verdict,
            proceed: false as const,
            note: "Lead disqualified. Do not persist further stages; return the final receipt now.",
          };
        }
        return {
          ok: true as const,
          stage,
          saved: true as const,
          verdict,
          proceed: true as const,
        };
      }

      return {
        ok: true as const,
        stage,
        saved: true as const,
        proceed: true as const,
      };
    });
  },
});
