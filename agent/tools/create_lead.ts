import { defineTool } from "eve/tools";
import { z } from "zod";

import { createLead, leadSummary, readPipelineConfig } from "../lib/store";

export default defineTool({
  description:
    "Create and initialize a new lead with id, timestamps, and source attribution. Dedupes by email.",
  inputSchema: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    company: z.string().min(1),
    companyDomain: z.string().min(1),
    source: z.string().min(1),
    timezone: z.string().optional(),
    id: z.string().optional(),
  }),
  async execute(input) {
    const lead = await createLead(input);
    const pipelineConfig = await readPipelineConfig();
    return { lead: leadSummary(lead), pipelineConfig };
  },
});
