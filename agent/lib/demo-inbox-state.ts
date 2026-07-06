import {
  SEED_LEAD_PROFILES,
  type SeedLeadProfile,
} from "./seed-leads";
import { emptyStages, type Lead } from "./types";

type DemoSendStatus = "drafted" | "approved";

type DemoFixture = {
  profileId: string;
  sendStatus: DemoSendStatus;
  overallPriority: number;
  messagingAngle: string;
  story: string;
  subject: string;
  body: string;
  cta: string;
  qualificationRationale: string;
  hypothesis: string;
  evidence: string[];
  landingPageSlug?: string;
  /** Hours from now for recommended send window (negative = past). */
  sendOffsetHours: number;
  /** Hours ago the draft was approved (approved leads only). */
  approvedHoursAgo?: number;
};

/**
 * Seven leads for the interview demo opening state:
 * 3 drafted (waiting for BDR review) + 4 approved (already sent).
 */
const DEMO_FIXTURES: DemoFixture[] = [
  // --- Pending review (3) ---
  {
    profileId: "lead_seed",
    sendStatus: "drafted",
    overallPriority: 9.2,
    messagingAngle:
      "Supabase is scaling AI-native apps — Vercel is the frontend runtime that matches their backend velocity",
    story:
      "Paul's team is shipping AI features on Postgres. Pairing that with Vercel's edge runtime and preview deploys removes the last friction between backend and frontend velocity.",
    subject: "Supabase + Vercel for AI-native apps",
    body: `Hi Paul,

Saw Supabase's push into AI tooling and vector search — teams building on you are shipping agents and copilots that need a frontend runtime that keeps up.

Vercel gives those teams instant preview deploys, edge functions next to your Postgres, and a DX that matches what you've built on the backend.

Worth a 15-minute look at how a few AI startups are pairing Supabase + Vercel end-to-end?

Best,
Scott`,
    cta: "Book 15 min",
    qualificationRationale:
      "Enterprise-eligible platform company with strong engineering culture, active AI product investment, and clear ICP fit for Vercel frontend infrastructure.",
    hypothesis:
      "Supabase customers building AI apps need a frontend platform that matches their backend shipping speed.",
    evidence: [
      "Pricing page visit signals active evaluation of infrastructure spend",
      "Public AI/vector product launches in the last quarter",
      "Engineering-led buying motion matches Vercel ICP",
    ],
    landingPageSlug: "for-paul-supabase",
    sendOffsetHours: 2,
  },
  {
    profileId: "lead_12",
    sendStatus: "drafted",
    overallPriority: 8.6,
    messagingAngle:
      "Cockroach Labs' platform teams need faster frontend delivery for internal developer portals",
    story:
      "Spencer's org builds infrastructure for developers. Internal portals and docs sites are a natural Vercel fit — preview deploys and edge delivery without ops overhead.",
    subject: "Faster internal portals at Cockroach Labs",
    body: `Hi Spencer,

Teams at Cockroach Labs are building developer portals and docs that need the same reliability bar as your database products.

Vercel handles preview deploys, edge caching, and framework-native DX so platform teams ship UI as fast as they ship distributed systems.

Open to a quick walkthrough of how infra companies use Vercel for internal tools?

Best,
Scott`,
    cta: "See how infra teams use Vercel",
    qualificationRationale:
      "Large engineering org with platform/developer experience mandate. Demo request is a high-intent signal; enterprise deal size justifies human review.",
    hypothesis:
      "Cockroach Labs platform teams are bottlenecked on frontend delivery for internal developer portals.",
    evidence: [
      "Demo request submitted this week",
      "Public investment in developer experience and internal tooling",
      "Multi-product engineering org with portal sprawl risk",
    ],
    sendOffsetHours: 4,
  },
  {
    profileId: "lead_05",
    sendStatus: "drafted",
    overallPriority: 8.1,
    messagingAngle:
      "Replit's AI coding agents need a production deploy target that feels as instant as the IDE",
    story:
      "Amjad is pushing AI-assisted coding. The missing piece for many Replit users is a one-click path from prototype to production — Vercel is that path.",
    subject: "From Replit prototype to production",
    body: `Hi Amjad,

Replit is making it trivial to prototype with AI. The next friction users hit is production: previews, edge, and deploys that feel as instant as the IDE.

Vercel is the natural deploy target for that workflow — framework-native, zero-config, and built for the same audience.

Curious if a Replit → Vercel path is something you've explored?

Best,
Scott`,
    cta: "Explore the deploy path",
    qualificationRationale:
      "Product signup from a high-growth developer platform. Strong ICP fit; AI coding narrative is timely and differentiated.",
    hypothesis:
      "Replit users need a production deploy target that matches IDE velocity.",
    evidence: [
      "Product signup with engineering title",
      "Public AI coding agent launches",
      "Developer-platform ICP match",
    ],
    landingPageSlug: "for-amjad-replit",
    sendOffsetHours: 6,
  },
  // --- Already approved / sent (4) ---
  {
    profileId: "lead_06",
    sendStatus: "approved",
    overallPriority: 8.8,
    messagingAngle:
      "Linear's craft-obsessed product team wants frontend infrastructure that disappears",
    story:
      "Karri's team ships a product known for polish. Vercel removes deploy friction so design and engineering stay in flow.",
    subject: "Infrastructure that matches Linear's craft",
    body: `Hi Karri,

Linear is the bar for product craft. The teams that care that much usually want infrastructure that gets out of the way.

Vercel gives you preview deploys per PR, edge delivery, and a DX that doesn't fight your standards.

Happy to share how a few design-led product teams run on Vercel.

Best,
Scott`,
    cta: "See design-led teams on Vercel",
    qualificationRationale:
      "Newsletter engagement from a design-led product company with strong engineering culture and enterprise potential.",
    hypothesis:
      "Linear wants frontend infrastructure that matches their product craft bar.",
    evidence: [
      "Newsletter engagement signal",
      "Public reputation for product quality",
      "Engineering-led buying culture",
    ],
    sendOffsetHours: -4,
    approvedHoursAgo: 3,
  },
  {
    profileId: "lead_08",
    sendStatus: "approved",
    overallPriority: 8.4,
    messagingAngle:
      "Figma's multiplayer web app is the reference architecture for collaborative products on Vercel",
    story:
      "Dylan built the collaborative web app bar. Teams copying that pattern need edge, previews, and framework support — Vercel's lane.",
    subject: "Collaborative web apps on Vercel",
    body: `Hi Dylan,

Figma set the bar for collaborative web apps. A lot of teams trying to follow that path hit deploy and edge complexity early.

Vercel is built for that class of product — previews, edge, and framework-native DX.

Open to a brief on how collaborative products run on Vercel?

Best,
Scott`,
    cta: "Collaborative product brief",
    qualificationRationale:
      "Customer story engagement from a category-defining design tool. Strong narrative fit for collaborative web apps.",
    hypothesis:
      "Teams building Figma-like collaborative apps need Vercel's edge and preview model.",
    evidence: [
      "Customer story page engagement",
      "Category-defining collaborative web product",
      "Engineering culture aligned with modern web stack",
    ],
    sendOffsetHours: -12,
    approvedHoursAgo: 10,
  },
  {
    profileId: "lead_09",
    sendStatus: "approved",
    overallPriority: 8.7,
    messagingAngle:
      "Stripe's developer docs and dashboards set the DX bar — Vercel is how teams match it",
    story:
      "Patrick's team is famous for developer experience. Companies building payment and fintech UIs want the same bar without building a platform team.",
    subject: "DX-grade frontends without a platform team",
    body: `Hi Patrick,

Stripe's docs and dashboards are the DX bar. Teams in fintech trying to match that usually don't want to staff a full platform org.

Vercel gives them previews, edge, and framework defaults so product engineers ship at that quality bar.

Happy to share patterns from fintech teams on Vercel.

Best,
Scott`,
    cta: "Fintech patterns on Vercel",
    qualificationRationale:
      "Docs visit from a tier-1 payments company. High ICP fit; agent completed full pipeline and BDR approved.",
    hypothesis:
      "Fintech teams want Stripe-grade DX without building platform infrastructure.",
    evidence: [
      "Docs visit signal",
      "Payments/fintech ICP match",
      "Public reputation for developer experience",
    ],
    sendOffsetHours: -20,
    approvedHoursAgo: 18,
  },
];

