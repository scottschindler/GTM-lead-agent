export const PIPELINE_STAGES = [
  "intake",
  "research",
  "qualification",
  "hypothesis",
  "opportunity_mapping",
  "messaging_strategy",
  "sequence_planning",
  "content_generation",
  "engagement_intent",
  "learning",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const TOGGLEABLE_STAGES = [
  "enrichment",
  "qualification",
  "hypothesis",
  "opportunity_mapping",
  "messaging_strategy",
  "sequence_planning",
  "content_generation",
  "engagement_intent",
  "learning",
] as const;

export type ToggleableStage = (typeof TOGGLEABLE_STAGES)[number];

export type StageStatus = "pending" | "running" | "done" | "skipped" | "failed";

export type LeadOutcome =
  | "open"
  | "disqualified"
  | "nurture"
  | "handed_off"
  | "bought";

export type PipelineConfig = {
  stages: Record<ToggleableStage, boolean>;
  /** Generate a unique personalized landing page per outreach email. */
  landingPages: boolean;
};

export type StageRecord<T = unknown> = {
  status: StageStatus;
  updatedAt: string;
  output?: T;
  error?: string;
  note?: string;
};

export type CompanyProfile = {
  name: string;
  industry?: string;
  employeeCount?: string;
  funding?: string;
  arrEstimate?: string;
  engineeringTeamSize?: string;
  techStack: string[];
  hiringActivity?: string;
  recentNews?: string[];
  growthSignals?: string[];
  sources: string[];
};

export type PersonProfile = {
  name: string;
  title?: string;
  team?: string;
  seniority?: string;
  linkedInUrl?: string;
  technicalBackground?: string;
  decisionMakingAuthority?: string;
  sources: string[];
};

export type ResearchBrief = {
  company: CompanyProfile;
  person: PersonProfile;
  initiatives: string[];
  productLaunches?: string[];
  aiInitiatives?: string[];
  hiringTrends?: string[];
  architectureNotes?: string[];
  competitors?: string[];
  priorities: string[];
  summary: string;
  sources: string[];
};

export type QualificationScores = {
  icpFit: number;
  buyingAuthority: number;
  productUsageOrIntent: number;
  engineeringMaturity: number;
  companyGrowth: number;
  businessImpact: number;
  overallPriority: number;
};

export type QualificationOutput = {
  scores: QualificationScores;
  verdict: "qualified" | "disqualified";
  rationale: string;
};

export type HypothesisItem = {
  statement: string;
  confidence: number;
  evidence: string[];
  engineeringPain: string;
  businessImpact: string;
};

export type HypothesisOutput = {
  hypotheses: HypothesisItem[];
};

export type OpportunityItem = {
  engineeringPain: string;
  vercelCapability: string;
  developerOutcome: string;
  businessImpact: string;
  estimatedRoi: string;
  priority: number;
};

export type OpportunityMappingOutput = {
  opportunities: OpportunityItem[];
};

export type MessagingStrategyOutput = {
  messagingAngle: string;
  technicalDepth: "low" | "medium" | "high";
  tone: string;
  story: string;
  hooks: string[];
  cta: string;
  customerExamples: string[];
  likelyObjections: string[];
};

export type SequenceStep = {
  channel: string;
  delayDays: number;
  purpose: string;
};

export type SequencePlanningOutput = {
  channels: string[];
  cadence: string;
  timing: string;
  steps: SequenceStep[];
  followUpLogic: string;
  exitConditions: string[];
};

export type SendRecord = {
  status: "drafted" | "approved" | "denied";
  subject: string;
  body: string;
  cta: string;
  sendWindow: {
    timezone: string;
    earliestLocal: string;
    latestLocal: string;
    recommendedAt: string;
  };
  approvedAt?: string;
  deniedAt?: string;
};

export type ContentGenerationOutput = {
  subjectLines: string[];
  emailBody: string;
  cta: string;
  objectionResponses: string[];
  // Set by create_landing_page: the unique personalized page for this lead
  // that the email links to.
  landingPageSlug?: string;
  landingPageUrl?: string;
  // Attached by send_message when the draft is queued for review, with the
  // computed send window. Status moves from "drafted" to "approved"/"denied"
  // when a BDR reviews it in the inbox; approval gates the send.
  send?: SendRecord;
};

export type LandingPageOpportunity = {
  title: string;
  pain: string;
  solution: string;
  outcome: string;
};

export type LandingPageStory = {
  company: string;
  metric: string;
  metricLabel: string;
  summary: string;
  url: string;
};

export type LandingPageStat = {
  value: string;
  label: string;
};

export type LandingPage = {
  slug: string;
  leadId: string;
  createdAt: string;
  recipientName: string;
  company: string;
  companyDomain: string;
  /** Prospect's primary brand color as a hex string, e.g. "#3ecf8e". */
  brandColor?: string;
  headline: string;
  subheadline: string;
  /** A short personal note addressed to the recipient. */
  personalNote: string;
  opportunities: LandingPageOpportunity[];
  stats: LandingPageStat[];
  stories: LandingPageStory[];
  ctaLabel: string;
  ctaUrl?: string;
};

export type EngagementIntentOutput = {
  simulated: true;
  events: EngagementEvent[];
  intentScore: number;
  confidence: number;
  signalBreakdown: Array<{ signal: string; weight: number }>;
  recommendedNextAction: string;
};

export type LearningInsight = {
  category:
    | "messaging"
    | "qualification"
    | "hypothesis_accuracy"
    | "sequence"
    | "objections"
    | "general";
  insight: string;
  evidence: string;
  applyTo: string;
};

export type LearningOutput = {
  insights: LearningInsight[];
  hypothesisAccuracy: string;
  whatWorked: string[];
  whatToChange: string[];
};

export type EngagementEvent = {
  id: string;
  type: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
};

export type LeadStages = {
  intake: StageRecord<{ leadId: string; source: string }>;
  research: StageRecord<ResearchBrief>;
  qualification: StageRecord<QualificationOutput>;
  hypothesis: StageRecord<HypothesisOutput>;
  opportunity_mapping: StageRecord<OpportunityMappingOutput>;
  messaging_strategy: StageRecord<MessagingStrategyOutput>;
  sequence_planning: StageRecord<SequencePlanningOutput>;
  content_generation: StageRecord<ContentGenerationOutput>;
  engagement_intent: StageRecord<EngagementIntentOutput>;
  learning: StageRecord<LearningOutput>;
};

export type Lead = {
  id: string;
  name: string;
  email: string;
  company: string;
  companyDomain: string;
  source: string;
  timezone?: string;
  createdAt: string;
  updatedAt: string;
  currentStage: PipelineStage;
  outcome: LeadOutcome;
  stages: LeadStages;
  engagementEvents: EngagementEvent[];
  intentScore: number;
  recommendedNextAction?: string;
};

export type ActivityEvent = {
  id: string;
  timestamp: string;
  sessionId?: string;
  type: string;
  summary: string;
  detail?: unknown;
};

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  stages: {
    enrichment: true,
    qualification: true,
    hypothesis: true,
    opportunity_mapping: true,
    messaging_strategy: true,
    sequence_planning: true,
    content_generation: true,
    engagement_intent: true,
    learning: true,
  },
  landingPages: true,
};

export function emptyStages(): LeadStages {
  const pending = <T,>(): StageRecord<T> => ({
    status: "pending",
    updatedAt: new Date().toISOString(),
  });

  return {
    intake: pending(),
    research: pending(),
    qualification: pending(),
    hypothesis: pending(),
    opportunity_mapping: pending(),
    messaging_strategy: pending(),
    sequence_planning: pending(),
    content_generation: pending(),
    engagement_intent: pending(),
    learning: pending(),
  };
}
