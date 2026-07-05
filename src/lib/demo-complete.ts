import type {
  Lead,
  LearningOutput,
  PipelineStage,
} from "../../agent/lib/types";

// Demo data for the Dashboard "Complete" panel: leads whose pipeline finished
// and whose outcome is known — a sale or a decline. Each entry carries the
// full Lead with every stage output in the exact shapes the pipeline
// produces (rendered via the shared StageOutput views), plus the learning
// agent's assessment in the exact LearningOutput shape.

export type DemoJourneyEventKind =
  | "outbound"
  | "signal"
  | "positive"
  | "negative";

export type DemoJourneyEvent = {
  id: string;
  kind: DemoJourneyEventKind;
  label: string;
  detail?: string;
  timing: string;
};

export type DemoCompleteLead = {
  id: string;
  result: "sale" | "decline";
  resultHeadline: string;
  // One line answering "what happened?" for the collapsed card.
  resultSummary: string;
  resultAtLabel: string;
  discoveredVia: string;
  discoveredQuote: string;
  // Stages where the pipeline's judgment turned out wrong, per the learning
  // agent. Everything else counts as succeeded.
  missedStages: PipelineStage[];
  pipelineVerdict: string;
  journey: DemoJourneyEvent[];
  learning: LearningOutput;
  lead: Lead;
};

const WON_LEAD_ID = "lead_demo_complete_won";
const WON_UPDATED_AT = "2026-07-01T20:00:00.000Z";

const WON_EMAIL_BODY = `Hi Karri,

Linear is the bar for product craft. Teams that care that much usually want infrastructure that gets out of the way.

Vercel gives product engineers preview deploys per PR, edge delivery, and framework defaults that keep reviews fast without adding platform overhead.

Happy to share how a few design-led product teams run their frontend workflow on Vercel.

Best,
Scott`;

