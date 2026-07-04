import { defineAgent } from "eve";
import { z } from "zod";

const researchBriefSchema = z.object({
  company: z.object({
    name: z.string(),
    industry: z.string().optional(),
    employeeCount: z.string().optional(),
    funding: z.string().optional(),
    techStack: z.array(z.string()),
    recentNews: z.array(z.string()),
    growthSignals: z.array(z.string()),
    sources: z.array(z.string()),
  }),
  person: z.object({
    name: z.string(),
    title: z.string().optional(),
    seniority: z.string().optional(),
    technicalBackground: z.string().optional(),
    decisionMakingAuthority: z.string().optional(),
    sources: z.array(z.string()),
  }),
  initiatives: z.array(z.string()),
  aiInitiatives: z.array(z.string()),
  priorities: z.array(z.string()),
  summary: z.string(),
  sources: z.array(z.string()),
});

export default defineAgent({
  description:
    "Fast, focused web research on a company and contact. Returns a compact research brief for GTM qualification and personalization.",
  // Haiku keeps research turns fast; the brief is simple enough not to need Sonnet.
  model: "anthropic/claude-haiku-4.5",
  reasoning: "low",
  outputSchema: researchBriefSchema,
  limits: {
    maxInputTokensPerSession: 150_000,
    maxOutputTokensPerSession: 20_000,
  },
});
