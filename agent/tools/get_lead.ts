import { defineTool } from "eve/tools";
import { z } from "zod";

import { getLead, leadSummary, readPipelineConfig } from "../lib/store";

export default defineTool({
  description:
    "Load a lead by id and the current pipeline stage toggles. Call this at the start of every run. Set includeStageOutputs only when you need previously saved stage outputs (e.g. resuming a lead researched in an earlier session).",
  inputSchema: z.object({
    leadId: z.string().min(1),
    includeStageOutputs: z.boolean().optional(),
  }),
  async execute({ leadId, includeStageOutputs }) {
    const lead = await getLead(leadId);
    if (!lead) {
      return { found: false as const, leadId };
    }
    const pipelineConfig = await readPipelineConfig();
    return {
      found: true as const,
      lead: includeStageOutputs ? lead : leadSummary(lead),
      pipelineConfig,
    };
  },
});
