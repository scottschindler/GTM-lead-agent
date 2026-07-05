import type { Lead } from "../../agent/lib/types";

export const DEMO_REVIEW_LEAD_ID = "lead_demo_needs_review";
export const DEMO_FINISHED_LEAD_ID = "lead_demo_finished";

const UPDATED_AT = "2026-07-03T14:00:00.000Z";

export const DEMO_REVIEW_LEAD: Lead = {
  id: DEMO_REVIEW_LEAD_ID,
  name: "Paul Copplestone",
  email: "paul@supabase.com",
  company: "Supabase",
  companyDomain: "supabase.com",
  source: "demo-review",
  timezone: "America/Los_Angeles",
  createdAt: UPDATED_AT,
  updatedAt: UPDATED_AT,
  currentStage: "content_generation",
  outcome: "open",
  stages: {
    intake: {
      status: "done",
      updatedAt: UPDATED_AT,
      output: { leadId: DEMO_REVIEW_LEAD_ID, source: "demo-review" },
    },
    research: {
      status: "done",
      updatedAt: UPDATED_AT,
      output: {
        company: {
          name: "Supabase",
          industry: "Developer tools",
          employeeCount: "150-250",
          funding: "Series C",
          techStack: ["Postgres", "TypeScript", "React", "Next.js"],
          recentNews: ["Expanded AI and vector search features for developers"],
          growthSignals: [
            "Strong developer adoption",
            "Active AI application builder audience",
          ],
          sources: ["https://supabase.com"],
        },
        person: {
          name: "Paul Copplestone",
          title: "CEO",
          seniority: "Executive",
          decisionMakingAuthority: "High",
          sources: ["https://supabase.com"],
        },
        initiatives: [
          "Helping teams build AI-native apps on Postgres",
          "Improving the developer path from prototype to production",
        ],
        aiInitiatives: ["Vector search and AI app workflows"],
        architectureNotes: [
          "Developer-facing platform with a strong frontend and docs surface",
        ],
        priorities: [
          "Increase activation for teams building AI apps",
          "Keep developer experience fast across backend and frontend workflows",
        ],
        summary:
          "Supabase is a high-fit developer platform account with active AI product momentum and a strong fit for Vercel frontend infrastructure.",
        sources: ["https://supabase.com"],
      },
    },
    qualification: {
      status: "done",
      updatedAt: UPDATED_AT,
      output: {
        scores: {
          icpFit: 9.3,
          buyingAuthority: 9,
          productUsageOrIntent: 8.6,
          engineeringMaturity: 9.2,
          companyGrowth: 8.7,
          businessImpact: 9.1,
          overallPriority: 9.1,
        },
        verdict: "qualified",
        rationale:
          "Enterprise-eligible developer platform with an executive buyer, active AI product investment, and clear alignment with Vercel's frontend cloud value proposition.",
      },
    },
    hypothesis: {
      status: "done",
      updatedAt: UPDATED_AT,
      output: {
        hypotheses: [
          {
            statement:
              "Supabase customers building AI apps need a frontend platform that matches their backend shipping speed.",
            confidence: 0.84,
            evidence: [
              "Recent AI and vector product momentum",
              "Developer-led buying motion matches Vercel's ICP",
              "Backend velocity creates a natural need for fast frontend deploys",
            ],
            engineeringPain:
              "Teams can prototype quickly on Supabase but still need production-grade previews, edge delivery, and frontend deployment defaults.",
            businessImpact:
              "A tighter Supabase plus Vercel story can increase activation and reduce time to production for AI app teams.",
          },
        ],
      },
    },
    opportunity_mapping: {
      status: "done",
      updatedAt: UPDATED_AT,
      output: {
        opportunities: [
          {
            engineeringPain:
              "AI app teams need production frontend workflows that keep up with Supabase backend speed.",
            vercelCapability:
              "Preview deploys, edge runtime, framework-native DX, and AI SDK patterns",
            developerOutcome:
              "Teams move from prototype to production without standing up frontend infrastructure.",
            businessImpact:
              "Higher activation for developer teams building customer-facing AI apps.",
            estimatedRoi: "High",
            priority: 1,
          },
        ],
      },
    },
    sequence_planning: {
      status: "done",
      updatedAt: UPDATED_AT,
      output: {
        channels: ["email"],
        cadence: "day 0 / day 3 / day 7",
        timing: "weekday morning local time",
        steps: [
          {
            channel: "email",
            delayDays: 0,
            purpose: "Open with the AI app production workflow angle",
          },
          {
            channel: "email",
            delayDays: 3,
            purpose: "Follow up with a concrete deployment workflow example",
          },
        ],
        followUpLogic:
          "If no reply, send a shorter follow-up with a customer workflow proof point.",
        exitConditions: ["Reply received", "Meeting booked", "Opt-out"],
      },
    },
    content_generation: {
      status: "done",
      updatedAt: UPDATED_AT,
      output: {
        messagingStrategy: {
          messagingAngle:
            "Supabase is scaling AI-native apps; Vercel is the frontend runtime that matches their backend velocity.",
          technicalDepth: "medium",
          tone: "peer-to-peer, concise",
          story:
            "Paul's team is helping developers build AI apps on Postgres. Pairing that backend velocity with Vercel previews, edge, and framework defaults makes the production path feel just as fast.",
          hooks: [
            "AI builders need the same speed from frontend deploys that Supabase gives them on the backend.",
          ],
          cta: "Book 15 min",
          customerExamples: ["AI-native startups using Vercel and Postgres"],
          likelyObjections: ["We already have deploy infrastructure", "Timing"],
        },
        subjectLines: ["Supabase + Vercel for AI-native apps"],
        emailBody: `Hi Paul,

Saw Supabase's push into AI tooling and vector search. Teams building on you are shipping agents and copilots that need a frontend runtime that keeps up.

Vercel gives those teams instant preview deploys, edge functions close to users, and a DX that matches what you have built on the backend.

Worth a 15-minute look at how AI startups are pairing Supabase + Vercel end-to-end?

Best,
Scott`,
        cta: "Book 15 min",
        objectionResponses: [
          "If Supabase already has deploy paths, this can be positioned as the production frontend lane for teams that want Vercel's framework-native workflow.",
        ],
        send: {
          status: "drafted",
          subject: "Supabase + Vercel for AI-native apps",
          body: `Hi Paul,

Saw Supabase's push into AI tooling and vector search. Teams building on you are shipping agents and copilots that need a frontend runtime that keeps up.

Vercel gives those teams instant preview deploys, edge functions close to users, and a DX that matches what you have built on the backend.

Worth a 15-minute look at how AI startups are pairing Supabase + Vercel end-to-end?

Best,
Scott`,
          cta: "Book 15 min",
          sendWindow: {
            timezone: "America/Los_Angeles",
            earliestLocal: "09:00",
            latestLocal: "11:30",
            recommendedAt: "2026-07-06T16:30:00.000Z",
          },
        },
      },
    },
    engagement_intent: {
      status: "pending",
      updatedAt: UPDATED_AT,
    },
    learning: {
      status: "pending",
      updatedAt: UPDATED_AT,
    },
  },
  engagementEvents: [],
  intentScore: 0,
  recommendedNextAction: "BDR review requested before release",
};

