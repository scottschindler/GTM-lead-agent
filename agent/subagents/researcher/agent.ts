import { defineAgent } from "eve";
import { mockModel } from "eve/evals";
import { z } from "zod";

// The full brief is persisted by the save_research_brief tool; the subagent
// returns only this compact receipt so the foreman never has to re-emit the
// brief through a slow model turn.
const researchResultSchema = z.object({
  saved: z.boolean(),
  leadId: z.string(),
  summary: z.string(),
  techStack: z.array(z.string()),
  personTitle: z.string().optional(),
});

const evalBrief = {
  company: {
    name: "Example",
    industry: "Developer tools",
    techStack: ["Next.js", "React"],
    sources: ["https://example.com"],
  },
  person: {
    name: "Eval User",
    title: "Founder",
    sources: ["https://example.com"],
  },
  initiatives: ["Evaluating frontend platform options"],
  productLaunches: [],
  aiInitiatives: [],
  hiringTrends: [],
  architectureNotes: ["Modern web stack"],
  competitors: [],
  priorities: ["Ship web surfaces faster"],
  summary:
    "Example is a developer-tools company evaluating frontend platform options.",
  sources: ["https://example.com"],
};

const evalModel = mockModel({
  provider: "anthropic",
  modelId: "claude-haiku-4.5",
  respond({ toolResults }) {
    if (toolResults.length === 0) {
      return {
        toolCalls: [
          {
            name: "save_research_brief",
            input: {
              leadId: "lead_eval_full",
              brief: evalBrief,
            },
          },
        ],
      };
    }

    return {
      toolCalls: [
        {
          name: "final_output",
          input: {
            saved: true,
            leadId: "lead_eval_full",
            summary: evalBrief.summary,
            techStack: evalBrief.company.techStack,
            personTitle: evalBrief.person.title,
          },
        },
      ],
    };
  },
});

export default defineAgent({
  description:
    "Fast, focused web research on a company and contact. Persists the research brief for the lead itself and returns a short receipt with the summary.",
  // Haiku keeps research turns fast; the brief is simple enough not to need Sonnet.
  model:
    process.env.EVE_EVAL_MOCK === "1"
      ? evalModel
      : "anthropic/claude-haiku-4.5",
  // The protocol is fully prescribed in instructions; thinking tokens on every
  // turn are pure latency here.
  reasoning: "none",
  outputSchema: researchResultSchema,
  limits: {
    maxInputTokensPerSession: 150_000,
    maxOutputTokensPerSession: 20_000,
  },
});
