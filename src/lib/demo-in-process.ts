import type { Lead } from "../../agent/lib/types";

// Demo data for the Dashboard "In process" panel: leads where the full
// pipeline already ran, the send was approved and released, and the agent is
// now working the outreach sequence while we wait to hear back.
// Shapes mirror the sequence_planning stage output (day-based touches,
// weekday send windows, exit conditions) and the engagement_intent stage
// output (intentScore, confidence, signalBreakdown, recommendedNextAction,
// events), so real agent data can replace this without reshaping the UI.
// Each lead also carries full per-stage outputs (`stages`) in the exact
// pipeline shapes, so the stage strip can show what every stage produced.

export type DemoSequenceTouchStatus = "sent" | "next" | "scheduled";

export type DemoSequenceTouch = {
  id: string;
  day: number;
  label: string;
  detail: string;
  status: DemoSequenceTouchStatus;
  timing: string;
};

// The buying signals the engagement agent observes, plus "outbound" for the
// touches we send (they anchor the timeline but don't move the score).
export type DemoEngagementEventKind =
  | "outbound"
  | "email_engagement"
  | "reply"
  | "pricing"
  | "docs"
  | "product"
  | "content"
  | "meeting"
  | "website";

export type DemoEngagementEvent = {
  id: string;
  kind: DemoEngagementEventKind;
  label: string;
  detail?: string;
  timing: string;
  // Signed intent-score impact. Outbound touches carry none.
  delta?: number;
};

export type DemoIntentTrend = "rising" | "steady" | "cooling";

export type DemoEngagement = {
  intentScore: number; // 0–10
  confidence: number; // 0–1
  trend: DemoIntentTrend;
  deltaThisWeek: number;
  recommendedNextAction: string;
  signalBreakdown: Array<{ signal: string; weight: number }>;
  timeline: DemoEngagementEvent[]; // chronological, oldest first
};

export type DemoInProcessLead = {
  id: string;
  name: string;
  company: string;
  source: string;
  cadence: string;
  timing: string;
  // One line answering "where is this lead right now?"
  waitingSummary: string;
  nextTouchLabel: string;
  sequence: DemoSequenceTouch[];
  engagement: DemoEngagement;
  exitConditions: string[];
  // Full pipeline record in the exact stage-output shapes.
  stages: Lead["stages"];
};

const EXIT_CONDITIONS = ["Reply received", "Meeting booked", "Opt-out"];

const NEON_UPDATED_AT = "2026-07-02T16:30:00.000Z";

const NEON_EMAIL_BODY = `Hi Nikita,

Neon made database branching feel native to how developers already work. The teams adopting it usually want the same thing on the frontend: an environment per change, no setup.

Vercel pairs a preview deploy with every pull request - so a Neon branch and its frontend ship and get reviewed together, then disappear.

Worth 15 minutes on how AI app teams run Neon + Vercel end-to-end?

Best,
Scott`;

