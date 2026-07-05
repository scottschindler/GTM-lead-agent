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

// Engagement & Intent runs after a lead has already been through this
// pipeline (see the Reviews screen), so it's intentionally excluded here.
// Learning also lives outside the run now: the learning agent assesses a
// lead on the Dashboard's Complete panel once its outcome is known.
export const STAGE_ORDER: PipelineStage[] = [
  "intake",
  "research",
  "qualification",
  "hypothesis",
  "opportunity_mapping",
  "sequence_planning",
  "content_generation",
];

export const TOGGLE_LABELS: Record<ToggleableStage, string> = {
  enrichment: "Enrichment section",
  qualification: "Qualification",
  hypothesis: "Hypothesis",
  opportunity_mapping: "Opportunity mapping",
  sequence_planning: "Sequence planning",
  content_generation: "Messaging & content generation",
  learning: "Learning",
};

export function buildRunMessage(lead: Lead, config: PipelineConfig): string {
  // Learning is no longer part of the run; it happens after the outcome is
  // known (see the Dashboard's Complete panel).
  const stages = Object.entries(config.stages).filter(
    ([stage]) => stage !== "learning",
  );
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
      ? "Personalized landing pages are enabled: during content generation, call create_landing_page, put the returned URL in the email body, save content_generation once with the email and URL together, then call send_message."
      : "Personalized landing pages are disabled: do not call create_landing_page; draft the email without a landing page link.",
    "Persist every stage with save_stage_output. Use the researcher subagent for one fast research pass, and start its prompt with the canonical lead id.",
    "When content is ready, call send_message to queue the draft for BDR review in the Inbox. End by setting the lead outcome with a recommended next action.",
  ].join("\n");
}