const WON_LEAD: Lead = {
  id: WON_LEAD_ID,
  name: "Karri Saarinen",
  email: "karri@linear.app",
  company: "Linear",
  companyDomain: "linear.app",
  source: "demo-request",
  timezone: "America/Los_Angeles",
  createdAt: "2026-06-22T14:00:00.000Z",
  updatedAt: WON_UPDATED_AT,
  currentStage: "learning",
  outcome: "bought",
  intentScore: 9.1,
  recommendedNextAction: "Closed won — handed off to the account team.",
  engagementEvents: [],
  stages: {
    intake: {
      status: "done",
      updatedAt: WON_UPDATED_AT,
      output: { leadId: WON_LEAD_ID, source: "demo-request" },
    },
    research: {
      status: "done",
      updatedAt: WON_UPDATED_AT,
      output: {
        company: {
          name: "Linear",
          industry: "Productivity software",
          employeeCount: "100-200",
          funding: "Series B",
          techStack: ["TypeScript", "React", "GraphQL"],
          recentNews: ["Continued expansion of enterprise workflows"],
          growthSignals: [
            "High product-led growth",
            "Strong design-led engineering culture",
          ],
          sources: ["https://linear.app"],
        },
        person: {
          name: "Karri Saarinen",
          title: "CEO",
          seniority: "Executive",
          decisionMakingAuthority: "High",
          sources: ["https://linear.app"],
        },
        initiatives: [
          "Scaling a polished collaborative product for enterprise teams",
          "Keeping product velocity high while preserving craft",
        ],
        architectureNotes: [
          "Collaborative web product with high expectations for frontend quality",
        ],
        priorities: [
          "Keep deploy workflows fast for product engineers",
          "Preserve frontend performance and preview quality",
        ],
        summary:
          "Linear is a high-fit product-led account where Vercel's preview deploys and frontend workflow map cleanly to their craft and velocity bar.",
        sources: ["https://linear.app"],
      },
    },
    qualification: {
      status: "done",
      updatedAt: WON_UPDATED_AT,
      output: {
        scores: {
          icpFit: 8.8,
          buyingAuthority: 9,
          productUsageOrIntent: 8.2,
          engineeringMaturity: 9.1,
          companyGrowth: 8.5,
          businessImpact: 8.7,
          overallPriority: 8.8,
        },
        verdict: "qualified",
        rationale:
          "Design-led, engineering-heavy product company with a strong fit for preview deploys, frontend performance, and developer workflow improvements.",
      },
    },
    hypothesis: {
      status: "done",
      updatedAt: WON_UPDATED_AT,
      output: {
        hypotheses: [
          {
            statement:
              "Linear's product engineers need frontend infrastructure that disappears so craft and shipping velocity stay high.",
            confidence: 0.81,
            evidence: [
              "Product-led company known for interface quality",
              "Collaborative web app with a high frontend quality bar",
              "Enterprise expansion increases preview and release coordination needs",
            ],
            engineeringPain:
              "Preview quality, release confidence, and frontend performance have to stay high as more teams ship into the product.",
            businessImpact:
              "A smoother frontend workflow helps Linear maintain product craft while serving larger teams.",
          },
        ],
      },
    },
    opportunity_mapping: {
      status: "done",
      updatedAt: WON_UPDATED_AT,
      output: {
        opportunities: [
          {
            engineeringPain:
              "Maintaining high frontend quality while increasing release velocity.",
            vercelCapability:
              "Preview deploys, edge delivery, branch environments, and Next.js workflow defaults",
            developerOutcome:
              "Product engineers review and ship polished UI changes with less infrastructure overhead.",
            businessImpact:
              "Faster product iteration without compromising the craft that differentiates Linear.",
            estimatedRoi: "High",
            priority: 1,
          },
        ],
      },
    },
    sequence_planning: {
      status: "done",
      updatedAt: WON_UPDATED_AT,
      output: {
        channels: ["email"],
        cadence: "day 0 / day 4 / day 9",
        timing: "weekday morning local time",
        steps: [
          {
            channel: "email",
            delayDays: 0,
            purpose: "Open with craft and invisible infrastructure angle",
          },
          {
            channel: "email",
            delayDays: 4,
            purpose: "Follow up with preview workflow proof point",
          },
        ],
        followUpLogic:
          "If no reply, follow up with a concise example of preview deploys improving product review.",
        exitConditions: ["Reply received", "Meeting booked", "Opt-out"],
      },
    },
    content_generation: {
      status: "done",
      updatedAt: WON_UPDATED_AT,
      output: {
        messagingStrategy: {
          messagingAngle:
            "Linear's craft-obsessed product team wants frontend infrastructure that disappears.",
          technicalDepth: "medium",
          tone: "direct, product-minded",
          story:
            "Linear has set the bar for product craft. Vercel keeps frontend delivery quiet and fast with preview deploys, edge delivery, and framework-native defaults.",
          hooks: [
            "Infrastructure should not slow down teams that care deeply about product craft.",
          ],
          cta: "See how design-led teams run on Vercel",
          customerExamples: ["Design-led product teams using Vercel previews"],
          likelyObjections: [
            "Existing workflow is already strong",
            "No current migration project",
          ],
        },
        subjectLines: ["Infrastructure that matches Linear's craft"],
        emailBody: WON_EMAIL_BODY,
        cta: "See design-led teams on Vercel",
        objectionResponses: [
          "If the current workflow is already strong, the angle is less migration and more preserving product velocity as enterprise review surfaces grow.",
        ],
        send: {
          status: "approved",
          subject: "Infrastructure that matches Linear's craft",
          body: WON_EMAIL_BODY,
          cta: "See design-led teams on Vercel",
          sendWindow: {
            timezone: "America/Los_Angeles",
            earliestLocal: "09:00",
            latestLocal: "11:30",
            recommendedAt: "2026-06-22T16:30:00.000Z",
          },
          approvedAt: "2026-06-22T15:10:00.000Z",
        },
      },
    },
    engagement_intent: {
      status: "done",
      updatedAt: WON_UPDATED_AT,
      output: {
        simulated: true,
        events: [
          {
            id: "won-evt-open",
            type: "email_opened",
            occurredAt: "2026-06-22T17:05:00.000Z",
          },
          {
            id: "won-evt-click",
            type: "cta_clicked",
            occurredAt: "2026-06-22T17:09:00.000Z",
          },
          {
            id: "won-evt-reply",
            type: "replied",
            occurredAt: "2026-06-23T16:40:00.000Z",
          },
          {
            id: "won-evt-meeting",
            type: "meeting_held",
            occurredAt: "2026-06-26T17:00:00.000Z",
          },
        ],
        intentScore: 9.1,
        confidence: 0.86,
        signalBreakdown: [
          { signal: "Reply received", weight: 0.45 },
          { signal: "CTA clicked", weight: 0.25 },
          { signal: "Meeting held", weight: 0.3 },
        ],
        recommendedNextAction: "Hand off to the account team — deal closed.",
      },
    },
    learning: {
      status: "done",
      updatedAt: WON_UPDATED_AT,
    },
  },
};

