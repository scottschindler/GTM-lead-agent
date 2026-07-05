import { defineAgent } from "eve";
import { mockModel } from "eve/evals";

import { PIPELINE_WRITER_MOCK_OUTPUT } from "./lib/pipeline-writer";

const realModel = "anthropic/claude-sonnet-5";

type ToolResult = {
  name: string;
  output: unknown;
};

function toolResultCount(toolResults: readonly ToolResult[], name: string): number {
  return toolResults.filter((result) => result.name === name).length;
}

function latestToolOutput<T>(
  toolResults: readonly ToolResult[],
  name: string,
): T | undefined {
  return toolResults.findLast((result) => result.name === name)?.output as
    | T
    | undefined;
}

function fullEvalContentOutput(landingPage?: {
  slug?: string;
  url?: string;
}) {
  const content = PIPELINE_WRITER_MOCK_OUTPUT.content_generation;
  const landingPageUrl = landingPage?.url ?? "https://example.com/for/eval";
  return {
    messagingStrategy: content.messagingStrategy,
    subjectLines: content.subjectLines,
    emailBody: content.emailBody.replace("{{landingPageUrl}}", landingPageUrl),
    cta: content.cta,
    objectionResponses: content.objectionResponses,
    landingPageSlug: landingPage?.slug ?? "eval-page",
    landingPageUrl,
  };
}

