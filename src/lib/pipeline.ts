import type {
  Lead,
  PipelineConfig,
  PipelineStage,
  ToggleableStage,
} from "../../agent/lib/types";

export const STAGE_LABELS: Record<PipelineStage, string> = {
  intake: "Lead Intake",
  research: "Research & Enrichment",
  qualification: "Qualification",
  hypothesis: "Hypothesis",
  opportunity_mapping: "Opportunity Mapping",
  messaging_strategy: "Messaging Strategy",
  sequence_planning: "Sequence Planning",
  content_generation: "Content Generation",
  engagement_intent: "Engagement & Intent",
  learning: "Learning",
};

export const STAGE_ORDER: PipelineStage[] = [
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
];

export const TOGGLE_LABELS: Record<ToggleableStage, string> = {
  enrichment: "Enrichment section",
  qualification: "Qualification",
  hypothesis: "Hypothesis",
  opportunity_mapping: "Opportunity mapping",
  messaging_strategy: "Messaging strategy",
  sequence_planning: "Sequence planning",
  content_generation: "Content generation",
  engagement_intent: "Engagement & intent",
  learning: "Learning",
};

export function buildRunMessage(lead: Lead, config: PipelineConfig): string {
  const enabled = Object.entries(config.stages)
    .filter(([, on]) => on)
    .map(([stage]) => stage)
    .join(", ");
  const disabled = Object.entries(config.stages)
    .filter(([, on]) => !on)
    .map(([stage]) => stage)
    .join(", ");

  return [
    `Run the full GTM factory pipeline for lead_id=${lead.id}.`,
    `Lead: ${lead.name} <${lead.email}>, company=${lead.company}, domain=${lead.companyDomain}, source=${lead.source}.`,
    `Start with get_lead for ${lead.id}, then proceed through every enabled stage in order.`,
    `Enabled stages: ${enabled || "none"}.`,
    `Disabled stages: ${disabled || "none"} — mark those skipped and continue.`,
    config.landingPages
      ? "Personalized landing pages are enabled: during content generation, call create_landing_page and link the returned URL in the email."
      : "Personalized landing pages are disabled: do not call create_landing_page; draft the email without a landing page link.",
    "Persist every stage with save_stage_output. Use the researcher subagent for real web research.",
    "When content is ready, call send_message to queue the draft for BDR review in the Inbox. End by setting the lead outcome with a recommended next action.",
  ].join("\n");
}
