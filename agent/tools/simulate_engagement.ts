import { defineTool } from "eve/tools";
import { z } from "zod";

import {
  isStageEnabled,
  recordEngagement,
  simulateEngagement,
} from "../lib/store";

export default defineTool({
  description:
    "Simulate post-send engagement signals (opens, clicks, pricing visits, replies) for a lead and compute an intent score from weighted signals. Deterministic per lead. Use for the engagement_intent stage; the data is clearly marked simulated.",
  inputSchema: z.object({
    leadId: z.string().min(1),
  }),
  async execute({ leadId }) {
    if (!(await isStageEnabled("engagement_intent"))) {
      return {
        ok: false as const,
        error:
          "engagement_intent stage is disabled in pipeline config. Mark it skipped and continue.",
      };
    }

    const simulation = simulateEngagement(leadId);
    await recordEngagement(leadId, simulation.events, simulation.intentScore);

    return {
      ok: true as const,
      simulated: true as const,
      ...simulation,
      guidance:
        "Persist this with save_stage_output stage engagement_intent, adding a recommendedNextAction. Intent >= 7 is a strong handoff signal.",
    };
  },
});
