import {
  describePipelineSubagent,
  describePipelineToolCall,
  describePipelineToolResult,
} from "./activity-copy";

const PREVIEW_LIMIT = 800;

// Maps tool callIds to tool names so action.result events (which omit the
// tool name) can be attributed. In-memory is fine for a dev observability log.
const callNames = new Map<string, string>();

function preview(value: unknown, limit = PREVIEW_LIMIT): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

export type ActivityEntry = {
  type: string;
  summary: string;
  detail?: Record<string, unknown>;
};

export function buildActivityEntries(
  type: string,
  data: unknown,
): ActivityEntry[] {
  const d =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};

  switch (type) {
    case "session.started":
      return [{ type, summary: "Starting the workflow" }];
    case "message.received":
      return [
        {
          type,
          summary: "Starting the pipeline run",
          detail: { prompt: preview(d.message) },
        },
      ];
    case "actions.requested": {
      const actions = Array.isArray(d.actions) ? d.actions : [];
      return actions.map((action) => {
        const a = action as {
          callId?: string;
          toolName?: string;
          // Subagent dispatches arrive as kind:"subagent-call" actions that
          // carry subagentName/name instead of toolName.
          subagentName?: string;
          name?: string;
          input?: unknown;
        };
        const toolName = a.toolName ?? a.subagentName ?? a.name ?? "tool";
        if (a.callId) callNames.set(a.callId, toolName);
        return {
          type,
          summary: describePipelineToolCall(toolName, a.input),
          detail: {
            tool: toolName,
            input: preview(a.input),
          },
        };
      });
    }
    case "action.result": {
      const result = (d.result ?? {}) as {
        callId?: string;
        toolName?: string;
        output?: unknown;
        isError?: boolean;
      };
      const toolName =
        result.toolName ??
        (result.callId ? callNames.get(result.callId) : undefined) ??
        "tool";
      const output = result.output as
        | { ok?: boolean; error?: string }
        | undefined;
      const failed =
        result.isError === true ||
        (output && typeof output === "object" && output.ok === false);
      return [
        {
          type,
          summary: failed
            ? "This step needs attention"
            : describePipelineToolResult(toolName),
          detail: {
            tool: toolName,
            output: preview(result.output),
            failed,
          },
        },
      ];
    }
    case "subagent.completed": {
      const name = (d.subagentName as string) ?? "subagent";
      return [
        {
          type,
          summary: describePipelineSubagent(name),
          detail: { subagentName: name, output: preview(d.output) },
        },
      ];
    }
    case "message.completed":
      return [
        {
          type,
          summary: "Agent response is ready",
          detail: { message: preview(d.message, 2000) },
        },
      ];
    case "step.completed":
      return [{ type, summary: "Step complete" }];
    case "input.requested":
      return [
        {
          type,
          summary: "Waiting for operator input",
          detail: { request: preview(d) },
        },
      ];
    case "session.waiting":
      return [{ type, summary: "Waiting for the next instruction" }];
    case "compaction.requested":
      return [{ type, summary: "Refreshing working context" }];
    case "step.failed":
    case "turn.failed":
    case "session.failed":
      return [
        {
          type,
          summary: "This run needs attention",
          detail: { error: preview(d) },
        },
      ];
    case "turn.completed":
      return [{ type, summary: "Pipeline run complete" }];
    default:
      return [];
  }
}