const NEON_STAGES: Lead["stages"] = {
  intake: {
    status: "done",
    updatedAt: NEON_UPDATED_AT,
    output: { leadId: "demo-in-process-neon", source: "docs-signup" },
  },
  research: {
    status: "done",
    updatedAt: NEON_UPDATED_AT,
    output: {
      company: {
        name: "Neon",
        industry: "Developer tools - serverless Postgres",
        employeeCount: "100-150",
        funding: "Series B",
        techStack: ["Postgres", "Rust", "TypeScript", "Next.js"],
        recentNews: [
          "Positioning database branching for AI agent and app builders",
        ],
        growthSignals: [
          "Fast-growing developer adoption",
          "Branch-per-preview workflow resonating with AI app teams",
        ],
        sources: ["https://neon.tech"],
      },
      person: {
        name: "Nikita Shamgunov",
        title: "CEO",
        seniority: "Executive",
        decisionMakingAuthority: "High",
        sources: ["https://neon.tech"],
      },
      initiatives: [
        "Making database branching the default for preview environments",
        "Courting AI app builders with instant, disposable databases",
      ],
      aiInitiatives: ["Database-per-agent workflows for AI app builders"],
      priorities: [
        "Grow developer adoption through workflow-native integrations",
        "Keep the prototype-to-production path frictionless",
      ],
      summary:
        "Neon is a high-fit developer platform whose branch-per-preview database workflow naturally pairs with preview deploys on the frontend.",
      sources: ["https://neon.tech"],
    },
  },
  qualification: {
    status: "done",
    updatedAt: NEON_UPDATED_AT,
    output: {
      scores: {
        icpFit: 8.6,
        buyingAuthority: 9,
        productUsageOrIntent: 6.8,
        engineeringMaturity: 9.2,
        companyGrowth: 8.4,
        businessImpact: 8.5,
        overallPriority: 8.2,
      },
      verdict: "qualified",
      rationale:
        "Developer-platform company with an executive contact and a workflow that pairs directly with Vercel previews. Usage intent is moderate - the signup came from docs, not pricing.",
    },
  },
  hypothesis: {
    status: "done",
    updatedAt: NEON_UPDATED_AT,
    output: {
      hypotheses: [
        {
          statement:
            "Neon's branch-per-preview database story is incomplete without a frontend platform that creates matching preview environments.",
          confidence: 0.78,
          evidence: [
            "Docs signup from a database-branching company",
            "Public positioning around AI app builders",
            "Preview workflows are the shared surface between Neon and Vercel",
          ],
          engineeringPain:
            "Teams get a database per branch from Neon but still hand-roll frontend preview environments to pair with them.",
          businessImpact:
            "A joint branch-plus-preview story increases Neon adoption inside teams that already deploy on Vercel.",
        },
      ],
    },
  },
  opportunity_mapping: {
    status: "done",
    updatedAt: NEON_UPDATED_AT,
    output: {
      opportunities: [
        {
          engineeringPain:
            "Pairing every Neon database branch with a matching frontend preview environment.",
          vercelCapability:
            "Preview deploys per pull request, environment variables per branch, and framework-native defaults",
          developerOutcome:
            "A branch's database and frontend ship, get reviewed, and tear down together.",
          businessImpact:
            "Faster review cycles for AI app teams building on Neon + Vercel.",
          estimatedRoi: "High",
          priority: 1,
        },
      ],
    },
  },
  sequence_planning: {
    status: "done",
    updatedAt: NEON_UPDATED_AT,
    output: {
      channels: ["email"],
      cadence: "day 0 / day 3 / day 7",
      timing: "weekday morning local time",
      steps: [
        {
          channel: "email",
          delayDays: 0,
          purpose: "Open with the Postgres + Vercel AI app production angle",
        },
        {
          channel: "email",
          delayDays: 3,
          purpose: "Follow up with a concrete branch-per-preview workflow example",
        },
        {
          channel: "email",
          delayDays: 7,
          purpose: "Customer proof point, then close the loop",
        },
      ],
      followUpLogic:
        "If no reply, send a shorter follow-up anchored on the branch-per-preview workflow; exit after touch 3.",
      exitConditions: EXIT_CONDITIONS,
    },
  },
  content_generation: {
    status: "done",
    updatedAt: NEON_UPDATED_AT,
    output: {
      messagingStrategy: {
        messagingAngle:
          "Neon gave developers a database per branch; Vercel completes the loop with a frontend preview per branch.",
        technicalDepth: "high",
        tone: "peer engineer, workflow-first",
        story:
          "Neon made branching databases feel native. Pairing that with Vercel preview deploys means every pull request carries its full stack - data and frontend - reviewed together.",
        hooks: [
          "A database per branch deserves a frontend per branch.",
        ],
        cta: "15-minute workflow walkthrough",
        customerExamples: ["AI app teams pairing Neon branches with Vercel previews"],
        likelyObjections: ["Existing preview tooling", "Integration effort"],
      },
      subjectLines: ["Neon branches + Vercel previews"],
      emailBody: NEON_EMAIL_BODY,
      cta: "15-minute workflow walkthrough",
      objectionResponses: [
        "If preview tooling already exists, position the pairing as removing the glue code between database branches and frontend environments.",
      ],
      send: {
        status: "approved",
        subject: "Neon branches + Vercel previews",
        body: NEON_EMAIL_BODY,
        cta: "15-minute workflow walkthrough",
        sendWindow: {
          timezone: "America/Los_Angeles",
          earliestLocal: "09:00",
          latestLocal: "11:30",
          recommendedAt: "2026-07-02T16:30:00.000Z",
        },
        approvedAt: "2026-07-02T15:05:00.000Z",
      },
    },
  },
  engagement_intent: {
    status: "pending",
    updatedAt: NEON_UPDATED_AT,
  },
  learning: {
    status: "pending",
    updatedAt: NEON_UPDATED_AT,
  },
};

