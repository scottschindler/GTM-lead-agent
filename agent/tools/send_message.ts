import { defineTool } from "eve/tools";
import { z } from "zod";

import { inSessionWorkspace } from "../lib/workspace";

import { assertRunIsCurrent, rootSessionIdOf } from "../lib/run-guard";
import {
  getLead,
  leadSummary,
  queueSendDraft,
} from "../lib/store";

export default defineTool({
  description:
    "Record an outbound outreach draft for a lead. Does not deliver email — computes the optimized send window and queues the draft on the content_generation stage for BDR review in the Inbox.",
  inputSchema: z.object({
    leadId: z.string().min(1),
    subject: z.string().min(1),
    body: z.string().min(1),
    cta: z.string().min(1),
    timezone: z.string().optional(),
  }),
  async execute({ leadId, subject, body, cta, timezone }, ctx) {
    return inSessionWorkspace(ctx.session, async () => {
      await assertRunIsCurrent(rootSessionIdOf(ctx.session));

      const lead = await getLead(leadId);
      if (!lead) {
        return { ok: false as const, error: `Lead not found: ${leadId}` };
      }

      const { lead: updated, send } = await queueSendDraft(leadId, {
        subject,
        body,
        cta,
        timezone,
      });
      return {
        ok: true as const,
        delivered: false as const,
        message:
          "Draft recorded and queued for BDR review in the Inbox. Email was not delivered.",
        lead: leadSummary(updated),
        output: send,
      };
    });
  },
});
