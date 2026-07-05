import { z } from "zod";

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

const qualificationSchema = z.object({
  scores: z.object({
    icpFit: z.number().min(0).max(10),
    buyingAuthority: z.number().min(0).max(10),
    productUsageOrIntent: z.number().min(0).max(10),
    engineeringMaturity: z.number().min(0).max(10),
    companyGrowth: z.number().min(0).max(10),
    businessImpact: z.number().min(0).max(10),
    overallPriority: z.number().min(0).max(10),
  }),
  verdict: z.enum(["qualified", "disqualified"]),
  rationale: z.string(),
});

const hypothesisItemSchema = z.object({
  statement: z.string(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()).min(1).max(3),
  engineeringPain: z.string(),
  businessImpact: z.string(),
});

const opportunityItemSchema = z.object({
  engineeringPain: z.string(),
  vercelCapability: z.string(),
  developerOutcome: z.string(),
  businessImpact: z.string(),
  estimatedRoi: z.string(),
  priority: z.union([z.literal(1), z.literal(2)]),
});

const messagingStrategySchema = z.object({
  messagingAngle: z.string(),
  technicalDepth: z.enum(["low", "medium", "high"]),
  tone: z.string(),
  story: z.string(),
  hooks: z.array(z.string()).min(1).max(2),
  cta: z.string(),
  customerExamples: z.array(z.string()).min(1).max(2),
  likelyObjections: z.array(z.string()).max(2),
});

const landingPageOpportunitySchema = z.object({
  title: z.string(),
  pain: z.string(),
  solution: z.string(),
  outcome: z.string(),
});

const landingPageStorySchema = z.object({
  company: z.string(),
  metric: z.string(),
  metricLabel: z.string(),
  summary: z.string(),
  url: z.string().url(),
});

const landingPageStatSchema = z.object({
  value: z.string(),
  label: z.string(),
});

const sequenceStepSchema = z.object({
  channel: z.string(),
  delayDays: z.number(),
  purpose: z.string(),
});

export const pipelineWriterOutputSchema = z.object({
  qualification: qualificationSchema,
  hypothesis: z.object({
    hypotheses: z.tuple([hypothesisItemSchema, hypothesisItemSchema]),
  }),
  opportunity_mapping: z.object({
    opportunities: z.tuple([opportunityItemSchema, opportunityItemSchema]),
  }),
  content_generation: z.object({
    messagingStrategy: messagingStrategySchema,
    landingPage: z.object({
      headline: z.string(),
      subheadline: z.string(),
      personalNote: z.string(),
      opportunities: z.tuple([
        landingPageOpportunitySchema,
        landingPageOpportunitySchema,
      ]),
      stories: z.array(landingPageStorySchema).min(1).max(2),
      stats: z.array(landingPageStatSchema).max(2),
      ctaLabel: z.string(),
      ctaUrl: z.string().url().optional(),
    }),
    subjectLines: z.array(z.string()).min(1).max(3),
    emailBody: z
      .string()
      .refine((value) => wordCount(value) <= 120, {
        message: "Email body must be 120 words or fewer.",
      }),
    cta: z.string(),
    objectionResponses: z.array(z.string()).max(2),
  }),
  sequence_planning: z.object({
    channels: z.array(z.string()).min(1).max(3),
    cadence: z.string(),
    timing: z.string(),
    steps: z.array(sequenceStepSchema).min(1).max(4),
    followUpLogic: z.string(),
    exitConditions: z.array(z.string()).min(1).max(4),
  }),
  recommendedNextAction: z.string(),
});

export type PipelineWriterOutput = z.infer<typeof pipelineWriterOutputSchema>;