const RESEND_UPDATED_AT = "2026-06-29T16:15:00.000Z";

const RESEND_EMAIL_BODY = `Hi Zeno,

Resend made sending email feel like writing React. The teams adopting it care about the same thing on the web side: rendering that's fast everywhere, with zero infrastructure fiddling.

Vercel gives those teams edge rendering, preview deploys per PR, and framework-native defaults - the same DX bar Resend set for email.

Worth a 15-minute look at how developer-tools companies run their web stack on Vercel?

Best,
Scott`;

const RESEND_STAGES: Lead["stages"] = {
  intake: {
    status: "done",
    updatedAt: RESEND_UPDATED_AT,
    output: { leadId: "demo-in-process-resend", source: "pricing-page" },
  },
  research: {
    status: "done",
    updatedAt: RESEND_UPDATED_AT,
    output: {
      company: {
        name: "Resend",
        industry: "Developer tools - email API",
        employeeCount: "25-50",
        funding: "Series A",
        techStack: ["TypeScript", "React", "Next.js"],
        recentNews: ["Growing adoption of React Email for transactional email"],
        growthSignals: [
          "Strong developer mindshare in the React ecosystem",
          "Developer-led, product-led growth motion",
        ],
        sources: ["https://resend.com"],
      },
      person: {
        name: "Zeno Rocha",
        title: "CEO",
        seniority: "Executive",
        technicalBackground: "Developer-founder, prolific OSS author",
        decisionMakingAuthority: "High",
        sources: ["https://resend.com"],
      },
      initiatives: [
        "Making React Email the default way teams build transactional email",
        "Expanding from email API into a broader developer communication platform",
      ],
      priorities: [
        "Keep developer experience the differentiator",
        "Grow marketing and docs surfaces without adding platform overhead",
      ],
      summary:
        "Resend is a developer-first email platform with deep React roots; its DX-obsessed team and React-centric stack map directly to Vercel's platform.",
      sources: ["https://resend.com"],
    },
  },
  qualification: {
    status: "done",
    updatedAt: RESEND_UPDATED_AT,
    output: {
      scores: {
        icpFit: 8.9,
        buyingAuthority: 9,
        productUsageOrIntent: 7.6,
        engineeringMaturity: 8.8,
        companyGrowth: 8.1,
        businessImpact: 7.8,
        overallPriority: 8.4,
      },
      verdict: "qualified",
      rationale:
        "Pricing-page visit from a React-native developer-tools company with an executive, technical buyer. Strong ICP fit and above-average intent.",
    },
  },
  hypothesis: {
    status: "done",
    updatedAt: RESEND_UPDATED_AT,
    output: {
      hypotheses: [
        {
          statement:
            "Resend's DX-first team wants its own web properties on infrastructure that matches the bar React Email set.",
          confidence: 0.76,
          evidence: [
            "Pricing page visit signals active evaluation",
            "React/Next.js stack across their surfaces",
            "Founder publicly champions developer experience",
          ],
          engineeringPain:
            "Marketing site, docs, and dashboard all need fast global rendering without a platform team.",
          businessImpact:
            "Faster iteration on the surfaces that drive Resend's product-led growth.",
        },
      ],
    },
  },
  opportunity_mapping: {
    status: "done",
    updatedAt: RESEND_UPDATED_AT,
    output: {
      opportunities: [
        {
          engineeringPain:
            "Scaling docs, marketing, and dashboard surfaces globally with a small team.",
          vercelCapability:
            "Edge rendering, preview deploys per PR, and Next.js-native defaults",
          developerOutcome:
            "Every surface ships through the same PR-preview workflow with no dedicated platform work.",
          businessImpact:
            "Product-led growth surfaces iterate faster with the team they already have.",
          estimatedRoi: "High",
          priority: 1,
        },
      ],
    },
  },
  sequence_planning: {
    status: "done",
    updatedAt: RESEND_UPDATED_AT,
    output: {
      channels: ["email"],
      cadence: "day 0 / day 3 / day 8",
      timing: "weekday morning local time",
      steps: [
        {
          channel: "email",
          delayDays: 0,
          purpose: "Open with the transactional-email + edge rendering angle",
        },
        {
          channel: "email",
          delayDays: 3,
          purpose: "Follow up with the personalized landing page proof point",
        },
        {
          channel: "email",
          delayDays: 8,
          purpose: "Short breakup note with a customer example",
        },
      ],
      followUpLogic:
        "If no reply after the landing page touch, close with a brief customer-example note and exit.",
      exitConditions: EXIT_CONDITIONS,
    },
  },
  content_generation: {
    status: "done",
    updatedAt: RESEND_UPDATED_AT,
    output: {
      messagingStrategy: {
        messagingAngle:
          "Resend set the DX bar for email; Vercel is the same bar for their web surfaces.",
        technicalDepth: "medium",
        tone: "founder-to-founder, concise",
        story:
          "Zeno's team made email feel like React. Vercel makes the rest of their web stack feel the same way - edge rendering, previews per PR, zero platform overhead.",
        hooks: ["The DX bar you set for email, applied to your web stack."],
        cta: "Book 15 min",
        customerExamples: ["Developer-tools companies running docs and marketing on Vercel"],
        likelyObjections: ["Small team, no migration bandwidth", "Current setup works"],
      },
      subjectLines: ["React Email's DX bar, for your web stack"],
      emailBody: RESEND_EMAIL_BODY,
      cta: "Book 15 min",
      objectionResponses: [
        "If bandwidth is the concern, start with a single surface - docs or marketing - behind a preview workflow; no big-bang migration.",
      ],
      send: {
        status: "approved",
        subject: "React Email's DX bar, for your web stack",
        body: RESEND_EMAIL_BODY,
        cta: "Book 15 min",
        sendWindow: {
          timezone: "America/Los_Angeles",
          earliestLocal: "09:00",
          latestLocal: "11:30",
          recommendedAt: "2026-06-29T16:15:00.000Z",
        },
        approvedAt: "2026-06-29T15:00:00.000Z",
      },
    },
  },
  engagement_intent: {
    status: "pending",
    updatedAt: RESEND_UPDATED_AT,
  },
  learning: {
    status: "pending",
    updatedAt: RESEND_UPDATED_AT,
  },
};

