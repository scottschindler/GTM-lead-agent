import { defineTool } from "eve/tools";
import { z } from "zod";

import { inSessionWorkspace } from "../lib/workspace";

import { assertRunIsCurrent, rootSessionIdOf } from "../lib/run-guard";
import { runEngagementSimulation } from "../lib/store";

export default defineTool({
  description:
    "Simulate post-send engagement signals (opens, clicks, pricing visits, replies) for a lead and compute an intent score from weighted signals. Deterministic per lead; the data is clearly marked simulated. This is a Reviews-stage action, not part of the automatic pipeline — it only succeeds once the lead's outreach has already been approved and sent, and it persists the result itself.",
  inputSchema: z.object({
    leadId: z.string().min(1),
  }),
  async execute({ leadId }, ctx) {
    return inSessionWorkspace(ctx.session, async () => {
      try {
        await assertRunIsCurrent(rootSessionIdOf(ctx.session));
        const lead = await runEngagementSimulation(leadId);
        return {
          ok: true as const,
          simulated: true as const,
          output: lead.stages.engagement_intent.output,
        };
      } catch (error) {
        return {
          ok: false as const,
          error:
            error instanceof Error
              ? error.message
              : "Engagement simulation failed",
        };
      }
    });
  },
});