const WON_LEARNING: LearningOutput = {
  hypothesisAccuracy:
    "Confirmed — the craft and invisible-infrastructure hypothesis matched the buyer's own words. Karri's reply cited preview friction during enterprise reviews, exactly the pain the hypothesis predicted.",
  whatWorked: [
    "Peer-level, product-minded tone earned a next-day reply from a design-led CEO",
    "Leading with craft preservation instead of cost or speed matched the account's values",
    "Preview-deploys-per-PR was the proof point that booked the meeting",
  ],
  whatToChange: [
    "Compress the cadence for high-fit demo-request leads — the day-4 follow-up was never needed",
    "Put the enterprise review-coordination angle in email 1 for accounts expanding upmarket",
  ],
  insights: [
    {
      category: "messaging",
      insight:
        "Design-led founders respond to craft-preservation framing, not velocity claims.",
      evidence:
        "Reply quote: 'infrastructure that gets out of the way is exactly how we think about it.'",
      applyTo: "Messaging angle selection for design-led product companies",
    },
    {
      category: "hypothesis_accuracy",
      insight:
        "Enterprise expansion is a reliable trigger for preview and release-coordination pain.",
      evidence:
        "The demo call confirmed release coordination pain across three product teams.",
      applyTo: "Hypothesis stage for product-led companies moving upmarket",
    },
    {
      category: "sequence",
      insight:
        "High-fit leads from demo-request sources convert on touch 1; long sequences add no value.",
      evidence: "Reply arrived 26 hours after the first email.",
      applyTo: "Sequence planning for 8+ scored demo-request leads",
    },
  ],
};

const DECLINED_LEAD_ID = "lead_demo_complete_declined";
const DECLINED_UPDATED_AT = "2026-07-02T21:00:00.000Z";

const DECLINED_EMAIL_BODY = `Hi Ivan,

Notion is shipping AI features at a pace most product teams can't match. The teams doing that well usually hit the same wall: rollout tooling that can't keep up with the ideas.

Vercel gives product engineers preview deploys per change, edge rendering, and gradual rollout primitives — so AI surfaces ship weekly without risking the performance of the core app.

Worth a 15-minute walkthrough of how AI product teams run this on Vercel?

Best,
Scott`;

