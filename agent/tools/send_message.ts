import { defineTool } from "eve/tools";
import { z } from "zod";

import {
  computeSendWindow,
  getLead,
  leadSummary,
  saveStageOutput,
} from "../lib/store";
import type { ContentGenerationOutput } from "../lib/types";

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
  async execute({ leadId, subject, body, cta, timezone }) {
    const lead = await getLead(leadId);
    if (!lead) {
      return { ok: false as const, error: `Lead not found: ${leadId}` };
    }

    const sendWindow = computeSendWindow(
      timezone ?? lead.timezone ?? "America/Los_Angeles",
    );

    // Drafts always start as "drafted". A BDR approves or denies them in the
    // Inbox — approval is what gates the send status.
    const send = {
      status: "drafted" as const,
      subject,
      body,
      cta,
      sendWindow,
    };

    const existing = (lead.stages.content_generation?.output ??
      {}) as Partial<ContentGenerationOutput>;
    const output: ContentGenerationOutput = {
      subjectLines: existing.subjectLines ?? [subject],
      emailBody: existing.emailBody ?? body,
      cta: existing.cta ?? cta,
      objectionResponses: existing.objectionResponses ?? [],
      landingPageSlug: existing.landingPageSlug,
      landingPageUrl: existing.landingPageUrl,
      send,
    };

    const updated = await saveStageOutput(leadId, "content_generation", output);
    return {
      ok: true as const,
      delivered: false as const,
      message:
        "Draft recorded and queued for BDR review in the Inbox. Email was not delivered.",
      lead: leadSummary(updated),
      output: send,
    };
  },
});
