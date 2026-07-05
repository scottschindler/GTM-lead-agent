import { defineTool } from "eve/tools";
import { z } from "zod";

import { inSessionWorkspace } from "../lib/workspace";

import { assertRunIsCurrent, rootSessionIdOf } from "../lib/run-guard";
import { saveInsights } from "../lib/store";

const insightSchema = z.object({
  category: z.enum([
    "messaging",
    "qualification",
    "hypothesis_accuracy",
    "sequence",
    "objections",
    "general",
  ]),
  insight: z.string().min(1),
  evidence: z.string().min(1),
  applyTo: z.string().min(1),
});

export default defineTool({
  description:
    "Persist learning insights from this pipeline run so future runs can apply them. Called during the learning stage.",
  inputSchema: z.object({
    leadId: z.string().min(1),
    insights: z.array(insightSchema).min(1),
  }),
  async execute({ leadId, insights }, ctx) {
    return inSessionWorkspace(ctx.session, async () => {
      await assertRunIsCurrent(rootSessionIdOf(ctx.session));

      const stored = await saveInsights(leadId, insights);
      return { ok: true as const, saved: stored.length };
    });
  },
});
