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

const MOCK_STAGE_ORDER = [
  "qualification",
  "hypothesis",
  "opportunity_mapping",
  "content_generation",
  "sequence_planning",
] as const;

type MockPersistReceipt = {
  ok?: boolean;
  stage?: string;
  saved?: boolean;
  skipped?: boolean;
  verdict?: "qualified" | "disqualified";
  landingPageUrl?: string;
  draftQueued?: boolean;
  proceed?: boolean;
};

const evalModel = mockModel({
  provider: "anthropic",
  modelId: "claude-haiku-4.5",
  respond({ toolResults }) {
    const receipts = toolResults
      .filter((result) => result.name === "persist_stage_payload")
      .map((result) => result.output as MockPersistReceipt);
    const lastReceipt = receipts[receipts.length - 1];
    const stopped = lastReceipt?.proceed === false;

    if (!stopped && receipts.length < MOCK_STAGE_ORDER.length) {
      const stage = MOCK_STAGE_ORDER[receipts.length];
      return {
        toolCalls: [
          {
            name: "persist_stage_payload",
            input: {
              leadId: "lead_eval_full",
              stage,
              output: PIPELINE_WRITER_MOCK_OUTPUT[stage],
            },
          },
        ],
      };
    }

    const contentReceipt = receipts.find(
      (receipt) => receipt.stage === "content_generation",
    );
    return {
      toolCalls: [
        {
          name: "final_output",
          input: {
            saved: receipts.length > 0 && receipts.every((r) => r.ok === true),
            leadId: "lead_eval_full",
            verdict: receipts.find((r) => r.verdict)?.verdict,
            savedStages: receipts
              .filter((r) => r.saved)
              .map((r) => r.stage ?? ""),
            skippedStages: receipts
              .filter((r) => r.skipped)
              .map((r) => r.stage ?? ""),
            landingPageUrl: contentReceipt?.landingPageUrl,
            draftQueued: contentReceipt?.draftQueued ?? false,
            recommendedNextAction:
              PIPELINE_WRITER_MOCK_OUTPUT.recommendedNextAction,
          },
        },
      ],
    };
  },
});

export default defineAgent({
  description:
    "Fast internal pipeline writer. Converts a compact lead and research brief into the structured JSON payloads for qualification, hypothesis, opportunity mapping, content generation, sequence planning, and next action. Persists each stage in pipeline order through persist_stage_payload and returns a compact receipt. Parent agents should call this with message only and must not pass outputSchema.",
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
