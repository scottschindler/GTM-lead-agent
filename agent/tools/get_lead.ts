import { defineTool } from "eve/tools";
import { z } from "zod";

import { inSessionWorkspace } from "../lib/workspace";

import {
  claimPipelineRun,
  PipelineRunAlreadyActiveError,
  rootSessionIdOf,
  StaleRunError,
} from "../lib/run-guard";
import {
  leadSummary,
  readPipelineConfig,
  resolveLeadReference,
} from "../lib/store";

export default defineTool({
  description:
    "Load a lead by id and the current pipeline stage toggles. Call this at the start of every run. Set includeStageOutputs only when you need previously saved stage outputs (e.g. resuming a lead researched in an earlier session).",
  inputSchema: z.object({
    leadId: z.string().min(1),
    includeStageOutputs: z.boolean().optional(),
  }),
  async execute({ leadId, includeStageOutputs }, ctx) {
    return inSessionWorkspace(ctx.session, async () => {
      const resolution = await resolveLeadReference(leadId);
      const lead = resolution.lead;
      if (!lead) {
        return {
          found: false as const,
          leadId,
          candidates: resolution.ambiguousCandidates,
        };
      }

      try {
        await claimPipelineRun(rootSessionIdOf(ctx.session), lead.id);
      } catch (error) {
        if (error instanceof PipelineRunAlreadyActiveError) {
          return {
            found: true as const,
            blocked: true as const,
            error: error.message,
            requestedLeadId: leadId,
            resolvedLeadId: lead.id,
            matchedBy: resolution.matchedBy,
          };
        }
        if (error instanceof StaleRunError) {
          return {
            found: true as const,
            blocked: true as const,
            error: error.message,
            requestedLeadId: leadId,
            resolvedLeadId: lead.id,
            matchedBy: resolution.matchedBy,
          };
        }
        throw error;
      }

      const pipelineConfig = await readPipelineConfig();
      return {
        found: true as const,
        blocked: false as const,
        lead: includeStageOutputs ? lead : leadSummary(lead),
        requestedLeadId: leadId,
        resolvedLeadId: lead.id,
        matchedBy: resolution.matchedBy,
        pipelineConfig,
      };
    });
  },
});
