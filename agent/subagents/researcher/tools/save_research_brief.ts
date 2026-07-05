import { defineTool } from "eve/tools";
import { z } from "zod";

import { inSessionWorkspace } from "../../../lib/workspace";

import {
  normalizeResearchBriefInput,
  researchBriefSchema,
} from "../../../lib/research-brief";
import { assertRunIsCurrent, rootSessionIdOf } from "../../../lib/run-guard";
import {
  leadSummary,
  resolveLeadReference,
  saveStageOutput,
} from "../../../lib/store";

// The researcher persists its own brief so the foreman doesn't spend a slow
// model turn re-serializing the full payload into save_stage_output.
export default defineTool({
  description:
    "Persist the completed research brief for a lead. Call this exactly once, after research is done, with the full structured brief.",
  inputSchema: z.object({
    leadId: z.string().min(1),
    brief: z.unknown(),
  }),
  async execute({ leadId, brief }, ctx) {
    return inSessionWorkspace(ctx.session, async () => {
      await assertRunIsCurrent(rootSessionIdOf(ctx.session));

      const resolution = await resolveLeadReference(leadId);
      const resolvedLead = resolution.lead;
      if (!resolvedLead) {
        return {
          ok: false as const,
          error: resolution.ambiguousCandidates?.length
            ? `Lead reference "${leadId}" matched multiple leads: ${resolution.ambiguousCandidates.join(", ")}. Retry once with the exact lead id from the task. Do not ask the user.`
            : `Lead not found: ${leadId}. Retry once with the exact lead id from the task. Do not ask the user.`,
        };
      }
      const canonicalLeadId = resolvedLead.id;

      // Models frequently pass the payload as stringified JSON; accept both.
      if (typeof brief === "string") {
        try {
          brief = JSON.parse(brief);
        } catch {
          return {
            ok: false as const,
            error:
              "brief was a string that is not valid JSON. Pass the brief as a JSON object.",
          };
        }
      }

      const normalizedBrief = normalizeResearchBriefInput(brief, {
        companyName: resolvedLead.company,
        personName: resolvedLead.name,
      });
      const parsed = researchBriefSchema.safeParse(normalizedBrief);
      if (!parsed.success) {
        return {
          ok: false as const,
          error: `Invalid research brief: ${parsed.error.issues
            .map((issue) => {
              const path = issue.path.length ? issue.path.join(".") : "brief";
              return `${path}: ${issue.message}`;
            })
            .join("; ")}`,
        };
      }

      const lead = await saveStageOutput(canonicalLeadId, "research", parsed.data, {
        status: "done",
      });
      return {
        ok: true as const,
        lead: leadSummary(lead),
        requestedLeadId: leadId,
        resolvedLeadId: canonicalLeadId,
        matchedBy: resolution.matchedBy,
      };
    });
  },
});