function hoursFromNow(hours: number): string {
  const date = new Date();
  date.setTime(date.getTime() + hours * 60 * 60 * 1000);
  return date.toISOString();
}

function profileById(id: string): SeedLeadProfile {
  const profile = SEED_LEAD_PROFILES.find((entry) => entry.id === id);
  if (!profile) {
    throw new Error(`Unknown demo profile id: ${id}`);
  }
  return profile;
}

function buildDemoLead(fixture: DemoFixture, now: string): Lead {
  const profile = profileById(fixture.profileId);
  const timezone = profile.timezone;
  const recommendedAt = hoursFromNow(fixture.sendOffsetHours);
  const approvedAt =
    fixture.sendStatus === "approved"
      ? hoursFromNow(-(fixture.approvedHoursAgo ?? 4))
      : undefined;

  const stages = emptyStages();

  stages.intake = {
    status: "done",
    updatedAt: now,
    output: { leadId: profile.id, source: profile.source },
  };

  stages.research = {
    status: "done",
    updatedAt: now,
    output: {
      company: {
        name: profile.company,
        industry: "Developer tools",
        techStack: ["TypeScript", "React", "Next.js"],
        sources: [`https://${profile.companyDomain}`],
      },
      person: {
        name: profile.name,
        title: "CEO",
        sources: [],
      },
      initiatives: [fixture.hypothesis],
      priorities: [fixture.messagingAngle],
      summary: fixture.story,
      sources: [`https://${profile.companyDomain}`],
    },
  };

  stages.qualification = {
    status: "done",
    updatedAt: now,
    output: {
      scores: {
        icpFit: Math.min(10, fixture.overallPriority),
        buyingAuthority: 9,
        productUsageOrIntent: 8,
        engineeringMaturity: 9,
        companyGrowth: 8,
        businessImpact: fixture.overallPriority,
        overallPriority: fixture.overallPriority,
      },
      verdict: "qualified",
      rationale: fixture.qualificationRationale,
    },
  };

  stages.hypothesis = {
    status: "done",
    updatedAt: now,
    output: {
      hypotheses: [
        {
          statement: fixture.hypothesis,
          confidence: 0.82,
          evidence: fixture.evidence,
          engineeringPain: fixture.hypothesis,
          businessImpact: "Faster shipping and higher conversion on developer-facing products",
        },
      ],
    },
  };

  stages.opportunity_mapping = {
    status: "done",
    updatedAt: now,
    output: {
      opportunities: [
        {
          engineeringPain: fixture.hypothesis,
          vercelCapability: "Preview deploys, edge runtime, framework-native DX",
          developerOutcome: "Ship production-quality frontends without platform overhead",
          businessImpact: "Faster time-to-value for developer-facing products",
          estimatedRoi: "High",
          priority: 1,
        },
      ],
    },
  };

  stages.sequence_planning = {
    status: "done",
    updatedAt: now,
    output: {
      channels: ["email"],
      cadence: "day 0 / day 3 / day 7",
      timing: "weekday mornings local time",
      steps: [
        {
          channel: "email",
          delayDays: 0,
          purpose: "Open with narrative angle and soft CTA",
        },
        {
          channel: "email",
          delayDays: 3,
          purpose: "Follow up with customer proof",
        },
      ],
      followUpLogic: "If no reply after email 1, send email 2 with proof point",
      exitConditions: ["Reply received", "Meeting booked", "Explicit opt-out"],
    },
  };

  stages.content_generation = {
    status: "done",
    updatedAt: now,
    output: {
      messagingStrategy: {
        messagingAngle: fixture.messagingAngle,
        technicalDepth: "medium",
        tone: "peer-to-peer, concise",
        story: fixture.story,
        hooks: [fixture.messagingAngle],
        cta: fixture.cta,
        customerExamples: [],
        likelyObjections: ["Already have infra", "Timing"],
      },
      subjectLines: [fixture.subject],
      emailBody: fixture.body,
      cta: fixture.cta,
      objectionResponses: [],
      landingPageSlug: fixture.landingPageSlug,
      landingPageUrl: fixture.landingPageSlug
        ? `/for/${fixture.landingPageSlug}`
        : undefined,
      send: {
        status: fixture.sendStatus,
        subject: fixture.subject,
        body: fixture.body,
        cta: fixture.cta,
        sendWindow: {
          timezone,
          earliestLocal: "09:00",
          latestLocal: "11:30",
          recommendedAt,
        },
        ...(approvedAt ? { approvedAt } : {}),
      },
    },
  };

  // Remaining stages stay pending for pending drafts; mark engagement done for approved.
  if (fixture.sendStatus === "approved") {
    stages.engagement_intent = {
      status: "done",
      updatedAt: now,
      output: {
        simulated: true,
        events: [],
        intentScore: 0,
        confidence: 0.5,
        signalBreakdown: [],
        recommendedNextAction: "Wait for reply",
      },
    };
  }

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    company: profile.company,
    companyDomain: profile.companyDomain,
    source: profile.source,
    timezone: profile.timezone,
    createdAt: now,
    updatedAt: now,
    currentStage: "content_generation",
    outcome: "open",
    stages,
    engagementEvents: [],
    intentScore: 0,
  };
}

/** Build the 6 fully-populated demo leads (2 drafted, 4 approved). */
export function buildDemoInboxLeads(now = new Date().toISOString()): Lead[] {
  return DEMO_FIXTURES.map((fixture) => buildDemoLead(fixture, now));
}

/** Profile ids that receive full demo stage outputs. */
export const DEMO_INBOX_LEAD_IDS = new Set(
  DEMO_FIXTURES.map((fixture) => fixture.profileId),
);