const evalModel = mockModel({
  // Use a known gateway identity so compaction metadata resolves in eval mode.
  provider: "anthropic",
  modelId: "claude-sonnet-5",
  respond({ lastUserMessage, toolResults }) {
    const message = lastUserMessage ?? "";
    const results = toolResults as readonly ToolResult[];

    if (message.includes("SMOKE_EVAL")) {
      if (toolResults.length === 0) {
        return {
          toolCalls: [
            {
              name: "create_lead",
              input: {
                id: "lead_eval_smoke",
                name: "Eval User",
                email: "eval-smoke@example.com",
                company: "Example",
                companyDomain: "example.com",
                source: "eval",
              },
            },
          ],
        };
      }

      if (toolResults.length === 1) {
        const leadId =
          (toolResults[0]?.output as { lead?: { id?: string } } | undefined)
            ?.lead?.id ?? "lead_eval_smoke";
        return {
          toolCalls: [
            {
              name: "save_stage_output",
              input: {
                leadId,
                stage: "qualification",
                output: {
                  scores: {
                    icpFit: 8,
                    buyingAuthority: 7,
                    productUsageOrIntent: 6,
                    engineeringMaturity: 8,
                    companyGrowth: 7,
                    businessImpact: 8,
                    overallPriority: 8,
                  },
                  verdict: "qualified",
                  rationale: "Deterministic smoke eval qualification.",
                },
              },
            },
          ],
        };
      }

      return "Smoke pipeline stage saved.";
    }

    if (message.includes("SAFETY_EVAL")) {
      if (toolResults.length === 0) {
        return {
          toolCalls: [
            {
              name: "create_lead",
              input: {
                id: "lead_eval_safety",
                name: "Eval User",
                email: "eval-safety@example.com",
                company: "Example",
                companyDomain: "example.com",
                source: "eval",
              },
            },
          ],
        };
      }

      if (toolResults.length === 1) {
        return {
          toolCalls: [
            {
              name: "send_message",
              input: {
                leadId: "lead_eval_safety",
                subject: "Safety eval subject",
                body: "Safety eval body",
                cta: "Reply if useful",
              },
            },
          ],
        };
      }

      return "Send tool finished.";
    }

    if (message.includes("FULL_PIPELINE_EVAL")) {
      if (toolResultCount(results, "create_lead") === 0) {
        return {
          toolCalls: [
            {
              name: "create_lead",
              input: {
                id: "lead_eval_full",
                name: "Eval User",
                email: "eval-full@example.com",
                company: "Example",
                companyDomain: "example.com",
                source: "eval",
              },
            },
          ],
        };
      }

      if (toolResultCount(results, "get_lead") === 0) {
        return {
          toolCalls: [
            {
              name: "get_lead",
              input: { leadId: "lead_eval_full" },
            },
          ],
        };
      }

      if (toolResultCount(results, "researcher") === 0) {
        return {
          toolCalls: [
            {
              name: "researcher",
              input: {
                message:
                  "canonical_lead_id: lead_eval_full. Research Eval User at Example quickly and save the compact research brief. The email is contact metadata, not a lead id.",
              },
            },
          ],
        };
      }

      if (toolResultCount(results, "qualify_lead") === 0) {
        return {
          toolCalls: [
            {
              name: "qualify_lead",
              input: { leadId: "lead_eval_full" },
            },
          ],
        };
      }

      if (toolResultCount(results, "pipeline_writer") === 0) {
        return {
          toolCalls: [
            {
              name: "pipeline_writer",
              input: {
                message:
                  "Use the saved compact research for lead_eval_full and return the full pipeline writer output with exactly 2 hypotheses and 2 opportunities.",
              },
            },
          ],
        };
      }

      const stageSaves = toolResultCount(results, "save_stage_output");
      if (stageSaves === 0) {
        return {
          toolCalls: [
            {
              name: "save_stage_output",
              input: {
                leadId: "lead_eval_full",
                stage: "hypothesis",
                output: PIPELINE_WRITER_MOCK_OUTPUT.hypothesis,
              },
            },
          ],
        };
      }

      if (stageSaves === 1) {
        return {
          toolCalls: [
            {
              name: "save_stage_output",
              input: {
                leadId: "lead_eval_full",
                stage: "opportunity_mapping",
                output: PIPELINE_WRITER_MOCK_OUTPUT.opportunity_mapping,
              },
            },
          ],
        };
      }

      if (stageSaves === 2) {
        return {
          toolCalls: [
            {
              name: "save_stage_output",
              input: {
                leadId: "lead_eval_full",
                stage: "sequence_planning",
                output: PIPELINE_WRITER_MOCK_OUTPUT.sequence_planning,
              },
            },
          ],
        };
      }

      if (toolResultCount(results, "create_landing_page") === 0) {
        const landingPage = PIPELINE_WRITER_MOCK_OUTPUT.content_generation
          .landingPage;
        return {
          toolCalls: [
            {
              name: "create_landing_page",
              input: {
                leadId: "lead_eval_full",
                ...landingPage,
              },
            },
          ],
        };
      }

      if (stageSaves === 3) {
        const landingPage = latestToolOutput<{
          slug?: string;
          url?: string;
        }>(results, "create_landing_page");
        return {
          toolCalls: [
            {
              name: "save_stage_output",
              input: {
                leadId: "lead_eval_full",
                stage: "content_generation",
                output: fullEvalContentOutput(landingPage),
              },
            },
          ],
        };
      }

      if (toolResultCount(results, "send_message") === 0) {
        const landingPage = latestToolOutput<{
          slug?: string;
          url?: string;
        }>(results, "create_landing_page");
        const content = fullEvalContentOutput(landingPage);
        return {
          toolCalls: [
            {
              name: "send_message",
              input: {
                leadId: "lead_eval_full",
                subject: content.subjectLines[0],
                body: content.emailBody,
                cta: content.cta,
              },
            },
          ],
        };
      }

      if (toolResultCount(results, "set_lead_outcome") === 0) {
        return {
          toolCalls: [
            {
              name: "set_lead_outcome",
              input: {
                leadId: "lead_eval_full",
                outcome: "nurture",
                recommendedNextAction:
                  PIPELINE_WRITER_MOCK_OUTPUT.recommendedNextAction,
              },
            },
          ],
        };
      }

      return "Full pipeline eval complete.";
    }

    if (message.includes("DISQUALIFY_EVAL")) {
      if (toolResultCount(results, "create_lead") === 0) {
        return {
          toolCalls: [
            {
              name: "create_lead",
              input: {
                id: "lead_eval_disqualified",
                name: "Eval Competitor",
                email: "eval-competitor@cloudflare.com",
                company: "Cloudflare",
                companyDomain: "cloudflare.com",
                source: "pricing-page",
              },
            },
          ],
        };
      }

      if (toolResultCount(results, "get_lead") === 0) {
        return {
          toolCalls: [
            {
              name: "get_lead",
              input: { leadId: "lead_eval_disqualified" },
            },
          ],
        };
      }

      if (toolResultCount(results, "researcher") === 0) {
        return {
          toolCalls: [
            {
              name: "researcher",
              input: {
                message:
                  "canonical_lead_id: lead_eval_disqualified. Research Eval Competitor at Cloudflare quickly and save the compact research brief. The email is contact metadata, not a lead id.",
              },
            },
          ],
        };
      }

      if (toolResultCount(results, "qualify_lead") === 0) {
        return {
          toolCalls: [
            {
              name: "qualify_lead",
              input: { leadId: "lead_eval_disqualified" },
            },
          ],
        };
      }

      if (toolResultCount(results, "set_lead_outcome") === 0) {
        return {
          toolCalls: [
            {
              name: "set_lead_outcome",
              input: {
                leadId: "lead_eval_disqualified",
                outcome: "disqualified",
                recommendedNextAction:
                  "Do not pursue as a sales prospect because the account is a direct platform competitor.",
              },
            },
          ],
        };
      }

      return "Disqualified pipeline eval complete.";
    }

    return "Eval fixture received an unknown prompt.";
  },
});

export default defineAgent({
  model: process.env.EVE_EVAL_MOCK === "1" ? evalModel : realModel,
  reasoning: "low",
  limits: {
    maxInputTokensPerSession: 2_000_000,
    maxOutputTokensPerSession: 150_000,
    maxSubagentDepth: 2,
  },
});
