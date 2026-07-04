"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useEveAgent } from "eve/react";

import type {
  ActivityEvent,
  Lead,
  PipelineConfig,
  PipelineStage,
  StageRecord,
  ToggleableStage,
} from "../../agent/lib/types";
import {
  STAGE_LABELS,
  STAGE_ORDER,
  TOGGLE_LABELS,
  buildRunMessage,
} from "../lib/pipeline";
import { StageOutput } from "./stage-output";
import { AppHeader } from "./app-header";

type InputRequest = {
  requestId: string;
  prompt?: string;
  options?: Array<{ id: string; label?: string }>;
};

function statusColor(status: StageRecord["status"]): string {
  switch (status) {
    case "done":
      return "var(--geist-success)";
    case "running":
      return "var(--geist-cyan)";
    case "skipped":
      return "var(--geist-muted)";
    case "failed":
      return "var(--geist-foreground)";
    default:
      return "var(--geist-border)";
  }
}

function findInputRequest(messages: Array<{ parts: unknown[] }>): InputRequest | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    for (const part of message.parts) {
      if (
        part &&
        typeof part === "object" &&
        "type" in part &&
        (part as { type: string }).type === "dynamic-tool"
      ) {
        const meta = (
          part as {
            toolMetadata?: { eve?: { inputRequest?: InputRequest } };
          }
        ).toolMetadata?.eve?.inputRequest;
        if (meta?.requestId) return meta;
      }
    }
  }
  return null;
}

function Spinner() {
  return (
    <span
      aria-label="running"
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--geist-border)] border-t-[var(--geist-success)]"
    />
  );
}

function ActivityDetail({ event }: { event: ActivityEvent }) {
  const detail = event.detail as Record<string, unknown> | undefined;
  if (!detail || Object.keys(detail).length === 0) return null;
  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-[11px] text-[var(--geist-muted)]">
        detail
      </summary>
      <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-[8px] bg-[var(--geist-subtle)] p-2 font-sans text-[11px] text-[var(--geist-muted)]">
        {Object.entries(detail)
          .map(([key, value]) => `${key}: ${String(value)}`)
          .join("\n\n")}
      </pre>
    </details>
  );
}

const NOISE_EVENT_TYPES = new Set([
  "step.completed",
  "turn.completed",
  "session.waiting",
]);

// Leads written before a stage existed won't have a record for it.
function stageRecord(lead: Lead, stage: PipelineStage): StageRecord {
  return (
    lead.stages[stage] ?? { status: "pending", updatedAt: lead.createdAt }
  );
}

