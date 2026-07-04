import { defineTool } from "eve/tools";
import { z } from "zod";

import { leadSummary, setLeadOutcome } from "../lib/store";

export default defineTool({
  description:
    "Set the terminal or interim outcome for a lead: open, disqualified, nurture, handed_off, or bought.",
  inputSchema: z.object({
    leadId: z.string().min(1),
    outcome: z.enum([
      "open",
      "disqualified",
      "nurture",
      "handed_off",
      "bought",
    ]),
    recommendedNextAction: z.string().optional(),
  }),
  async execute({ leadId, outcome, recommendedNextAction }) {
    const lead = await setLeadOutcome(leadId, outcome, recommendedNextAction);
    return { ok: true as const, lead: leadSummary(lead) };
  },
});
