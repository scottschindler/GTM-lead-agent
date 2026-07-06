import { defineTool } from "eve/tools";
import { z } from "zod";

import { inSessionWorkspace } from "../lib/workspace";

import {
  STAGE_TO_TOGGLE,
  emailBodyWithLandingPage,
  normalizeStageOutput,
  stageSchemas,
  writableStageSchema,
} from "../lib/stage-schemas";
import {
  normalizeResearchBriefInput,
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
} from "../lib/types";

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

      if (status === "failed") {
        const lead = await saveStageOutput(leadId, stage, output, {
          status: "failed",
          note: note ?? `Stage ${stage} failed`,
        });
        return { ok: true as const, skipped: false as const, lead: leadSummary(lead) };
      }

      const stageOutput = normalizeStageOutput(stage, output);
      const normalizedOutput =
        stage === "research"
          ? normalizeResearchBriefInput(stageOutput, {
              companyName: resolvedLead.company,
              personName: resolvedLead.name,
            })
          : stageOutput;
      const parsed = stageSchemas[stage].safeParse(normalizedOutput);
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
