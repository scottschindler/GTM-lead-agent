import { defineTool } from "eve/tools";
import { z } from "zod";

import { listLeads } from "../lib/store";

export default defineTool({
  description: "List all leads with id, company, stage, and outcome.",
  inputSchema: z.object({}),
  async execute() {
    const leads = await listLeads();
    return {
      leads: leads.map((lead) => ({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        company: lead.company,
        currentStage: lead.currentStage,
        outcome: lead.outcome,
      })),
    };
  },
});
