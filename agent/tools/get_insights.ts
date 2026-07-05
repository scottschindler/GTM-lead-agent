import { defineTool } from "eve/tools";
import { z } from "zod";

import { inSessionWorkspace } from "../lib/workspace";

import { readInsights } from "../lib/store";

export default defineTool({
  description:
    "Read accumulated learning insights from previous pipeline runs. Call before content generation so past learnings shape the messaging strategy and outreach.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    return inSessionWorkspace(ctx.session, async () => {
      const insights = await readInsights();
      return {
        count: insights.length,
        insights: insights.slice(-20),
      };
    });
  },
});
