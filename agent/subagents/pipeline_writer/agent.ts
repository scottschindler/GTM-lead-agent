import { defineAgent } from "eve";
import { mockModel } from "eve/evals";
import { z } from "zod";

import { PIPELINE_WRITER_MOCK_OUTPUT } from "../../lib/pipeline-writer";

const pipelineWriterReceiptSchema = z.object({
  saved: z.boolean(),
  leadId: z.string(),
  verdict: z.enum(["qualified", "disqualified"]).optional(),
  savedStages: z.array(z.string()).default([]),
  skippedStages: z.array(z.string()).default([]),
  landingPageUrl: z.string().optional(),
  draftQueued: z.boolean().default(false),
  recommendedNextAction: z.string().optional(),
});

const evalModel = mockModel({
  provider: "anthropic",
  modelId: "claude-haiku-4.5",
  respond({ toolResults }) {
    if (toolResults.length === 0) {
      return {
        toolCalls: [
          {
            name: "persist_pipeline_payload",
            input: {
              leadId: "lead_eval_full",
              payload: PIPELINE_WRITER_MOCK_OUTPUT,
            },
          },
        ],
      };
    }

    const receipt = toolResults[toolResults.length - 1]?.output as
      | {
          ok?: boolean;
          leadId?: string;
          verdict?: "qualified" | "disqualified";
          savedStages?: string[];
          skippedStages?: string[];
          landingPageUrl?: string;
          draftQueued?: boolean;
          recommendedNextAction?: string;
        }
      | undefined;

    return {
      toolCalls: [
        {
          name: "final_output",
          input: {
            saved: receipt?.ok === true,
            leadId: receipt?.leadId ?? "lead_eval_full",
            verdict: receipt?.verdict,
            savedStages: receipt?.savedStages ?? [],
            skippedStages: receipt?.skippedStages ?? [],
            landingPageUrl: receipt?.landingPageUrl,
            draftQueued: receipt?.draftQueued ?? false,
            recommendedNextAction: receipt?.recommendedNextAction,
          },
        },
      ],
    };
  },
});

export default defineAgent({
  description:
    "Fast internal pipeline writer. Converts a compact lead and research brief into the structured JSON payloads for qualification, hypothesis, opportunity mapping, content generation, sequence planning, and next action. Persists the payload through persist_pipeline_payload and returns a compact receipt. Parent agents should call this with message only and must not pass outputSchema.",
  model:
    process.env.EVE_EVAL_MOCK === "1"
      ? evalModel
      : "anthropic/claude-haiku-4.5",
  reasoning: "none",
  outputSchema: pipelineWriterReceiptSchema,
  limits: {
    maxInputTokensPerSession: 120_000,
    maxOutputTokensPerSession: 18_000,
    maxSubagentDepth: 1,
  },
});
