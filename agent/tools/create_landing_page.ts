import { defineTool } from "eve/tools";
import { z } from "zod";

import { inSessionWorkspace } from "../lib/workspace";

import { createLandingPageForLead } from "../lib/landing-page";
import { assertRunIsCurrent, rootSessionIdOf } from "../lib/run-guard";
import { landingPagePayloadSchema } from "../lib/stage-schemas";
import {
  getLead,
  readPipelineConfig,
} from "../lib/store";

export default defineTool({
  description:
    "Create a unique, personalized Vercel-branded landing page for a lead and return its URL. Call this during content generation, before drafting the email, so the email can link to the page. All content must be grounded in research, opportunities, and real customer stories.",
  inputSchema: landingPagePayloadSchema.extend({
    leadId: z.string().min(1),
  }),
  async execute(input, ctx) {
    return inSessionWorkspace(ctx.session, async () => {
      await assertRunIsCurrent(rootSessionIdOf(ctx.session));

      const config = await readPipelineConfig();
      if (!config.landingPages) {
        return {
          ok: false as const,
          error:
            "Personalized landing pages are disabled in the pipeline config. Draft the email without a landing page link and continue.",
        };
      }

      const lead = await getLead(input.leadId);
      if (!lead) {
        return { ok: false as const, error: `Lead not found: ${input.leadId}` };
      }

      const { slug, url } = await createLandingPageForLead(lead, input);

      return {
        ok: true as const,
        slug,
        url,
        message: `Personalized landing page created. Include this exact URL in the outreach email, then save content_generation once with the email body, landingPageSlug, landingPageUrl, and send draft: ${url}`,
      };
    });
  },
});