function StageCard({
  stage,
  record,
  running,
  liveEvents,
}: {
  stage: PipelineStage;
  record: StageRecord;
  running: boolean;
  liveEvents: ActivityEvent[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (running) setOpen(true);
  }, [running]);

  const displayStatus = running ? "running" : record.status;
  const log = running
    ? liveEvents.filter((event) => !NOISE_EVENT_TYPES.has(event.type)).slice(0, 8)
    : [];
  const expanded = open || running;

  return (
    <article
      className="rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-background)]"
      style={{ boxShadow: "var(--geist-shadow)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          {running ? (
            <Spinner />
          ) : (
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: statusColor(record.status) }}
            />
          )}
          <div>
            <div className="text-sm font-medium">{STAGE_LABELS[stage]}</div>
            <div className="text-xs text-[var(--geist-muted)]">
              {displayStatus}
              {record.status !== "pending" && record.updatedAt
                ? ` · ${new Date(record.updatedAt).toLocaleTimeString()}`
                : ""}
            </div>
          </div>
        </div>
        <span className="text-xs text-[var(--geist-muted)]">
          {expanded ? "Hide" : "Show"}
        </span>
      </button>
      {running && log.length > 0 ? (
        <div className="border-t border-[var(--geist-border)] px-4 py-3">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-[var(--geist-muted)]">
            live agent log
          </div>
          <div className="space-y-2">
            {log.map((event) => (
              <div key={event.id}>
                <div className="text-sm">
                  <span className="text-[11px] text-[var(--geist-muted)]">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>{" "}
                  {event.summary}
                </div>
                <ActivityDetail event={event} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {open && !running ? (
        <div className="border-t border-[var(--geist-border)] px-4 py-3">
          {record.note ? (
            <p className="mb-2 text-sm text-[var(--geist-muted)]">{record.note}</p>
          ) : null}
          {record.output ? (
            <StageOutput stage={stage} output={record.output} />
          ) : (
            <p className="text-sm text-[var(--geist-muted)]">No output yet.</p>
          )}
        </div>
      ) : null}
    </article>
  );
}

export function FactoryDashboard() {
  const agent = useEveAgent();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [config, setConfig] = useState<PipelineConfig | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageTogglesOpen, setStageTogglesOpen] = useState(false);

  const refreshLeads = useCallback(async () => {
    const response = await fetch("/api/leads", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load leads");
    }
    const data = (await response.json()) as { leads: Lead[] };
    setLeads(data.leads);
    return data.leads;
  }, []);

  const refreshConfig = useCallback(async () => {
    const response = await fetch("/api/pipeline-config", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load pipeline config");
    }
    const data = (await response.json()) as { config: PipelineConfig };
    setConfig(data.config);
  }, []);

  const refreshActivity = useCallback(async () => {
    const response = await fetch("/api/activity?limit=200", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load activity");
    }
    const data = (await response.json()) as { events: ActivityEvent[] };
    setActivity(data.events.slice().reverse());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await Promise.all([
          refreshLeads(),
          refreshConfig(),
          refreshActivity(),
        ]);
        if (!cancelled && loaded[0][0]) {
          setActiveLeadId(loaded[0][0].id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshActivity, refreshConfig, refreshLeads]);

  const agentBusy = agent.status === "submitted" || agent.status === "streaming";
  const stopAgent = agent.stop;

  // The eve client stream can desync from the server (e.g. a dev-time Nitro
  // worker reload drops the SSE connection mid-turn), leaving `agent.status`
  // pinned on "streaming" after the turn already finished. The server-side
  // activity feed is authoritative: a `turn.completed` / `session.waiting`
  // event as the newest entry means the turn is over.
  const serverTurnEnded =
    activity.length > 0 &&
    (activity[0].type === "turn.completed" ||
      activity[0].type === "session.waiting");

  const isBusy = agentBusy && !serverTurnEnded;

  // If the server says the turn ended but the client stream never closed,
  // abort the stale stream so a new run can start. The grace period avoids
  // racing a healthy stream that's about to close on its own.
  useEffect(() => {
    if (!serverTurnEnded || !agentBusy) return;
    const id = window.setTimeout(() => stopAgent(), 3000);
    return () => window.clearTimeout(id);
  }, [serverTurnEnded, agentBusy, stopAgent]);

  useEffect(() => {
    if (!isBusy && agent.status !== "ready") return;
    const id = window.setInterval(() => {
      void refreshLeads();
      void refreshActivity();
    }, isBusy ? 1500 : 4000);
    return () => window.clearInterval(id);
  }, [isBusy, agent.status, refreshActivity, refreshLeads]);

  const pendingLeads = useMemo(
    () => leads.filter((item) => item.outcome === "open"),
    [leads],
  );

  const nextLead = pendingLeads[0] ?? null;

  const lead = useMemo(() => {
    if (leads.length === 0) return null;
    if (activeLeadId) {
      return leads.find((item) => item.id === activeLeadId) ?? leads[0];
    }
    return leads[0];
  }, [activeLeadId, leads]);

  const inputRequest = useMemo(
    () =>
      findInputRequest(
        agent.data.messages as unknown as Array<{ parts: unknown[] }>,
      ),
    [agent.data.messages],
  );

  // While the agent is busy, the first stage that has produced no result yet
  // is the one currently being worked on.
  const activeStage = useMemo<PipelineStage | null>(() => {
    if (!lead) return null;
    return (
      STAGE_ORDER.find(
        (stage) => stageRecord(lead, stage).status === "pending",
      ) ?? null
    );
  }, [lead]);

  // Events newer than the latest completed stage belong to the active stage.
  const activeStageEvents = useMemo(() => {
    if (!lead) return [];
    const lastStageWrite = STAGE_ORDER.reduce((latest, stage) => {
      const record = stageRecord(lead, stage);
      return record.status !== "pending" && record.updatedAt > latest
        ? record.updatedAt
        : latest;
    }, "");
    return activity.filter((event) => event.timestamp > lastStageWrite);
  }, [activity, lead]);

  async function toggleStage(stage: ToggleableStage) {
    if (!config) return;
    const next: PipelineConfig = {
      ...config,
      stages: {
        ...config.stages,
        [stage]: !config.stages[stage],
      },
    };
    setConfig(next);
    const response = await fetch("/api/pipeline-config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!response.ok) {
      setError("Failed to update pipeline config");
      await refreshConfig();
    }
  }

  async function runPipeline() {
    if (!nextLead || !config || isBusy) return;
    setError(null);
    setActiveLeadId(nextLead.id);
    try {
      await agent.send({ message: buildRunMessage(nextLead, config) });
      await Promise.all([refreshLeads(), refreshActivity()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run pipeline");
    }
  }

  async function resetEverything() {
    setError(null);
    try {
      agent.stop();
    } catch {
      // no active request to stop
    }
    agent.reset();
    try {
      const response = await fetch("/api/reset", { method: "POST" });
      if (!response.ok) throw new Error("Reset failed");
      const data = (await response.json()) as { leads: Lead[] };
      setLeads(data.leads);
      setActiveLeadId(data.leads[0]?.id ?? null);
      setActivity([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    }
  }

  async function respondToApproval(optionId: string) {
    if (!inputRequest) return;
    try {
      await agent.send({
        inputResponses: [{ requestId: inputRequest.requestId, optionId }],
      });
      await Promise.all([refreshLeads(), refreshActivity()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to respond");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-sm text-[var(--geist-muted)]">
        Loading factory…
      </div>
    );
  }

  if (!lead || !config) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-sm text-[var(--geist-muted)]">
        {error ?? "No leads found."}
      </div>
    );
  }

  const runLabel = isBusy
    ? "Running…"
    : nextLead
      ? `Run pipeline (${nextLead.name})`
      : "All leads processed";

  return (
    <div className="min-h-screen bg-[var(--geist-background)] text-[var(--geist-foreground)]">
      <AppHeader subtitle="Factory" />

      <main className="mx-auto grid max-w-4xl gap-8 px-4 py-8">
        <div className="flex items-center justify-between gap-4">
          <span className="font-mono text-sm text-[var(--geist-muted)]">
            {leads.length} total leads
            {pendingLeads.length > 0
              ? ` · ${pendingLeads.length} pending`
              : null}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void resetEverything()}
              className="geist-btn geist-btn-secondary"
            >
              Reset everything
            </button>
            <button
              type="button"
              disabled={isBusy || !nextLead}
              onClick={() => void runPipeline()}
              className="geist-btn geist-btn-primary"
            >
              {runLabel}
            </button>
          </div>
        </div>

        {error || agent.error ? (
          <div className="rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-subtle)] px-4 py-3 text-sm">
            {error ?? agent.error?.message}
          </div>
        ) : null}

        <section className="rounded-[8px] border border-[var(--geist-border)] p-4">
          <div className="mb-3 text-sm font-medium">Lead queue</div>
          <div className="divide-y divide-[var(--geist-border)] rounded-[8px] border border-[var(--geist-border)]">
            {leads.map((item) => {
              const selected = item.id === lead.id;
              const pending = item.outcome === "open";
              const queuedNext = nextLead?.id === item.id && pending;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveLeadId(item.id)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition ${
                    selected
                      ? "bg-[var(--geist-subtle)]"
                      : "hover:bg-[var(--geist-hover)]"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-medium">{item.name}</div>
                    <div className="truncate text-xs text-[var(--geist-muted)]">
                      {item.company} · {item.source}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs text-[var(--geist-muted)]">
                    {queuedNext ? (
                      <span className="text-[var(--geist-success)]">Up next</span>
                    ) : pending ? (
                      "Pending"
                    ) : (
                      item.outcome
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[8px] border border-[var(--geist-border)] p-4">
          <div className="mb-3 text-sm font-medium">Active lead</div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-[var(--geist-muted)]">Name</span>
              <div>{lead.name}</div>
            </div>
            <div>
              <span className="text-[var(--geist-muted)]">Email</span>
              <div className="text-xs">{lead.email}</div>
            </div>
            <div>
              <span className="text-[var(--geist-muted)]">Company</span>
              <div>
                {lead.company}{" "}
                <span className="text-xs text-[var(--geist-muted)]">
                  ({lead.companyDomain})
                </span>
              </div>
            </div>
            <div>
              <span className="text-[var(--geist-muted)]">Outcome / stage</span>
              <div className="text-xs">
                {lead.outcome} · {lead.currentStage}
              </div>
            </div>
          </div>
          {lead.recommendedNextAction ? (
            <p className="mt-3 text-sm text-[var(--geist-muted)]">
              Next: {lead.recommendedNextAction}
            </p>
          ) : null}
        </section>

        <section className="rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-background)]">
          <button
            type="button"
            onClick={() => setStageTogglesOpen((value) => !value)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <div className="text-sm font-medium">Stage toggles</div>
            <span className="text-xs text-[var(--geist-muted)]">
              {stageTogglesOpen ? "Hide" : "Show"}
            </span>
          </button>
          {stageTogglesOpen ? (
            <div className="border-t border-[var(--geist-border)] px-4 py-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(TOGGLE_LABELS) as ToggleableStage[]).map((stage) => (
                  <label
                    key={stage}
                    className="flex items-center justify-between gap-3 rounded-[8px] border border-[var(--geist-border)] px-3 py-2 text-sm"
                  >
                    <span>{TOGGLE_LABELS[stage]}</span>
                    <input
                      type="checkbox"
                      checked={config.stages[stage]}
                      onChange={() => void toggleStage(stage)}
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {inputRequest ? (
          <section className="rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-subtle)] p-4">
            <div className="mb-2 text-sm font-medium">Approval required</div>
            <p className="mb-3 text-sm text-[var(--geist-muted)]">
              {inputRequest.prompt ?? "Approve send_message draft?"}
            </p>
            <div className="flex gap-2">
              {(inputRequest.options ?? [
                { id: "approve", label: "Approve" },
                { id: "deny", label: "Deny" },
              ]).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => void respondToApproval(option.id)}
                  className="rounded-[8px] border border-[var(--geist-foreground)] bg-[var(--geist-foreground)] px-3 py-2 text-sm font-medium text-[var(--geist-background)]"
                >
                  {option.label ?? option.id}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            Pipeline stages
            {isBusy ? (
              <span className="flex items-center gap-1.5 text-xs text-[var(--geist-muted)]">
                <Spinner /> pipeline running
              </span>
            ) : null}
          </div>
          {STAGE_ORDER.map((stage) => (
            <StageCard
              key={stage}
              stage={stage}
              record={stageRecord(lead, stage)}
              running={isBusy && stage === activeStage}
              liveEvents={stage === activeStage ? activeStageEvents : []}
            />
          ))}
        </section>

        <section>
          <div>
            <div className="mb-3 text-sm font-medium">Activity feed</div>
            <div className="max-h-[28rem] space-y-2 overflow-y-auto rounded-[8px] border border-[var(--geist-border)] p-3">
              {activity.length === 0 ? (
                <p className="text-sm text-[var(--geist-muted)]">
                  Background events will stream here.
                </p>
              ) : (
                activity
                  .filter((event) => !NOISE_EVENT_TYPES.has(event.type))
                  .map((event) => (
                    <div
                      key={event.id}
                      className="border-b border-[var(--geist-border)] pb-2 last:border-b-0"
                    >
                      <div className="text-[11px] text-[var(--geist-muted)]">
                        {new Date(event.timestamp).toLocaleTimeString()} ·{" "}
                        {event.type}
                      </div>
                      <div className="text-sm">{event.summary}</div>
                      <ActivityDetail event={event} />
                    </div>
                  ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
