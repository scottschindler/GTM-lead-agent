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
  sequence_planning: "Sequence Planning",
  content_generation: "Messaging & Content Generation",
  engagement_intent: "Engagement & Intent",
  learning: "Learning",
};

// Compact labels for the pipeline strip chips on dashboard cards.
export const STRIP_STAGE_LABELS: Record<PipelineStage, string> = {
  intake: "Intake",
  research: "Research",
  qualification: "Qualification",
  hypothesis: "Hypothesis",
  opportunity_mapping: "Opportunity",
  sequence_planning: "Sequence",
  content_generation: "Messaging",
  engagement_intent: "Engagement",
  learning: "Learning",
};

// Engagement & Intent and Learning are retained only as historical/demo stage
// shapes. The live agent must not run or write either stage.
export const STAGE_ORDER: PipelineStage[] = [
  "intake",
  "research",
  "qualification",
  "hypothesis",
  "opportunity_mapping",
  "content_generation",
  "sequence_planning",
];

export const TOGGLE_LABELS: Record<ToggleableStage, string> = {
  enrichment: "Enrichment section",
  qualification: "Qualification",
  hypothesis: "Hypothesis",
  opportunity_mapping: "Opportunity mapping",
  sequence_planning: "Sequence planning",
  content_generation: "Messaging & content generation",
};

export function buildRunMessage(lead: Lead, config: PipelineConfig): string {
  const stages = Object.entries(config.stages);
  const enabled = stages
    .filter(([, on]) => on)
    .map(([stage]) => stage)
    .join(", ");
  const disabled = stages
    .filter(([, on]) => !on)
    .map(([stage]) => stage)
    .join(", ");

  return [
    `Run the full GTM factory pipeline for lead_id=${lead.id}.`,
    `Canonical lead id: ${lead.id}. Use this exact value for every leadId argument; the email address is contact_email only and is never a lead id.`,
    `Lead: ${lead.name} <${lead.email}>, company=${lead.company}, domain=${lead.companyDomain}, source=${lead.source}.`,
    `Start with get_lead for ${lead.id}, then proceed through every enabled stage in order.`,
    `Enabled stages: ${enabled || "none"}.`,
    `Disabled stages: ${disabled || "none"} — mark those skipped and continue.`,
    config.landingPages
      ? "Personalized landing pages are enabled: pipeline_writer must create and persist the page through its own persist tool, inject the returned URL into the email body, and release the already-approved simulated send."
      : "Personalized landing pages are disabled: pipeline_writer must persist content and release the already-approved simulated send without a landing page link.",
    "Use the researcher subagent for one fast research pass with one combined search max, and start its prompt with the canonical lead id.",
    "Then call pipeline_writer once with the full context; it persists all downstream enabled stages and queues the draft. Do not call load_skill, create_landing_page, send_message, or save_stage_output for downstream strategy stages after pipeline_writer succeeds.",
    "End by setting the lead outcome with the recommended next action from the pipeline_writer receipt. Do not run learning in this live pipeline.",
  ].join("\n");
}
