import { defineTool } from "eve/tools";
import { z } from "zod";

import { inSessionWorkspace } from "../lib/workspace";

import { assertRunIsCurrent, rootSessionIdOf } from "../lib/run-guard";
import {
  isStageEnabled,
  leadSummary,
  markStageSkipped,
  resolveLeadReference,
  saveStageOutput,
} from "../lib/store";
import type { QualificationOutput, ResearchBrief } from "../lib/types";

const DIRECT_COMPETITORS = [
  {
    domain: "cloudflare.com",
    label: "Cloudflare",
    reason:
      "Cloudflare Workers, CDN, security, and edge platform directly compete with Vercel's frontend and edge platform motion.",
  },
  {
    domain: "netlify.com",
    label: "Netlify",
    reason:
      "Netlify is a direct frontend cloud and deployment platform competitor.",
  },
  {
    domain: "render.com",
    label: "Render",
    reason:
      "Render is an application hosting and deployment platform competitor.",
  },
  {
    domain: "fly.io",
    label: "Fly.io",
    reason:
      "Fly.io is an application deployment and edge infrastructure competitor.",
  },
  {
    domain: "railway.app",
    label: "Railway",
    reason:
      "Railway is an application deployment platform competitor.",
  },
] as const;

function normalizedDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function textList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.flatMap((item) => (typeof item === "string" ? [item] : []))
    : [];
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(10, Math.round(value)));
}

function titleAuthority(title: string): number {
  const lower = title.toLowerCase();
  if (/\b(ceo|chief|founder|co-founder|president|chair|cto|cio|cpo)\b/.test(lower)) {
    return 9;
  }
  if (/\b(vp|svp|evp|head|general manager)\b/.test(lower)) return 8;
  if (/\b(director|lead|principal|architect)\b/.test(lower)) return 7;
  if (/\b(manager|engineer|developer|marketing|growth)\b/.test(lower)) return 5;
  return 6;
}

function sourceIntent(source: string): number {
  const lower = source.toLowerCase();
  if (lower.includes("pricing")) return 8;
  if (lower.includes("docs")) return 6;
  if (lower.includes("product")) return 6;
  if (lower.includes("newsletter")) return 4;
  return 5;
}

