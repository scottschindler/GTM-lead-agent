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

// --- Replit / Amjad Masad — paused at qualification review -----------------

export const REPLIT_INTAKE = {
  leadId: "demo-qualification-review",
  source: "product-signup",
};

export const REPLIT_RESEARCH: ResearchBrief = {
  company: {
    name: "Replit",
    industry: "Developer tools — AI coding platform",
    employeeCount: "150-250",
    funding: "Series B",
    techStack: ["TypeScript", "React", "Go", "Nix"],
    recentNews: [
      "Public launches around AI coding agents and app generation",
    ],
    growthSignals: [
      "Fast-growing developer audience",
      "AI agent launches driving new usage",
    ],
    sources: ["https://replit.com"],
  },
  person: {
    name: "Amjad Masad",
    title: "CEO",
    seniority: "Executive",
    technicalBackground: "Developer-founder, ex-Facebook engineer",
    decisionMakingAuthority: "High",
    sources: ["https://replit.com"],
  },
  initiatives: [
    "Scaling AI coding agents from prototype to production apps",
    "Growing a high-traffic developer platform and community",
  ],
  aiInitiatives: ["AI agent app generation and deployment workflows"],
  priorities: [
    "Keep the path from generated app to deployed app instant",
    "Serve a rapidly growing developer audience reliably",
  ],
  summary:
    "Replit is a high-velocity AI coding platform with an executive, developer-founder buyer; the account signed up through the product itself.",
  sources: ["https://replit.com"],
};

export const REPLIT_QUALIFICATION: QualificationOutput = {
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

// --- Cockroach Labs / Spencer Kimball — paused at messaging review ---------

export const COCKROACH_INTAKE = {
  leadId: "demo-messaging-review",
  source: "demo-request",
};

export const COCKROACH_RESEARCH: ResearchBrief = {
  company: {
    name: "Cockroach Labs",
    industry: "Databases — distributed SQL",
    employeeCount: "400-600",
    funding: "Series F",
    techStack: ["Go", "TypeScript", "React", "Kubernetes"],
    recentNews: [
      "Continued investment in developer experience and internal tooling",
    ],
    growthSignals: [
      "Multi-product engineering organization",
      "Public focus on internal developer portals",
    ],
    sources: ["https://www.cockroachlabs.com"],
  },
  person: {
    name: "Spencer Kimball",
    title: "CEO",
    seniority: "Executive",
    technicalBackground: "Co-founder, original CockroachDB engineer",
    decisionMakingAuthority: "High",
    sources: ["https://www.cockroachlabs.com"],
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
    "Cockroach Labs is a large distributed-database company whose internal developer portal investment signals platform-team pain Vercel can map to.",
  sources: ["https://www.cockroachlabs.com"],
};

export const COCKROACH_QUALIFICATION: QualificationOutput = {
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
    "Demo request from a technical founder-CEO at an enterprise-scale database company. Strong intent and a clear platform-team pain to map against.",
};

export const COCKROACH_OPPORTUNITIES: OpportunityMappingOutput = {
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

export const COCKROACH_MESSAGING: MessagingStrategyOutput = {
  messagingAngle:
    "Cockroach Labs' platform team is consolidating internal portals; Vercel gives them one preview-driven workflow instead of many bespoke ones.",
  technicalDepth: "high",
  tone: "peer engineer, infrastructure-literate",
  story:
    "Spencer's org runs many products and the internal tooling to match. Vercel collapses portal and internal-tool delivery into one workflow — previews per change, edge delivery, no bespoke platform work.",
  hooks: [
    "Distributed SQL solved your data sprawl. What about your portal sprawl?",
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
