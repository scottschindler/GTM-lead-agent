import type {
  MessagingStrategyOutput,
  OpportunityMappingOutput,
  QualificationOutput,
  ResearchBrief,
} from "../../agent/lib/types";

// Stage outputs for the two hardcoded Needs-review demo cards (the send-
// approval card gets its outputs from the demo review lead's full stages).
// Shapes match the pipeline's stage outputs exactly so the strip can render
// them through the shared StageOutput views.
//
// These personas must NOT overlap with the seed roster in
// agent/lib/seed-leads.ts (or the other demo fixtures) - a colliding name
// makes the static card contradict that lead's real pipeline state after a
// live run.

// --- Cursor / Michael Truell - paused at qualification review ---------------

export const CURSOR_INTAKE = {
  leadId: "demo-qualification-review",
  source: "product-signup",
};

export const CURSOR_RESEARCH: ResearchBrief = {
  company: {
    name: "Cursor",
    industry: "Developer tools - AI coding platform",
    employeeCount: "150-250",
    funding: "Series B",
    techStack: ["TypeScript", "React", "Rust", "Electron"],
    recentNews: [
      "Public launches around AI coding agents and codebase-aware editing",
    ],
    growthSignals: [
      "Fast-growing developer audience",
      "AI agent launches driving new usage",
    ],
    sources: ["https://cursor.com"],
  },
  person: {
    name: "Michael Truell",
    title: "CEO",
    seniority: "Executive",
    technicalBackground: "Developer-founder, MIT-trained engineer",
    decisionMakingAuthority: "High",
    sources: ["https://cursor.com"],
  },
  initiatives: [
    "Scaling AI coding agents from prototype to production workflows",
    "Growing a high-traffic developer platform and community",
  ],
  aiInitiatives: ["AI agent code generation and editing workflows"],
  priorities: [
    "Keep the path from generated code to shipped app instant",
    "Serve a rapidly growing developer audience reliably",
  ],
  summary:
    "Cursor is a high-velocity AI coding platform with an executive, developer-founder buyer; the account signed up through the product itself.",
  sources: ["https://cursor.com"],
};

export const CURSOR_QUALIFICATION: QualificationOutput = {
  scores: {
    icpFit: 8.4,
    buyingAuthority: 9.1,
    productUsageOrIntent: 7.8,
    engineeringMaturity: 9,
    companyGrowth: 8.6,
    businessImpact: 7.9,
    overallPriority: 8.1,
  },
  verdict: "qualified",
  rationale:
    "Strong ICP fit and an executive contact who signed up through the product. High engineering maturity and buying authority; awaiting human confirmation before further agent work on a strategic account.",
};

// --- Grafana Labs / Raj Dutt - paused at messaging review -------------------

export const GRAFANA_INTAKE = {
  leadId: "demo-messaging-review",
  source: "demo-request",
};

export const GRAFANA_RESEARCH: ResearchBrief = {
  company: {
    name: "Grafana Labs",
    industry: "Observability - open-source monitoring",
    employeeCount: "800-1,200",
    funding: "Series D",
    techStack: ["Go", "TypeScript", "React", "Kubernetes"],
    recentNews: [
      "Continued investment in developer experience and internal tooling",
    ],
    growthSignals: [
      "Multi-product engineering organization",
      "Public focus on internal developer portals",
    ],
    sources: ["https://grafana.com"],
  },
  person: {
    name: "Raj Dutt",
    title: "CEO",
    seniority: "Executive",
    technicalBackground: "Co-founder, long-time infrastructure engineer",
    decisionMakingAuthority: "High",
    sources: ["https://grafana.com"],
  },
  initiatives: [
    "Improving developer experience across a multi-product engineering org",
    "Consolidating internal tooling and developer portals",
  ],
  priorities: [
    "Reduce internal tooling sprawl",
    "Keep engineering velocity high across product lines",
  ],
  summary:
    "Grafana Labs is a large multi-product observability company whose internal developer portal investment signals platform-team pain Vercel can map to.",
  sources: ["https://grafana.com"],
};

export const GRAFANA_QUALIFICATION: QualificationOutput = {
  scores: {
    icpFit: 8.7,
    buyingAuthority: 9,
    productUsageOrIntent: 8.2,
    engineeringMaturity: 9.1,
    companyGrowth: 8.1,
    businessImpact: 8.5,
    overallPriority: 8.6,
  },
  verdict: "qualified",
  rationale:
    "Demo request from a technical founder-CEO at an enterprise-scale observability company. Strong intent and a clear platform-team pain to map against.",
};

export const GRAFANA_OPPORTUNITIES: OpportunityMappingOutput = {
  opportunities: [
    {
      engineeringPain:
        "Internal developer portals sprawl across a multi-product engineering org.",
      vercelCapability:
        "Preview deploys, edge delivery, and framework defaults for internal tools and portals",
      developerOutcome:
        "Platform teams consolidate portals on one workflow with previews per change.",
      businessImpact:
        "Less internal tooling maintenance; faster iteration for every product line.",
      estimatedRoi: "High",
      priority: 1,
    },
  ],
};

export const GRAFANA_MESSAGING: MessagingStrategyOutput = {
  messagingAngle:
    "Grafana Labs' platform team is consolidating internal portals; Vercel gives them one preview-driven workflow instead of many bespoke ones.",
  technicalDepth: "high",
  tone: "peer engineer, infrastructure-literate",
  story:
    "Raj's org runs many products and the internal tooling to match. Vercel collapses portal and internal-tool delivery into one workflow - previews per change, edge delivery, no bespoke platform work.",
  hooks: [
    "You tamed observability sprawl. What about your portal sprawl?",
  ],
  cta: "15-minute platform-team walkthrough",
  customerExamples: [
    "Infrastructure companies running internal tools on Vercel",
  ],
  likelyObjections: [
    "Internal platform team already owns this",
    "Security review requirements for internal tools",
  ],
};
