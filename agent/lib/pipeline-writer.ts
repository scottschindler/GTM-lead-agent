import type { PipelineWriterOutput } from "./stage-schemas";

export { pipelineWriterOutputSchema } from "./stage-schemas";
export type { PipelineWriterOutput } from "./stage-schemas";

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