const RAILWAY_UPDATED_AT = "2026-07-04T16:20:00.000Z";

const RAILWAY_EMAIL_BODY = `Hi Jake,

Railway nailed the deploy experience for backends and services. Most teams at your stage split the difference on the web side - and their marketing site, docs, and dashboard end up on slower iteration loops than the product itself.

Vercel gives those surfaces preview deploys per PR, edge delivery, and framework defaults, so the web side ships at the same velocity as everything else.

Open to a 15-minute walkthrough of how other infra companies run this?

Best,
Scott`;

const RAILWAY_STAGES: Lead["stages"] = {
  intake: {
    status: "done",
    updatedAt: RAILWAY_UPDATED_AT,
    output: { leadId: "demo-in-process-railway", source: "demo-request" },
  },
  research: {
    status: "done",
    updatedAt: RAILWAY_UPDATED_AT,
    output: {
      company: {
        name: "Railway",
        industry: "Developer tools - deployment platform",
        employeeCount: "50-100",
        funding: "Series A",
        techStack: ["TypeScript", "React", "GraphQL", "Nixpacks"],
        recentNews: ["Expanding self-serve infrastructure for product teams"],
        growthSignals: [
          "Strong bottoms-up developer adoption",
          "Growing docs and template ecosystem",
        ],
        sources: ["https://railway.com"],
      },
      person: {
        name: "Jake Cooper",
        title: "CEO",
        seniority: "Executive",
        technicalBackground: "Developer-founder",
        decisionMakingAuthority: "High",
        sources: ["https://railway.com"],
      },
      initiatives: [
        "Scaling self-serve infrastructure for product engineering teams",
        "Growing the template and docs ecosystem that drives adoption",
      ],
      priorities: [
        "Keep the deploy experience the differentiator",
        "Grow web surfaces without pulling engineers off the core platform",
      ],
      summary:
        "Railway is an infrastructure company whose own web surfaces - marketing, docs, dashboard - compete for the same engineers who build the core product.",
      sources: ["https://railway.com"],
    },
  },
  qualification: {
    status: "done",
    updatedAt: RAILWAY_UPDATED_AT,
    output: {
      scores: {
        icpFit: 7.8,
        buyingAuthority: 9,
        productUsageOrIntent: 7.2,
        engineeringMaturity: 8.9,
        companyGrowth: 7.6,
        businessImpact: 7.4,
        overallPriority: 7.6,
      },
      verdict: "qualified",
      rationale:
        "Demo request from an executive at an infra company. Fit is solid, though a deployment platform may prefer dogfooding its own product for web surfaces.",
    },
  },
  hypothesis: {
    status: "done",
    updatedAt: RAILWAY_UPDATED_AT,
    output: {
      hypotheses: [
        {
          statement:
            "Railway's web surfaces iterate slower than its platform because frontend previews aren't a first-class part of their own tooling.",
          confidence: 0.68,
          evidence: [
            "Demo request submitted this week",
            "Docs and templates are core to their growth motion",
            "Core platform focuses on services, not frontend preview workflows",
          ],
          engineeringPain:
            "Marketing, docs, and dashboard changes queue behind core-platform engineering time.",
          businessImpact:
            "Faster web-surface iteration compounds their self-serve growth motion.",
        },
      ],
    },
  },
  opportunity_mapping: {
    status: "done",
    updatedAt: RAILWAY_UPDATED_AT,
    output: {
      opportunities: [
        {
          engineeringPain:
            "Web surfaces competing with the core platform for engineering time.",
          vercelCapability:
            "Preview deploys per PR, edge delivery, and framework-native defaults for the web layer",
          developerOutcome:
            "Docs and marketing ship independently of platform engineering.",
          businessImpact:
            "Growth surfaces iterate weekly without slowing the core product.",
          estimatedRoi: "Medium-High",
          priority: 1,
        },
      ],
    },
  },
  sequence_planning: {
    status: "done",
    updatedAt: RAILWAY_UPDATED_AT,
    output: {
      channels: ["email"],
      cadence: "day 0 / day 4 / day 7",
      timing: "weekday morning local time",
      steps: [
        {
          channel: "email",
          delayDays: 0,
          purpose: "Open with the deploy-preview velocity angle for platform teams",
        },
        {
          channel: "email",
          delayDays: 4,
          purpose: "Follow up with a migration-free framework workflow example",
        },
        {
          channel: "email",
          delayDays: 7,
          purpose: "Final nudge with a customer proof point",
        },
      ],
      followUpLogic:
        "If no reply, keep touches short and workflow-specific; exit after touch 3.",
      exitConditions: EXIT_CONDITIONS,
    },
  },
  content_generation: {
    status: "done",
    updatedAt: RAILWAY_UPDATED_AT,
    output: {
      messagingStrategy: {
        messagingAngle:
          "Railway's web surfaces deserve the same deploy velocity as the platform they sell.",
        technicalDepth: "medium",
        tone: "peer founder, direct",
        story:
          "Railway made service deploys effortless. Vercel does the same for the web layer - so docs, marketing, and dashboard ship at product speed without borrowing platform engineers.",
        hooks: [
          "Your customers get instant deploys. Do your own web surfaces?",
        ],
        cta: "15-minute walkthrough",
        customerExamples: ["Infra companies running web surfaces on Vercel"],
        likelyObjections: ["We dogfood our own platform", "Not a priority"],
      },
      subjectLines: ["Deploy previews for Railway's web surfaces"],
      emailBody: RAILWAY_EMAIL_BODY,
      cta: "15-minute walkthrough",
      objectionResponses: [
        "Dogfooding matters for services; the web layer is a different workload - position Vercel as complementary, not competitive.",
      ],
      send: {
        status: "approved",
        subject: "Deploy previews for Railway's web surfaces",
        body: RAILWAY_EMAIL_BODY,
        cta: "15-minute walkthrough",
        sendWindow: {
          timezone: "America/Los_Angeles",
          earliestLocal: "09:00",
          latestLocal: "11:30",
          recommendedAt: "2026-07-04T16:20:00.000Z",
        },
        approvedAt: "2026-07-04T15:10:00.000Z",
      },
    },
  },
  engagement_intent: {
    status: "pending",
    updatedAt: RAILWAY_UPDATED_AT,
  },
  learning: {
    status: "pending",
    updatedAt: RAILWAY_UPDATED_AT,
  },
};