export const PIPELINE_WRITER_MOCK_OUTPUT: PipelineWriterOutput = {
  qualification: {
    scores: {
      icpFit: 8,
      buyingAuthority: 7,
      productUsageOrIntent: 7,
      engineeringMaturity: 8,
      companyGrowth: 7,
      businessImpact: 8,
      overallPriority: 8,
    },
    verdict: "qualified",
    rationale:
      "Qualified because the account is engineering-led, shows product intent, and has clear web platform needs tied to growth.",
  },
  hypothesis: {
    hypotheses: [
      {
        statement:
          "The team needs to ship developer-facing pages and demos faster around new product launches.",
        confidence: 0.72,
        evidence: ["Pricing-page intent", "Engineering-led product motion"],
        engineeringPain:
          "Marketing, docs, and product teams wait on shared web release infrastructure.",
        businessImpact:
          "Faster launches can turn active product interest into qualified pipeline sooner.",
      },
      {
        statement:
          "The team likely wants a managed frontend platform instead of maintaining custom deployment plumbing.",
        confidence: 0.66,
        evidence: ["Modern web stack signals", "Growth-stage platform needs"],
        engineeringPain:
          "Senior engineers spend time on previews, deploys, and performance instead of core product.",
        businessImpact:
          "Reducing platform maintenance increases engineering leverage.",
      },
    ],
  },
  opportunity_mapping: {
    opportunities: [
      {
        engineeringPain:
          "Developer-facing pages and demos need to ship faster around launches.",
        vercelCapability:
          "Vercel Frontend Cloud with Git-connected deployments and preview URLs.",
        developerOutcome:
          "Teams can review and publish web changes without a custom release queue.",
        businessImpact:
          "Launch messaging reaches active evaluators while interest is high.",
        estimatedRoi:
          "Forrester TEI found teams shipped 4x more major site enhancements on Vercel.",
        priority: 1,
      },
      {
        engineeringPain:
          "Custom web platform maintenance distracts from core product work.",
        vercelCapability:
          "Managed global infrastructure, observability, and serverless compute.",
        developerOutcome:
          "Engineers get previews, performance defaults, and production hosting without owning infra.",
        businessImpact:
          "More senior engineering capacity stays focused on differentiated product work.",
        estimatedRoi:
          "Forrester TEI reported 90% less time managing frontend infrastructure.",
        priority: 2,
      },
    ],
  },
  content_generation: {
    messagingStrategy: {
      messagingAngle:
        "Help the team ship launch-critical web surfaces faster without owning frontend infrastructure.",
      technicalDepth: "low",
      tone: "Concise, peer-to-peer, and specific to the account.",
      story:
        "The account is already showing product intent, so the outreach should connect Vercel to faster launch execution.",
      hooks: ["Saw the pricing-page interest and the current product momentum."],
      cta: "Open to a short architecture chat?",
      customerExamples: ["Supabase", "Fern"],
      likelyObjections: ["Already have hosting", "Not evaluating right now"],
    },
    landingPage: {
      headline: "What this team could ship faster on Vercel",
      subheadline:
        "A short view of how Vercel can help launch web surfaces without adding platform overhead.",
      personalNote:
        "I pulled this together because your team appears to be evaluating frontend platform options.",
      opportunities: [
        {
          title: "Ship launch pages faster",
          pain: "Developer-facing pages and demos wait on release coordination.",
          solution: "Use Git-connected previews and managed production deploys.",
          outcome: "Review, iterate, and ship web changes faster.",
        },
        {
          title: "Reduce frontend infrastructure work",
          pain: "Custom hosting and preview workflows pull engineers from core product work.",
          solution: "Move frontend infrastructure defaults to Vercel.",
          outcome: "Keep senior engineering time focused on differentiated work.",
        },
      ],
      stories: [
        {
          company: "Supabase",
          metric: "Fast shipping",
          metricLabel: "developer experience",
          summary:
            "Supabase uses Next.js and Vercel to ship docs, marketing, and product surfaces quickly.",
          url: "https://vercel.com/customers/how-supabase-elevated-their-developer-experience-with-turborepo",
        },
        {
          company: "Fern",
          metric: "3x",
          metricLabel: "faster TTFB",
          summary:
            "Fern improved performance for multi-tenant documentation on Vercel.",
          url: "https://vercel.com/customers/how-fern-runs-multi-tenant-docs-for-webflow-and-elevenlabs-on-vercel",
        },
      ],
      stats: [
        {
          value: "264%",
          label: "three-year ROI in Forrester TEI",
        },
      ],
      ctaLabel: "Talk through the architecture",
    },
    subjectLines: ["Faster launch surfaces", "Vercel for launch velocity"],
    emailBody:
      "Hi there - saw the pricing-page interest and figured a specific note would be more useful than a generic follow-up. Vercel could help your team ship launch pages, docs updates, and product demos faster without maintaining custom frontend infrastructure. I put together a short page with the two areas that look most relevant: {{landingPageUrl}} Would it be useful to compare this against your current web release setup?",
    cta: "Would it be useful to compare this against your current web release setup?",
    objectionResponses: [
      "If they already have hosting, focus on previews and release speed.",
      "If they are not evaluating now, leave the page as a useful reference.",
    ],
  },
  sequence_planning: {
    channels: ["email", "LinkedIn"],
    cadence: "Light-touch first email, one LinkedIn touch, then one concise follow-up.",
    timing: "Start in the recipient's morning send window.",
    steps: [
      {
        channel: "email",
        delayDays: 0,
        purpose: "Share the personalized page and ask for a short architecture chat.",
      },
      {
        channel: "LinkedIn",
        delayDays: 4,
        purpose: "Soft reminder tied to the same launch-speed angle.",
      },
      {
        channel: "email",
        delayDays: 7,
        purpose: "One concise follow-up, then pause if there is no engagement.",
      },
    ],
    followUpLogic:
      "If the buyer replies or clicks, route to a human. If there is no engagement after the second email, pause.",
    exitConditions: ["Reply received", "Negative response", "No engagement after final touch"],
  },
  recommendedNextAction:
    "Review the drafted email in the Inbox and prioritize follow-up if the buyer engages with the personalized page.",
};
