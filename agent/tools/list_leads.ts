import { defineTool } from "eve/tools";
import { z } from "zod";

import { inSessionWorkspace } from "../lib/workspace";

import { listLeads } from "../lib/store";

export default defineTool({
  description: "List all leads with id, company, stage, and outcome.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    return inSessionWorkspace(ctx.session, async () => {
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
    });
  },
});
