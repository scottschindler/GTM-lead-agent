import { defineAgent } from "eve";
import { mockModel } from "eve/evals";

import {
  PIPELINE_WRITER_MOCK_OUTPUT,
  pipelineWriterOutputSchema,
} from "../../lib/pipeline-writer";

const evalModel = mockModel({
  provider: "anthropic",
  modelId: "claude-haiku-4.5",
  respond: () => ({
    toolCalls: [
      {
        name: "final_output",
        input: PIPELINE_WRITER_MOCK_OUTPUT,
      },
    ],
  }),
});

export default defineAgent({
  description:
    "Fast internal pipeline writer. Converts a compact lead and research brief into the structured JSON payloads for qualification, hypothesis, opportunity mapping, content generation, sequence planning, and next action. Does not call tools or persist data.",
  model:
    process.env.EVE_EVAL_MOCK === "1"
      ? evalModel
      : "anthropic/claude-haiku-4.5",
  reasoning: "none",
  outputSchema: pipelineWriterOutputSchema,
  limits: {
    maxInputTokensPerSession: 120_000,
    maxOutputTokensPerSession: 18_000,
    maxSubagentDepth: 1,
  },
});