export const DEMO_IN_PROCESS_LEADS: DemoInProcessLead[] = [
  {
    id: "demo-in-process-neon",
    name: "Nikita Shamgunov",
    company: "Neon",
    source: "docs-signup",
    cadence: "day 0 / day 3 / day 7",
    timing: "weekday morning local time",
    waitingSummary:
      "Email 1 sent Thu, Jul 2 - opened twice and Nikita is reading the framework docs, but no reply yet. The follow-up goes out Mon, Jul 6 unless he replies first.",
    nextTouchLabel: "Next touch Mon, Jul 6",
    sequence: [
      {
        id: "neon-touch-1",
        day: 0,
        label: "Email 1 - intro",
        detail: "Opened with the Postgres + Vercel AI app production angle.",
        status: "sent",
        timing: "Sent Thu, Jul 2 · 9:30 AM PT",
      },
      {
        id: "neon-touch-2",
        day: 3,
        label: "Email 2 - follow-up",
        detail:
          "Shorter follow-up with a concrete branch-per-preview workflow example.",
        status: "next",
        timing: "Scheduled Mon, Jul 6 · morning PT (moved off the weekend)",
      },
      {
        id: "neon-touch-3",
        day: 7,
        label: "Email 3 - final touch",
        detail: "Customer proof point, then close the loop and exit the sequence.",
        status: "scheduled",
        timing: "Scheduled Fri, Jul 10 · morning PT",
      },
    ],
    engagement: {
      intentScore: 6.2,
      confidence: 0.58,
      trend: "rising",
      deltaThisWeek: 1.1,
      recommendedNextAction:
        "Keep the Monday follow-up, but rewrite it around the Next.js deploy docs Nikita has been reading instead of the generic workflow example.",
      signalBreakdown: [
        { signal: "Email engagement", weight: 0.6 },
        { signal: "Documentation activity", weight: 0.5 },
        { signal: "Replies", weight: 0 },
        { signal: "Pricing interest", weight: 0 },
      ],
      timeline: [
        {
          id: "neon-evt-1",
          kind: "outbound",
          label: "Email 1 sent",
          detail: "Intro - Postgres + Vercel AI app production angle.",
          timing: "Thu, Jul 2 · 9:30 AM PT",
        },
        {
          id: "neon-evt-2",
          kind: "email_engagement",
          label: "Email opened",
          timing: "Fri, Jul 3 · 8:12 AM PT",
          delta: 0.4,
        },
        {
          id: "neon-evt-3",
          kind: "email_engagement",
          label: "Email re-opened",
          detail: "Second open from a desktop client.",
          timing: "Sat, Jul 4 · 10:41 AM PT",
          delta: 0.2,
        },
        {
          id: "neon-evt-4",
          kind: "docs",
          label: "Documentation viewed",
          detail: "/docs/frameworks/nextjs - 4 pages, ~6 min.",
          timing: "Sat, Jul 4 · 10:52 AM PT",
          delta: 0.5,
        },
      ],
    },
    exitConditions: EXIT_CONDITIONS,
    stages: NEON_STAGES,
  },
  {
    id: "demo-in-process-resend",
    name: "Zeno Rocha",
    company: "Resend",
    source: "pricing-page",
    cadence: "day 0 / day 3 / day 8",
    timing: "weekday morning local time",
    waitingSummary:
      "Two touches in and the account is heating up: pricing page visit Friday, then a teammate signed up for a Hobby account. No reply yet - but the agent recommends replacing the day-8 breakup email with a pricing nudge.",
    nextTouchLabel: "Next touch Tue, Jul 7",
    sequence: [
      {
        id: "resend-touch-1",
        day: 0,
        label: "Email 1 - intro",
        detail: "Opened with the transactional-email + edge rendering angle.",
        status: "sent",
        timing: "Sent Mon, Jun 29 · 9:15 AM PT",
      },
      {
        id: "resend-touch-2",
        day: 3,
        label: "Email 2 - follow-up",
        detail: "Followed up with the personalized landing page proof point.",
        status: "sent",
        timing: "Sent Thu, Jul 2 · 9:40 AM PT",
      },
      {
        id: "resend-touch-3",
        day: 8,
        label: "Email 3 - final touch",
        detail:
          "Short breakup note with a customer example, then exit the sequence.",
        status: "next",
        timing: "Scheduled Tue, Jul 7 · morning PT",
      },
    ],
    engagement: {
      intentScore: 8.2,
      confidence: 0.78,
      trend: "rising",
      deltaThisWeek: 2.4,
      recommendedNextAction:
        "Skip the day-8 breakup email. Send a short pricing-question nudge today and offer a 15-minute call - pricing visit plus a product signup means the account is evaluating now.",
      signalBreakdown: [
        { signal: "Product usage", weight: 1.2 },
        { signal: "Pricing interest", weight: 0.9 },
        { signal: "Email engagement", weight: 0.4 },
        { signal: "Website activity", weight: 0.6 },
        { signal: "Replies", weight: 0 },
      ],
      timeline: [
        {
          id: "resend-evt-1",
          kind: "outbound",
          label: "Email 1 sent",
          detail: "Intro - transactional-email + edge rendering angle.",
          timing: "Mon, Jun 29 · 9:15 AM PT",
        },
        {
          id: "resend-evt-2",
          kind: "email_engagement",
          label: "Email opened",
          timing: "Mon, Jun 29 · 11:05 AM PT",
          delta: 0.4,
        },
        {
          id: "resend-evt-3",
          kind: "outbound",
          label: "Email 2 sent",
          detail: "Follow-up with the personalized landing page.",
          timing: "Thu, Jul 2 · 9:40 AM PT",
        },
        {
          id: "resend-evt-4",
          kind: "website",
          label: "Landing page visited",
          detail: "Personalized page - scrolled to the proof-point section.",
          timing: "Thu, Jul 2 · 2:48 PM PT",
          delta: 0.6,
        },
        {
          id: "resend-evt-5",
          kind: "pricing",
          label: "Pricing page visited",
          detail: "/pricing - compared Pro and Enterprise, ~3 min.",
          timing: "Fri, Jul 3 · 4:22 PM PT",
          delta: 0.9,
        },
        {
          id: "resend-evt-6",
          kind: "product",
          label: "Product signup",
          detail: "Teammate (eng lead) created a Hobby account.",
          timing: "Sat, Jul 4 · 1:37 PM PT",
          delta: 1.2,
        },
      ],
    },
    exitConditions: EXIT_CONDITIONS,
    stages: RESEND_STAGES,
  },
  {
    id: "demo-in-process-railway",
    name: "Jake Cooper",
    company: "Railway",
    source: "demo-request",
    cadence: "day 0 / day 4 / day 7",
    timing: "weekday morning local time",
    waitingSummary:
      "Email 1 went out Friday morning after BDR approval. The wait window just opened - no signals yet. Follow-up is scheduled for Wed, Jul 8 unless Jake replies first.",
    nextTouchLabel: "Next touch Wed, Jul 8",
    sequence: [
      {
        id: "railway-touch-1",
        day: 0,
        label: "Email 1 - intro",
        detail:
          "Opened with the deploy-preview velocity angle for platform teams.",
        status: "sent",
        timing: "Sent Fri, Jul 4 · 9:20 AM PT",
      },
      {
        id: "railway-touch-2",
        day: 4,
        label: "Email 2 - follow-up",
        detail: "Follow up with a migration-free framework workflow example.",
        status: "next",
        timing: "Scheduled Wed, Jul 8 · morning PT",
      },
      {
        id: "railway-touch-3",
        day: 7,
        label: "Email 3 - final touch",
        detail: "Final nudge with a customer proof point, then exit the sequence.",
        status: "scheduled",
        timing: "Scheduled Fri, Jul 11 · morning PT",
      },
    ],
    engagement: {
      intentScore: 3.1,
      confidence: 0.32,
      trend: "steady",
      deltaThisWeek: 0,
      recommendedNextAction:
        "Hold - the wait window just opened. The score sits at the qualification baseline; re-score after the first open or 48 quiet hours.",
      signalBreakdown: [
        { signal: "Email engagement", weight: 0 },
        { signal: "Replies", weight: 0 },
        { signal: "Pricing interest", weight: 0 },
        { signal: "Documentation activity", weight: 0 },
      ],
      timeline: [
        {
          id: "railway-evt-1",
          kind: "outbound",
          label: "Email 1 sent",
          detail: "Intro - deploy-preview velocity angle for platform teams.",
          timing: "Fri, Jul 4 · 9:20 AM PT",
        },
      ],
    },
    exitConditions: EXIT_CONDITIONS,
    stages: RAILWAY_STAGES,
  },
];
