import { defineHook } from "eve/hooks";

import { appendActivity } from "../lib/store";

const PREVIEW_LIMIT = 800;

// Maps tool callIds to tool names so action.result events (which omit the
// tool name) can be attributed. In-memory is fine for a dev observability log.
const callNames = new Map<string, string>();

function preview(value: unknown, limit = PREVIEW_LIMIT): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

type Entry = {
  type: string;
  summary: string;
  detail?: Record<string, unknown>;
};

function describeToolCall(toolName: string, input: unknown): string {
  const record =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  switch (toolName) {
    case "load_skill":
      return `Loading skill: ${record.id ?? record.name ?? preview(input, 60)}`;
    case "researcher":
      return "Delegating to researcher subagent";
    case "web_search":
      return `Web search: "${record.query ?? preview(input, 80)}"`;
    case "web_fetch":
      return `Fetching: ${record.url ?? preview(input, 80)}`;
    case "save_stage_output":
      return `Saving stage output: ${record.stage ?? "?"}`;
    case "get_lead":
      return `Loading lead ${record.leadId ?? ""}`;
    case "create_lead":
      return `Creating lead for ${record.email ?? record.company ?? ""}`;
    case "send_message":
      return `Queueing draft for BDR review: "${record.subject ?? ""}"`;
    case "set_lead_outcome":
      return `Setting outcome: ${record.outcome ?? "?"}`;
    default:
      return `Calling ${toolName}`;
  }
}

function buildEntries(type: string, data: unknown): Entry[] {
  const d =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};

  switch (type) {
    case "session.started":
      return [{ type, summary: "Session started" }];
    case "message.received":
      return [
        {
          type,
          summary: `Prompt received: "${preview(d.message, 140)}"`,
          detail: { prompt: preview(d.message) },
        },
      ];
    case "actions.requested": {
      const actions = Array.isArray(d.actions) ? d.actions : [];
      return actions.map((action) => {
        const a = action as {
          callId?: string;
          toolName?: string;
          input?: unknown;
        };
        const toolName = a.toolName ?? "tool";
        if (a.callId) callNames.set(a.callId, toolName);
        return {
          type,
          summary: describeToolCall(toolName, a.input),
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
            ? `${toolName} failed: ${preview(output?.error ?? result.output, 140)}`
            : `${toolName} returned`,
          detail: {
            tool: toolName,
            output: preview(result.output),
          },
        },
      ];
    }
    case "subagent.completed": {
      const name = (d.subagentName as string) ?? "subagent";
      return [
        {
          type,
          summary: `Subagent ${name} finished`,
          detail: { output: preview(d.output) },
        },
      ];
    }
    case "message.completed":
      return [
        {
          type,
          summary: `Agent: "${preview(d.message, 180)}"`,
          detail: { message: preview(d.message, 2000) },
        },
      ];
    case "step.completed": {
      const usage = (d.usage ?? {}) as {
        inputTokens?: number;
        outputTokens?: number;
      };
      return [
        {
          type,
          summary: `Step done (${usage.inputTokens ?? 0} in / ${usage.outputTokens ?? 0} out tokens)`,
        },
      ];
    }
    case "input.requested":
      return [
        {
          type,
          summary: "Paused — waiting for human approval",
          detail: { request: preview(d) },
        },
      ];
    case "session.waiting":
      return [{ type, summary: `Waiting: ${preview(d.wait, 80)}` }];
    case "compaction.requested":
      return [{ type, summary: "Compacting conversation context" }];
    case "step.failed":
    case "turn.failed":
    case "session.failed":
      return [
        {
          type,
          summary: `FAILED: ${preview(d.message ?? d.code, 200)}`,
          detail: { error: preview(d) },
        },
      ];
    case "turn.completed":
      return [{ type, summary: "Turn completed" }];
    default:
      return [];
  }
}

export default defineHook({
  events: {
    async "*"(event, ctx) {
      const data = "data" in event ? event.data : undefined;
      const entries = buildEntries(event.type, data);

      for (const entry of entries) {
        try {
          await appendActivity({
            sessionId: ctx.session.id,
            type: entry.type,
            summary: entry.summary,
            detail: entry.detail,
          });
        } catch (error) {
          console.error("[activity hook]", error);
        }
      }
    },
  },
});
