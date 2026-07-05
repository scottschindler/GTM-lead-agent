import { defineAgent } from "eve";
import { mockModel } from "eve/evals";

const realModel = "openai/gpt-5.4-mini";

const evalModel = mockModel({
  // Use a known gateway identity so compaction metadata resolves in eval mode.
  provider: "openai",
  modelId: "gpt-5.4-mini",
  respond({ lastUserMessage, toolResults }) {
    const message = lastUserMessage ?? "";

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

    return "Eval fixture received an unknown prompt.";
  },
});

export default defineAgent({
  model: process.env.EVE_EVAL_MOCK === "1" ? evalModel : realModel,
  reasoning: "medium",
  limits: {
    maxInputTokensPerSession: 2_000_000,
    maxOutputTokensPerSession: 150_000,
    maxSubagentDepth: 2,
  },
});
