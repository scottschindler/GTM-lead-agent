import { defineAgent } from "eve";
import { mockModel } from "eve/evals";

const realModel = "anthropic/claude-sonnet-5";

type ToolResult = {
  name: string;
  output: unknown;
};

function toolResultCount(toolResults: readonly ToolResult[], name: string): number {
  return toolResults.filter((result) => result.name === name).length;
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

      if (toolResultCount(results, "pipeline_writer") === 0) {
        return {
          toolCalls: [
            {
              name: "pipeline_writer",
              input: {
                message:
                  "Use the saved compact research for lead_eval_full. Compose the downstream payload stage by stage, call persist_stage_payload in pipeline order, and return the compact receipt.",
              },
            },
          ],
        };
      }

      if (toolResultCount(results, "set_lead_outcome") === 0) {
        const writerReceipt = results.findLast(
          (result) => result.name === "pipeline_writer",
        )?.output as
          | {
              verdict?: "qualified" | "disqualified";
              recommendedNextAction?: string;
            }
          | undefined;
        return {
          toolCalls: [
            {
              name: "set_lead_outcome",
              input: {
                leadId: "lead_eval_full",
                outcome:
                  writerReceipt?.verdict === "disqualified"
                    ? "disqualified"
                    : "nurture",
                recommendedNextAction:
                  writerReceipt?.recommendedNextAction ??
                  "Review the drafted email in the Inbox and prioritize follow-up if the buyer engages with the personalized page.",
              },
            },
          ],
        };
      }

      return "Full pipeline eval complete.";
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