const DECLINED_LEAD: Lead = {
  id: DECLINED_LEAD_ID,
  name: "Ivan Zhao",
  email: "ivan@notion.com",
  company: "Notion",
  companyDomain: "notion.com",
  source: "content-download",
  timezone: "America/Los_Angeles",
  createdAt: "2026-06-24T13:00:00.000Z",
  updatedAt: DECLINED_UPDATED_AT,
  currentStage: "learning",
  outcome: "nurture",
  intentScore: 2.1,
  recommendedNextAction:
    "Closed as declined — nurture reminder set for next year's platform review.",
  engagementEvents: [],
  stages: {
    intake: {
      status: "done",
      updatedAt: DECLINED_UPDATED_AT,
      output: { leadId: DECLINED_LEAD_ID, source: "content-download" },
    },
    research: {
      status: "done",
      updatedAt: DECLINED_UPDATED_AT,
      output: {
        company: {
          name: "Notion",
          industry: "Productivity software",
          employeeCount: "600-800",
          funding: "Series C",
          techStack: ["TypeScript", "React", "Electron"],
          recentNews: [
            "Continued rollout of Notion AI across the workspace",
          ],
          growthSignals: [
            "Large prosumer and enterprise user base",
            "High AI feature velocity",
          ],
          sources: ["https://www.notion.com"],
        },
        person: {
          name: "Ivan Zhao",
          title: "CEO",
          seniority: "Executive",
          decisionMakingAuthority: "High",
          sources: ["https://www.notion.com"],
        },
        initiatives: [
          "Embedding AI assistance across the workspace",
          "Scaling performance of a large collaborative web app",
        ],
        aiInitiatives: ["Notion AI writing, search, and Q&A features"],
        architectureNotes: [
          "Performance-sensitive collaborative app with a large web surface",
        ],
        priorities: [
          "Ship AI features quickly without regressing core app performance",
        ],
        summary:
          "Notion is a large product-led workspace company investing heavily in AI features; frontend performance and iteration speed are visible priorities.",
        sources: ["https://www.notion.com"],
      },
    },
    qualification: {
      status: "done",
      updatedAt: DECLINED_UPDATED_AT,
      output: {
        scores: {
          icpFit: 8.4,
          buyingAuthority: 9,
          productUsageOrIntent: 6.1,
          engineeringMaturity: 9,
          companyGrowth: 8.2,
          businessImpact: 8.3,
          overallPriority: 7.9,
        },
        verdict: "qualified",
        rationale:
          "Strong ICP and executive authority. Product-usage signals were thin, but the account's scale and AI velocity justified outreach.",
      },
    },
    hypothesis: {
      status: "done",
      updatedAt: DECLINED_UPDATED_AT,
      output: {
        hypotheses: [
          {
            statement:
              "Notion's AI feature push needs faster frontend iteration than an in-house deploy platform typically allows.",
            confidence: 0.72,
            evidence: [
              "Rapid AI feature cadence across the workspace",
              "Public focus on app performance",
              "Contact downloaded the frontend performance guide",
            ],
            engineeringPain:
              "AI surfaces ship weekly; preview and rollout tooling has to keep up without risking app performance.",
            businessImpact:
              "Faster AI feature iteration protects Notion's lead in AI-assisted workspaces.",
          },
        ],
      },
    },
    opportunity_mapping: {
      status: "done",
      updatedAt: DECLINED_UPDATED_AT,
      output: {
        opportunities: [
          {
            engineeringPain:
              "Keeping AI feature iteration fast while protecting a performance-sensitive web app.",
            vercelCapability:
              "Preview deploys, edge rendering, and gradual rollout primitives",
            developerOutcome:
              "Product teams ship AI surfaces behind previews without touching internal platform config.",
            businessImpact:
              "More AI experiments reach users each quarter without performance regressions.",
            estimatedRoi: "Medium-High",
            priority: 1,
          },
        ],
      },
    },
    sequence_planning: {
      status: "done",
      updatedAt: DECLINED_UPDATED_AT,
      output: {
        channels: ["email"],
        cadence: "day 0 / day 3 / day 7",
        timing: "weekday morning local time",
        steps: [
          {
            channel: "email",
            delayDays: 0,
            purpose: "Open with the AI feature velocity angle",
          },
          {
            channel: "email",
            delayDays: 3,
            purpose: "Follow up with a performance-safe rollout example",
          },
        ],
        followUpLogic:
          "If no reply, follow up with a concrete gradual-rollout workflow for AI surfaces.",
        exitConditions: ["Reply received", "Meeting booked", "Opt-out"],
      },
    },
    content_generation: {
      status: "done",
      updatedAt: DECLINED_UPDATED_AT,
      output: {
        messagingStrategy: {
          messagingAngle:
            "Notion ships AI features weekly; Vercel keeps that pace safe for a performance-critical app.",
          technicalDepth: "medium",
          tone: "direct, technical",
          story:
            "Notion's AI push means constant frontend change on an app users expect to be fast. Vercel makes weekly AI feature shipping safe with previews, edge rendering, and gradual rollouts.",
          hooks: [
            "AI features should ship as fast as you prototype them.",
          ],
          cta: "15-minute walkthrough",
          customerExamples: ["AI product teams running rollouts on Vercel"],
          likelyObjections: [
            "Established internal platform team",
            "No migration appetite",
          ],
        },
        subjectLines: ["Shipping Notion AI features faster"],
        emailBody: DECLINED_EMAIL_BODY,
        cta: "15-minute walkthrough",
        objectionResponses: [
          "If the internal platform is settled, position Vercel as the experiment lane for AI surfaces rather than a migration.",
        ],
        send: {
          status: "approved",
          subject: "Shipping Notion AI features faster",
          body: DECLINED_EMAIL_BODY,
          cta: "15-minute walkthrough",
          sendWindow: {
            timezone: "America/Los_Angeles",
            earliestLocal: "09:00",
            latestLocal: "11:30",
            recommendedAt: "2026-06-24T16:30:00.000Z",
          },
          approvedAt: "2026-06-24T15:20:00.000Z",
        },
      },
    },
    engagement_intent: {
      status: "done",
      updatedAt: DECLINED_UPDATED_AT,
      output: {
        simulated: true,
        events: [
          {
            id: "declined-evt-open-1",
            type: "email_opened",
            occurredAt: "2026-06-24T18:12:00.000Z",
          },
          {
            id: "declined-evt-open-2",
            type: "email_opened",
            occurredAt: "2026-06-29T17:30:00.000Z",
          },
          {
            id: "declined-evt-reply",
            type: "replied_declined",
            occurredAt: "2026-07-02T17:45:00.000Z",
          },
        ],
        intentScore: 2.1,
        confidence: 0.8,
        signalBreakdown: [
          { signal: "Email engagement", weight: 0.4 },
          { signal: "Reply — explicit decline", weight: -2.0 },
        ],
        recommendedNextAction:
          "Close as declined; set a nurture reminder for next year's platform review.",
      },
    },
    learning: {
      status: "done",
      updatedAt: DECLINED_UPDATED_AT,
    },
  },
};