export const DEMO_FINISHED_LEAD: Lead = {
  ...DEMO_REVIEW_LEAD,
  id: DEMO_FINISHED_LEAD_ID,
  name: "Karri Saarinen",
  email: "karri@linear.app",
  company: "Linear",
  companyDomain: "linear.app",
  source: "demo-finished",
  timezone: "America/Los_Angeles",
  currentStage: "engagement_intent",
  outcome: "bought",
  intentScore: 7.8,
  recommendedNextAction: "Wait for reply, then follow up with product proof.",
  stages: {
    ...DEMO_REVIEW_LEAD.stages,
    intake: {
      status: "done",
      updatedAt: UPDATED_AT,
      output: { leadId: DEMO_FINISHED_LEAD_ID, source: "demo-finished" },
    },
    research: {
      status: "done",
      updatedAt: UPDATED_AT,
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
      updatedAt: UPDATED_AT,
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
      updatedAt: UPDATED_AT,
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
      updatedAt: UPDATED_AT,
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
      updatedAt: UPDATED_AT,
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
      updatedAt: UPDATED_AT,
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
          likelyObjections: ["Existing workflow is already strong", "No current migration project"],
        },
        subjectLines: ["Infrastructure that matches Linear's craft"],
        emailBody: `Hi Karri,

Linear is the bar for product craft. Teams that care that much usually want infrastructure that gets out of the way.

Vercel gives product engineers preview deploys per PR, edge delivery, and framework defaults that keep reviews fast without adding platform overhead.

Happy to share how a few design-led product teams run their frontend workflow on Vercel.

Best,
Scott`,
        cta: "See design-led teams on Vercel",
        objectionResponses: [
          "If the current workflow is already strong, the angle is less migration and more preserving product velocity as enterprise review surfaces grow.",
        ],
        send: {
          status: "approved",
          subject: "Infrastructure that matches Linear's craft",
          body: `Hi Karri,

Linear is the bar for product craft. Teams that care that much usually want infrastructure that gets out of the way.

Vercel gives product engineers preview deploys per PR, edge delivery, and framework defaults that keep reviews fast without adding platform overhead.

Happy to share how a few design-led product teams run their frontend workflow on Vercel.

Best,
Scott`,
          cta: "See design-led teams on Vercel",
          sendWindow: {
            timezone: "America/Los_Angeles",
            earliestLocal: "09:00",
            latestLocal: "11:30",
            recommendedAt: "2026-07-02T16:30:00.000Z",
          },
          approvedAt: "2026-07-03T15:15:00.000Z",
        },
      },
    },
    engagement_intent: {
      status: "done",
      updatedAt: UPDATED_AT,
      output: {
        simulated: true,
        events: [
          {
            id: "evt_demo_finished_open",
            type: "email_opened",
            occurredAt: "2026-07-03T16:20:00.000Z",
            metadata: { source: "demo" },
          },
          {
            id: "evt_demo_finished_click",
            type: "cta_clicked",
            occurredAt: "2026-07-03T16:23:00.000Z",
            metadata: { cta: "See design-led teams on Vercel" },
          },
        ],
        intentScore: 7.8,
        confidence: 0.72,
        signalBreakdown: [
          { signal: "Opened approved email", weight: 0.3 },
          { signal: "Clicked CTA", weight: 0.45 },
          { signal: "High ICP fit", weight: 0.25 },
        ],
        recommendedNextAction:
          "Follow up with a concise preview deploy workflow example.",
      },
    },
    learning: {
      status: "pending",
      updatedAt: UPDATED_AT,
    },
  },
  engagementEvents: [
    {
      id: "evt_demo_finished_open",
      type: "email_opened",
      occurredAt: "2026-07-03T16:20:00.000Z",
      metadata: { source: "demo" },
    },
    {
      id: "evt_demo_finished_click",
      type: "cta_clicked",
      occurredAt: "2026-07-03T16:23:00.000Z",
      metadata: { cta: "See design-led teams on Vercel" },
    },
  ],
};

export const DEMO_LEAD_IDS = new Set([
  DEMO_REVIEW_LEAD_ID,
  DEMO_FINISHED_LEAD_ID,
]);
