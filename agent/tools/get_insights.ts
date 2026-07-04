import { defineTool } from "eve/tools";
import { z } from "zod";

import { readInsights } from "../lib/store";

export default defineTool({
  description:
    "Read accumulated learning insights from previous pipeline runs. Call before messaging strategy and content generation so past learnings shape the outreach.",
  inputSchema: z.object({}),
  async execute() {
    const insights = await readInsights();
    return {
      count: insights.length,
      insights: insights.slice(-20),
    };
  },
});