const DECLINED_LEARNING: LearningOutput = {
  hypothesisAccuracy:
    "Partially wrong — the pain was real, but the platform decision had already been made internally two quarters earlier. We tested a hypothesis the buyer had already resolved.",
  whatWorked: [
    "Both emails were opened — subject lines and send windows performed",
    "The decline was warm and explicitly left the door open for next year",
    "Right buyer: the CEO replied personally instead of ignoring the thread",
  ],
  whatToChange: [
    "Screen for recent internal-platform investment before sequencing outreach",
    "Ask a timing question in email 1 for accounts with established platform teams",
    "Cap the timing component of the score when product-usage signals are thin",
  ],
  insights: [
    {
      category: "qualification",
      insight:
        "Companies with established internal platform teams need a timing check before outreach.",
      evidence:
        "Reply quote: 'we consolidated on our internal deploy platform earlier this year.'",
      applyTo: "Qualification scoring for 500+ person product companies",
    },
    {
      category: "hypothesis_accuracy",
      insight:
        "Feature-velocity pain does not imply an open platform decision.",
      evidence:
        "The pain was confirmed in the reply, but the decision closed two quarters ago.",
      applyTo:
        "Hypothesis confidence for accounts with no active evaluation signals",
    },
    {
      category: "objections",
      insight:
        "'We built our own platform' declines are timing objections, not fit objections.",
      evidence: "Ivan offered 'check back next year' unprompted.",
      applyTo: "Nurture cadence and re-engagement timing",
    },
  ],
};