function researchForScoring(research?: ResearchBrief): string {
  if (!research) return "";
  return [
    research.summary,
    research.company?.industry,
    research.company?.funding,
    research.company?.engineeringTeamSize,
    ...textList(research.company?.techStack),
    ...textList(research.company?.growthSignals),
    ...textList(research.company?.recentNews),
    research.person?.title,
    research.person?.team,
    research.person?.seniority,
    ...textList(research.initiatives),
    ...textList(research.aiInitiatives),
    ...textList(research.architectureNotes),
    ...textList(research.priorities),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function competitorMatch(domain: string, haystack: string) {
  return DIRECT_COMPETITORS.find(
    (competitor) =>
      domain === competitor.domain ||
      domain.endsWith(`.${competitor.domain}`) ||
      haystack.includes(competitor.label.toLowerCase()),
  );
}

function buildQualification(
  lead: {
    company: string;
    companyDomain: string;
    source: string;
    name: string;
  },
  research?: ResearchBrief,
): { output: QualificationOutput; recommendedNextAction: string } {
  const domain = normalizedDomain(lead.companyDomain);
  const personTitle = text(research?.person?.title);
  const haystack = [
    lead.company,
    lead.companyDomain,
    lead.source,
    personTitle,
    researchForScoring(research),
  ]
    .join(" ")
    .toLowerCase();

  const competitor = competitorMatch(domain, haystack);
  const buyingAuthority = titleAuthority(personTitle);

  if (competitor) {
    return {
      output: {
        scores: {
          icpFit: 2,
          buyingAuthority,
          productUsageOrIntent: Math.min(sourceIntent(lead.source), 3),
          engineeringMaturity: 9,
          companyGrowth: 7,
          businessImpact: 2,
          overallPriority: 3,
        },
        verdict: "disqualified",
        rationale: `${lead.company} is a direct or near-direct infrastructure competitor to Vercel. ${competitor.reason} Even with ${personTitle || lead.name} as a high-authority contact and a ${lead.source} source signal, this is not a normal sales prospect because the account builds and sells competing infrastructure. Do not spend downstream pipeline time on hypotheses, landing pages, or outreach.`,
      },
      recommendedNextAction:
        "Do not pursue as a sales prospect. Keep only a partnership or ecosystem-watch note if relevant.",
    };
  }

  const hasModernWebSignal =
    /\b(next\.?js|react|frontend|docs|developer|serverless|edge|ai sdk|vercel)\b/.test(
      haystack,
    );
  const hasAiSignal = /\b(ai|agent|llm|machine learning|ml|automation)\b/.test(
    haystack,
  );
  const hasGrowthSignal =
    /\b(growth|funding|launch|expansion|hiring|enterprise|global)\b/.test(
      haystack,
    );

  const productUsageOrIntent = sourceIntent(lead.source);
  const icpFit = clampScore(
    5 + (hasModernWebSignal ? 2 : 0) + (hasAiSignal ? 1 : 0),
  );
  const engineeringMaturity = clampScore(
    5 + (hasModernWebSignal ? 2 : 0) + (hasAiSignal ? 1 : 0),
  );
  const companyGrowth = clampScore(5 + (hasGrowthSignal ? 2 : 0));
  const businessImpact = clampScore(
    5 + (productUsageOrIntent >= 6 ? 2 : 0) + (icpFit >= 7 ? 1 : 0),
  );
  const overallPriority = clampScore(
    (icpFit +
      buyingAuthority +
      productUsageOrIntent +
      engineeringMaturity +
      companyGrowth +
      businessImpact) /
      6,
  );
  const verdict =
    overallPriority < 4 || icpFit < 3 || engineeringMaturity < 4
      ? "disqualified"
      : "qualified";

  return {
    output: {
      scores: {
        icpFit,
        buyingAuthority,
        productUsageOrIntent,
        engineeringMaturity,
        companyGrowth,
        businessImpact,
        overallPriority,
      },
      verdict,
      rationale: `${lead.company} is scored from the saved research brief and source signal. ICP fit is ${icpFit}/10 based on ${hasModernWebSignal ? "modern web/developer-platform signals" : "limited visible web-platform evidence"}. Buying authority is ${buyingAuthority}/10${personTitle ? ` from the visible title "${personTitle}"` : ""}. Product intent is ${productUsageOrIntent}/10 from source "${lead.source}". Overall priority is ${overallPriority}/10, so the lead is ${verdict}.`,
    },
    recommendedNextAction:
      verdict === "qualified"
        ? "Continue to hypothesis, opportunity mapping, content generation, and sequence planning."
        : "Do not continue pipeline stages unless a stronger buying or platform-fit signal appears.",
  };
}

export default defineTool({
  description:
    "Fast deterministic qualification gate. Reads the saved research brief and lead metadata, saves the qualification stage, and returns the verdict. Call immediately after research and before any pipeline_writer or downstream strategy work.",
  inputSchema: z.object({
    leadId: z.string().min(1),
  }),
  async execute({ leadId }, ctx) {
    return inSessionWorkspace(ctx.session, async () => {
      await assertRunIsCurrent(rootSessionIdOf(ctx.session));

      const resolution = await resolveLeadReference(leadId);
      const lead = resolution.lead;
      if (!lead) {
        return {
          ok: false as const,
          error: resolution.ambiguousCandidates?.length
            ? `Lead reference "${leadId}" matched multiple leads: ${resolution.ambiguousCandidates.join(", ")}. Use the exact lead id.`
            : `Lead not found: ${leadId}`,
        };
      }

      if (!(await isStageEnabled("qualification"))) {
        const skipped = await markStageSkipped(
          lead.id,
          "qualification",
          "Stage qualification disabled in pipeline config",
        );
        return {
          ok: true as const,
          skipped: true as const,
          lead: leadSummary(skipped),
        };
      }

      const research = lead.stages.research.output as ResearchBrief | undefined;
      const result = buildQualification(lead, research);
      const saved = await saveStageOutput(
        lead.id,
        "qualification",
        result.output,
      );

      return {
        ok: true as const,
        skipped: false as const,
        output: result.output,
        recommendedNextAction: result.recommendedNextAction,
        lead: leadSummary(saved),
      };
    });
  },
});
