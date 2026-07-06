import type { ActivityEvent } from "./types";

const SKILL_PROGRESS_SUMMARIES: Record<string, string> = {
  qualification: "Checking whether this account is a strong fit",
  hypothesis: "Turning the research into outreach angles",
  "opportunity-mapping": "Matching the account's pains to relevant opportunities",
  "sequence-planning": "Planning the outreach sequence",
  "content-generation": "Choosing the strongest message and drafting the outreach for review",
};

const TOOL_PROGRESS_SUMMARIES: Record<string, string> = {
  get_lead: "Pulling up the lead profile",
  create_lead: "Creating the lead profile",
  researcher: "Researching the account and buyer",
  pipeline_writer: "Scoring the account and drafting the outreach strategy",
  web_search: "Looking for useful account context",
  web_fetch: "Reviewing a relevant source",
  save_stage_output: "Saving progress for this step",
  save_research_brief: "Saving the research summary",
  persist_pipeline_payload: "Saving the strategy, page, and draft",
  send_message: "Preparing the draft for review",
  set_lead_outcome: "Updating the recommended next step",
  create_landing_page: "Building the personalized page",
  list_leads: "Reviewing the lead queue",
  bash: "Checking public context",
  read_file: "Reviewing working notes",
  write_file: "Jotting down working notes",
  list_files: "Reviewing working notes",
};

const TOOL_DONE_SUMMARIES: Record<string, string> = {
  get_lead: "Lead profile is ready",
  create_lead: "Lead profile is ready",
  researcher: "Research notes are ready",
  pipeline_writer: "Strategy and draft are ready",
  web_search: "Useful context found",
  web_fetch: "Source reviewed",
  load_skill: "Playbook is ready",
  save_stage_output: "Progress saved",
  save_research_brief: "Research summary saved",
  persist_pipeline_payload: "Strategy, page, and draft saved",
  send_message: "Draft is ready for BDR review",
  set_lead_outcome: "Recommended next step updated",
  create_landing_page: "Personalized page is ready",
  list_leads: "Lead queue is ready",
  bash: "Public context checked",
  read_file: "Notes reviewed",
  write_file: "Notes saved",
  list_files: "Notes reviewed",
};

const LIVE_HIDDEN_EVENT_TYPES = new Set([
  "session.started",
  "message.received",
  "message.completed",
  "step.completed",
  "step.failed",
  "turn.completed",
  "turn.failed",
  "session.waiting",
  "session.completed",
  "session.failed",
  "compaction.requested",
]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function skillKey(input: unknown): string | undefined {
  const record = asRecord(input);
  return asText(record.id) ?? asText(record.name) ?? asText(record.skill);
}

function activityTool(event: ActivityEvent): string | undefined {
  return asText(asRecord(event.detail).tool);
}

function activityInput(event: ActivityEvent): unknown {
  return parseMaybeJson(asRecord(event.detail).input);
}

function activityResultFailed(event: ActivityEvent): boolean {
  const detail = asRecord(event.detail);
  if (detail.failed === true) return true;
  if (/\b(failed|needs attention)\b/i.test(event.summary)) return true;

  const output = asRecord(parseMaybeJson(detail.output));
  return output.ok === false;
}

function oneLine(value: string): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

function failureReason(output: unknown): string | undefined {
  const parsed = parseMaybeJson(output);
  if (typeof parsed === "string") return oneLine(parsed);

  const record = asRecord(parsed);
  const reason =
    asText(record.error) ??
    asText(record.message) ??
    asText(record.reason) ??
    asText(record.details);
  return reason ? oneLine(reason) : undefined;
}

export function describePipelineToolCall(toolName: string, input?: unknown): string {
  if (toolName === "load_skill") {
    const skill = skillKey(input);
    return skill
      ? SKILL_PROGRESS_SUMMARIES[skill] ?? "Getting the next playbook ready"
      : "Getting the next playbook ready";
  }

  if (toolName === "web_search") {
    const query = asText(asRecord(input).query);
    return query
      ? `Searching the web for “${query}”`
      : TOOL_PROGRESS_SUMMARIES.web_search;
  }

  if (toolName === "web_fetch") {
    const url = asText(asRecord(input).url);
    if (url) {
      try {
        return `Reading ${new URL(url).hostname}`;
      } catch {
        // fall through to the generic copy
      }
    }
    return TOOL_PROGRESS_SUMMARIES.web_fetch;
  }

  return TOOL_PROGRESS_SUMMARIES[toolName] ?? "Working on the next pipeline step";
}

export function describePipelineToolResult(toolName: string): string {
  return TOOL_DONE_SUMMARIES[toolName] ?? "Pipeline step finished";
}

export function describePipelineToolFailure(
  toolName: string,
  output?: unknown,
): string {
  const reason = failureReason(output);
  if (reason && /stopped by a reset/i.test(reason)) {
    return "Previous run was stopped after reset";
  }
  if (reason && /schema/i.test(reason)) {
    return toolName === "researcher"
      ? "Research output was incomplete"
      : "Step output was incomplete";
  }
  if (toolName === "researcher" || toolName === "save_research_brief") {
    return "Research needs another pass";
  }
  return "Step needs another pass";
}

export function describePipelineSubagent(name: string): string {
  return name.toLowerCase().includes("research")
    ? "Research notes are ready"
    : "Specialist work is complete";
}

export function humanizeActivitySummary(event: ActivityEvent): string {
  const tool = activityTool(event);

  if (event.type === "actions.requested" && tool) {
    return describePipelineToolCall(tool, activityInput(event));
  }

  if (event.type === "action.result" && tool) {
    return activityResultFailed(event)
      ? describePipelineToolFailure(tool, asRecord(event.detail).output)
      : describePipelineToolResult(tool);
  }

  if (event.type === "subagent.completed") {
    return describePipelineSubagent(
      asText(asRecord(event.detail).subagentName) ?? "subagent",
    );
  }

  switch (event.type) {
    case "session.started":
      return "Starting the workflow";
    case "message.received":
      return "Starting the pipeline run";
    case "message.completed":
      return "Agent response is ready";
    case "step.completed":
      return "Step complete";
    case "input.requested":
      return "Waiting for operator input";
    case "session.waiting":
      return "Waiting for the next instruction";
    case "turn.completed":
    case "session.completed":
      return "Pipeline run complete";
    case "compaction.requested":
      return "Refreshing working context";
    case "step.failed":
    case "turn.failed":
    case "session.failed":
      return "This run needs attention";
    default:
      return event.summary;
  }
}

export function shouldShowLivePipelineEvent(
  event: ActivityEvent,
): boolean {
  if (LIVE_HIDDEN_EVENT_TYPES.has(event.type)) return false;
  if (event.type === "action.result") {
    return false;
  }
  if (event.type === "actions.requested" && activityTool(event) === "tool") {
    return false;
  }
  return true;
}