export const DEMO_COMPLETE_LEADS: DemoCompleteLead[] = [
  {
    id: WON_LEAD_ID,
    result: "sale",
    resultHeadline:
      "Closed won — Vercel Enterprise, platform migration scoped for Q3.",
    resultSummary:
      "Replied within a day of email 1, demo call Fri, Jun 26, signed Wed, Jul 1. The craft-first hypothesis held up end to end.",
    resultAtLabel: "Closed Wed, Jul 1",
    discoveredVia: "Reply to email 1, then a demo call on Fri, Jun 26",
    discoveredQuote:
      "This is timely — we've been unhappy with our preview setup during enterprise reviews. Tuesday works.",
    missedStages: [],
    pipelineVerdict:
      "Every stage held up. Research, hypothesis, and messaging all pointed at the pain the buyer confirmed on the call — preview friction during enterprise reviews.",
    journey: [
      {
        id: "won-journey-1",
        kind: "outbound",
        label: "Email 1 sent",
        detail: "Craft and invisible-infrastructure angle, BDR-approved.",
        timing: "Mon, Jun 22 · 9:30 AM PT",
      },
      {
        id: "won-journey-2",
        kind: "signal",
        label: "Email opened, CTA clicked",
        timing: "Mon, Jun 22 · 10:05 AM PT",
      },
      {
        id: "won-journey-3",
        kind: "positive",
        label: "Reply received",
        detail: "Cited preview friction during enterprise reviews; asked for Tuesday.",
        timing: "Tue, Jun 23 · 9:40 AM PT",
      },
      {
        id: "won-journey-4",
        kind: "positive",
        label: "Demo call held",
        detail: "Release-coordination pain confirmed across three product teams.",
        timing: "Fri, Jun 26 · 10:00 AM PT",
      },
      {
        id: "won-journey-5",
        kind: "positive",
        label: "Closed won",
        detail: "Enterprise agreement signed; migration scoped for Q3.",
        timing: "Wed, Jul 1 · 1:00 PM PT",
      },
    ],
    learning: WON_LEARNING,
    lead: WON_LEAD,
  },
  {
    id: DECLINED_LEAD_ID,
    result: "decline",
    resultHeadline:
      "Declined — consolidated on an internal deploy platform earlier this year.",
    resultSummary:
      "Both emails opened, then a warm decline after email 2: they standardized on an internal platform earlier this year. A timing miss, not a fit miss.",
    resultAtLabel: "Declined Thu, Jul 2",
    discoveredVia: "Reply to email 2 on Thu, Jul 2",
    discoveredQuote:
      "Thanks — thoughtful note. We consolidated on our internal deploy platform earlier this year, so we're not evaluating right now. Check back next year.",
    missedStages: ["qualification", "hypothesis"],
    pipelineVerdict:
      "Execution held up — research was accurate and both emails landed. The miss was upstream: qualification over-weighted timing on thin usage signals, and the hypothesis tested a platform decision the buyer had already made.",
    journey: [
      {
        id: "declined-journey-1",
        kind: "outbound",
        label: "Email 1 sent",
        detail: "AI feature velocity angle, BDR-approved.",
        timing: "Wed, Jun 24 · 9:30 AM PT",
      },
      {
        id: "declined-journey-2",
        kind: "signal",
        label: "Email opened",
        timing: "Wed, Jun 24 · 11:12 AM PT",
      },
      {
        id: "declined-journey-3",
        kind: "outbound",
        label: "Email 2 sent",
        detail: "Performance-safe rollout example.",
        timing: "Mon, Jun 29 · 9:45 AM PT",
      },
      {
        id: "declined-journey-4",
        kind: "signal",
        label: "Email opened",
        timing: "Mon, Jun 29 · 10:30 AM PT",
      },
      {
        id: "declined-journey-5",
        kind: "negative",
        label: "Reply — declined",
        detail: "Consolidated on an internal platform; invited a check-in next year.",
        timing: "Thu, Jul 2 · 10:45 AM PT",
      },
      {
        id: "declined-journey-6",
        kind: "outbound",
        label: "Closed as declined",
        detail: "Nurture reminder set for next year's platform review.",
        timing: "Thu, Jul 2 · 11:00 AM PT",
      },
    ],
    learning: DECLINED_LEARNING,
    lead: DECLINED_LEAD,
  },
];
