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
    "Fast internal pipeline writer for qualified leads. Converts a compact lead, research brief, and saved qualification into structured JSON payloads for hypothesis, opportunity mapping, content generation, sequence planning, and next action. Does not call tools or persist data. Parent agents should call this with message only and must not pass outputSchema because this agent already declares the required schema.",
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
