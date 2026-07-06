"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEveAgent } from "eve/react";

import {
  humanizeActivitySummary,
  shouldShowLivePipelineEvent,
} from "../../agent/lib/activity-copy";
import { SEED_LEAD_IDS } from "../../agent/lib/seed-leads";
import type {
  ActivityEvent,
  Lead,
  PipelineConfig,
  PipelineStage,
  StageRecord,
} from "../../agent/lib/types";
import {
  STAGE_LABELS,
  STAGE_ORDER,
  buildRunMessage,
} from "../lib/pipeline";
import { StageOutput } from "./stage-output";
import { AppHeader } from "./app-header";

type InputRequest = {
  requestId: string;
  prompt?: string;
  options?: Array<{ id: string; label?: string }>;
};

type PipelineRunState = {
  generation: number;
  activeRun?: {
    leadId: string;
    startedAt: string;
  };
};

type PipelineActiveRun = NonNullable<PipelineRunState["activeRun"]>;

function statusColor(status: StageRecord["status"]): string {
  switch (status) {
    case "done":
      return "var(--geist-complete, #3fb950)";
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

// Leads written before a stage existed won't have a record for it.
function stageRecord(lead: Lead, stage: PipelineStage): StageRecord {
  return (
    lead.stages[stage] ?? { status: "pending", updatedAt: lead.createdAt }
  );
}

function leadHasResettableState(lead: Lead): boolean {
  return (
    !SEED_LEAD_IDS.has(lead.id) ||
    lead.currentStage !== "intake" ||
    lead.outcome !== "open" ||
    lead.intentScore !== 0 ||
    lead.engagementEvents.length > 0 ||
    lead.recommendedNextAction !== undefined ||
    Object.entries(lead.stages).some(([stage, record]) => {
      if (stage === "intake") return record.status !== "done";
      return (
        record.status !== "pending" ||
        record.output !== undefined ||
        record.error !== undefined ||
        record.note !== undefined
      );
    })
  );
}

const TERMINAL_ACTIVITY_TYPES = new Set([
  "turn.completed",
  "session.waiting",
  "session.completed",
  "step.failed",
  "turn.failed",
  "session.failed",
]);

const STAGE_TOGGLE_BY_STAGE: Partial<
  Record<PipelineStage, keyof PipelineConfig["stages"]>
> = {
  research: "enrichment",
  qualification: "qualification",
  hypothesis: "hypothesis",
  opportunity_mapping: "opportunity_mapping",
  content_generation: "content_generation",
  sequence_planning: "sequence_planning",
};

const CLIENT_RUN_FOLLOW_TTL_MS = 45 * 60 * 1000;

function isTerminalActivityEvent(event: ActivityEvent): boolean {
  return TERMINAL_ACTIVITY_TYPES.has(event.type);
}

function latestTerminalActivitySince(
  events: ActivityEvent[],
  startedAt?: string,
): ActivityEvent | null {
  if (!startedAt) return null;
  return (
    events.find(
      (event) =>
        event.timestamp >= startedAt && isTerminalActivityEvent(event),
    ) ?? null
  );
}

function clientRunExpired(run: PipelineActiveRun | null): boolean {
  if (!run) return false;
  const startedAt = Date.parse(run.startedAt);
  if (Number.isNaN(startedAt)) return true;
  return Date.now() - startedAt > CLIENT_RUN_FOLLOW_TTL_MS;
}

function stageEnabled(stage: PipelineStage, config: PipelineConfig): boolean {
  const toggle = STAGE_TOGGLE_BY_STAGE[stage];
  return toggle ? config.stages[toggle] : true;
}

function stageIsSettled(record: StageRecord): boolean {
  return record.status !== "pending" && record.status !== "running";
}

function activityTool(event: ActivityEvent): string | undefined {
  const detail = event.detail;
  if (!detail || typeof detail !== "object" || !("tool" in detail)) return;
  const tool = (detail as { tool?: unknown }).tool;
  return typeof tool === "string" ? tool : undefined;
}

function parseActivityInput(event: ActivityEvent): Record<string, unknown> {
  const detail = event.detail;
  if (!detail || typeof detail !== "object" || !("input" in detail)) return {};
  const input = (detail as { input?: unknown }).input;
  if (input && typeof input === "object") return input as Record<string, unknown>;
  if (typeof input !== "string") return {};
  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function activityDetailStage(event: ActivityEvent): PipelineStage | null {
  const detail = event.detail;
  if (!detail || typeof detail !== "object" || !("stage" in detail)) return null;
  const stage = (detail as { stage?: unknown }).stage;
  return typeof stage === "string" && STAGE_ORDER.includes(stage as PipelineStage)
    ? (stage as PipelineStage)
    : null;
}

// The persist tool emits these with detail.stage as it saves each downstream
// stage — the only real per-stage signal the writer path produces.
const STAGE_LIFECYCLE_TYPES = new Set([
  "pipeline.stage.progress",
  "pipeline.stage.done",
  "pipeline.stage.skipped",
]);

// Minimum display time per stage transition. persist_stage_payload emits a
// stage's progress and done events back to back (and a refresh can deliver
// several stages' events in one poll); replaying with a floor per transition
// keeps the walk readable instead of flashing straight to done.
const STAGE_REPLAY_TICK_MS = 550;

// The stages pipeline_writer works through, in the order it composes and
// persists them.
const DOWNSTREAM_STAGES: PipelineStage[] = [
  "qualification",
  "hypothesis",
  "opportunity_mapping",
  "content_generation",
  "sequence_planning",
];

// Shown in a stage card while the writer is composing that stage — the
// writer persists stage by stage, so the first pending stage is genuinely
// the one being worked on. Its real progress/done events replace this line.
const STAGE_RUNNING_LOGS: Partial<Record<PipelineStage, string>> = {
  qualification: "Scoring account fit and buying intent",
  hypothesis: "Turning research into outreach angles",
  opportunity_mapping: "Matching pains to Vercel capabilities",
  content_generation: "Drafting the message and personalized page",
  sequence_planning: "Planning follow-up timing and channels",
};

function stageForActivityEvent(event: ActivityEvent): PipelineStage | null {
  const detailStage = activityDetailStage(event);
  if (detailStage) return detailStage;

  const tool = activityTool(event);
  if (!tool) {
    if (event.type === "subagent.completed") {
      const detail = event.detail;
      const subagentName =
        detail && typeof detail === "object" && "subagentName" in detail
          ? (detail as { subagentName?: unknown }).subagentName
          : undefined;
      return typeof subagentName === "string" &&
        subagentName.toLowerCase().includes("research")
        ? "research"
        : null;
    }
    return null;
  }

  switch (tool) {
    case "get_lead":
    case "create_lead":
      return "intake";
    case "researcher":
    case "web_search":
    case "web_fetch":
    case "save_research_brief":
      return "research";
    case "create_landing_page":
    case "send_message":
      return "content_generation";
    case "save_stage_output": {
      const stage = parseActivityInput(event).stage;
      return typeof stage === "string" && STAGE_ORDER.includes(stage as PipelineStage)
        ? (stage as PipelineStage)
        : null;
    }
    default:
      return null;
  }
}

function leadPipelineSettled(lead: Lead, config: PipelineConfig): boolean {
  if (lead.outcome !== "open") return true;
  return STAGE_ORDER.filter((stage) => stageEnabled(stage, config)).every(
    (stage) => stageIsSettled(stageRecord(lead, stage)),
  );
}

function leadHasPipelineWriteSince(
  lead: Lead,
  config: PipelineConfig,
  startedAt?: string,
): boolean {
  if (!startedAt) return false;
  return STAGE_ORDER.some((stage) => {
    if (stage === "intake" || !stageEnabled(stage, config)) return false;
    const record = stageRecord(lead, stage);
    return record.status !== "pending" && record.updatedAt >= startedAt;
  });
}

function StageCard({
  stage,
  record,
  status,
  running,
  liveEvents,
  syntheticLog,
}: {
  stage: PipelineStage;
  record: StageRecord;
  status: StageRecord["status"];
  running: boolean;
  liveEvents: ActivityEvent[];
  syntheticLog?: string;
}) {
  const [open, setOpen] = useState(false);

  // Auto-open when this stage starts running and stay open after it
  // completes, so each stage's output appears as the pipeline progresses
  // without the operator clicking Show.
  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => setOpen(true), 0);
    return () => window.clearTimeout(id);
  }, [running]);

  // A stage that returns to pending (reset) has nothing to show — collapse.
  useEffect(() => {
    if (running || record.status !== "pending") return;
    const id = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(id);
  }, [record.status, running]);

  const log = liveEvents.filter(shouldShowLivePipelineEvent).slice(0, 8);
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
              style={{ background: statusColor(status) }}
            />
          )}
          <div>
            <div className="text-sm font-medium">{STAGE_LABELS[stage]}</div>
          </div>
        </div>
        <span className="text-xs text-[var(--geist-muted)]">
          {expanded ? "Hide" : "Show"}
        </span>
      </button>
      {running ? (
        <div className="border-t border-[var(--geist-border)] px-4 py-3">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-[var(--geist-muted)]">
            progress
          </div>
          {log.length > 0 ? (
            <div className="space-y-2">
              {log.map((event) => (
                <div key={event.id}>
                  <div className="text-sm">
                    <span className="text-[11px] text-[var(--geist-muted)]">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>{" "}
                    {humanizeActivitySummary(event)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--geist-muted)]">
              {syntheticLog ??
                `Starting ${STAGE_LABELS[stage].toLowerCase()}...`}
            </p>
          )}
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

// Turns a failed agent request into a message a human can act on. The eve
// client's raw errors ("Unauthorized", "Failed to fetch") don't say which
// endpoint failed or what to check.
function describeAgentError(err: unknown): string {
  const raw =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (/401|unauthenticated|unauthorized/i.test(raw)) {
    return "The agent endpoint rejected this browser (401 unauthenticated on /eve/v1/session). The deployment's route auth doesn't admit browser traffic — check the auth walk in agent/channels/eve.ts and redeploy.";
  }
  if (/403|forbidden/i.test(raw)) {
    return "The agent endpoint refused this request (403 forbidden on /eve/v1/session). An authenticator recognized the caller but denied it — check the auth walk in agent/channels/eve.ts.";
  }
  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return "Could not reach the agent endpoint (/eve/v1/session). The network request never completed — check that the deployment is up and serving the eve routes.";
  }
  if (/429|rate.?limit/i.test(raw)) {
    return "The agent endpoint is rate-limiting requests (429). Wait a moment and run the pipeline again.";
  }
  if (/5\d\d|internal server error/i.test(raw)) {
    return `The agent crashed while starting the run (server error on /eve/v1/session). Check the deployment's function logs. Original error: ${raw}`;
  }
  return raw ? `Pipeline run failed: ${raw}` : "Pipeline run failed before the agent could start.";
}

export function FactoryDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [config, setConfig] = useState<PipelineConfig | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [runState, setRunState] = useState<PipelineRunState | null>(null);
  const [clientRun, setClientRun] = useState<PipelineActiveRun | null>(null);
  const [replayRun, setReplayRun] = useState<{
    leadId: string;
    startedAt: string;
  } | null>(null);
  const [replayCount, setReplayCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Surface turn failures even when nothing awaits them (e.g. the stream
  // drops mid-run) — without this the run just stops silently.
  const agent = useEveAgent({
    onError: (err) => setError(describeAgentError(err)),
  });
  const [showPrevLead, setShowPrevLead] = useState(false);
  const [runSubmitting, setRunSubmitting] = useState(false);
  const runSubmittingRef = useRef(false);

  const refreshLeads = useCallback(async () => {
    const response = await fetch("/api/leads", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load leads");
    }
    const data = (await response.json()) as {
      leads: Lead[];
      runState?: PipelineRunState;
    };
    setLeads(data.leads);
    setRunState(data.runState ?? null);
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

  const lead = useMemo(() => {
    if (leads.length === 0) return null;
    const preferredLeadId =
      runState?.activeRun?.leadId ?? clientRun?.leadId ?? activeLeadId;
    if (preferredLeadId) {
      return leads.find((item) => item.id === preferredLeadId) ?? leads[0];
    }
    return leads[0];
  }, [activeLeadId, clientRun?.leadId, leads, runState?.activeRun?.leadId]);

  const agentBusy = agent.status === "submitted" || agent.status === "streaming";
  const stopAgent = agent.stop;
  const serverActiveLeadId = runState?.activeRun?.leadId;
  const clientRunLeadId = clientRun?.leadId;
  const clientRunStartedAt = clientRun?.startedAt;
  const serverRunActiveForSelectedLead =
    Boolean(serverActiveLeadId) && serverActiveLeadId === lead?.id;
  const clientRunActiveForSelectedLead =
    Boolean(clientRunLeadId) && clientRunLeadId === lead?.id;
  const selectedLeadSettled =
    lead && config ? leadPipelineSettled(lead, config) : false;
  const trackedRunStartedAt = serverRunActiveForSelectedLead
    ? runState?.activeRun?.startedAt
    : clientRunActiveForSelectedLead
      ? clientRunStartedAt
      : undefined;
  const selectedLeadHasRunWrite =
    lead && config
      ? leadHasPipelineWriteSince(lead, config, trackedRunStartedAt)
      : false;

  // The eve client stream can desync from the server, leaving `agent.status`
  // pinned on "streaming" after the turn finished. Treat server lifecycle
  // terminals from this run and persisted lead completion as authoritative
  // escape hatches.
  const trackedRunTerminal = Boolean(
    latestTerminalActivitySince(activity, trackedRunStartedAt),
  );
  const localRunExpired = clientRunExpired(clientRun);
  const runActiveForSelectedLead =
    agentBusy ||
    serverRunActiveForSelectedLead ||
    clientRunActiveForSelectedLead;

  const isBusy =
    runSubmitting ||
    (runActiveForSelectedLead &&
      !trackedRunTerminal &&
      !selectedLeadSettled &&
      !localRunExpired);

  // ---- Stage replay ----
  // pipeline.stage.* events from persist_stage_payload are the per-stage
  // truth. Each stage's progress/done pair lands within one poll, so replay
  // the recorded events with a minimum display time per transition to keep
  // the walk readable. replayRun outlives runState/clientRun cleanup so the
  // tail of the walk can finish after the run record clears.
  const selectedLeadId = lead?.id;
  useEffect(() => {
    if (!trackedRunStartedAt || !selectedLeadId) return;
    const id = window.setTimeout(() => {
      setReplayRun((current) =>
        current?.leadId === selectedLeadId &&
        current.startedAt === trackedRunStartedAt
          ? current
          : { leadId: selectedLeadId, startedAt: trackedRunStartedAt },
      );
    }, 0);
    return () => window.clearTimeout(id);
  }, [selectedLeadId, trackedRunStartedAt]);

  const replayKey = replayRun
    ? `${replayRun.leadId}:${replayRun.startedAt}`
    : "";
  useEffect(() => {
    const id = window.setTimeout(() => setReplayCount(0), 0);
    return () => window.clearTimeout(id);
  }, [replayKey]);

  const replayFollowsSelectedLead = replayRun?.leadId === selectedLeadId;
  const runEvents = useMemo(() => {
    const startedAt =
      trackedRunStartedAt ??
      (replayFollowsSelectedLead ? replayRun?.startedAt : undefined);
    if (!startedAt) return [];
    return activity.filter((event) => event.timestamp >= startedAt);
  }, [
    activity,
    replayFollowsSelectedLead,
    replayRun?.startedAt,
    trackedRunStartedAt,
  ]);

  // Chronological stage-lifecycle events for this run (activity is stored
  // newest-first in state).
  const stageTimeline = useMemo(
    () =>
      runEvents
        .slice()
        .reverse()
        .filter(
          (event) =>
            STAGE_LIFECYCLE_TYPES.has(event.type) &&
            activityDetailStage(event) !== null,
        ),
    [runEvents],
  );

  const writerCompleted = useMemo(
    () =>
      runEvents.some((event) => {
        if (event.type === "action.result") {
          return activityTool(event) === "pipeline_writer";
        }
        if (event.type !== "subagent.completed") return false;
        const detail = event.detail;
        const name =
          detail && typeof detail === "object" && "subagentName" in detail
            ? (detail as { subagentName?: unknown }).subagentName
            : undefined;
        return typeof name === "string" && name.includes("pipeline_writer");
      }),
    [runEvents],
  );

  const displayedCount = Math.min(replayCount, stageTimeline.length);
  const pendingReplay = displayedCount < stageTimeline.length;

  useEffect(() => {
    if (!pendingReplay) return;
    const id = window.setTimeout(
      () => setReplayCount((count) => count + 1),
      STAGE_REPLAY_TICK_MS,
    );
    return () => window.clearTimeout(id);
  }, [displayedCount, pendingReplay]);

  const displayStageStatuses = useMemo(() => {
    const statuses = new Map<PipelineStage, StageRecord["status"]>();
    if (!lead) return statuses;
    for (const stage of STAGE_ORDER) {
      statuses.set(stage, stageRecord(lead, stage).status);
    }
    // A stage the replay hasn't reached yet stays visually pending even if
    // its persisted record already settled.
    for (const event of stageTimeline.slice(displayedCount)) {
      const stage = activityDetailStage(event);
      if (stage) statuses.set(stage, "pending");
    }
    const replayLive = isBusy || pendingReplay;
    for (const event of stageTimeline.slice(0, displayedCount)) {
      const stage = activityDetailStage(event);
      if (!stage) continue;
      if (event.type === "pipeline.stage.progress") {
        // A progress event with no done/skipped after it means the save is
        // still in flight (validation failures retry with a fresh progress
        // event). Show running only while the run presentation is live so a
        // stage that ultimately failed falls back to its persisted record.
        if (replayLive) statuses.set(stage, "running");
        continue;
      }
      statuses.set(
        stage,
        event.type === "pipeline.stage.skipped" ? "skipped" : "done",
      );
    }
    return statuses;
  }, [displayedCount, isBusy, lead, pendingReplay, stageTimeline]);

  // isBusy governs run control; uiBusy keeps the running presentation up
  // until the replayed walk has caught up with reality.
  const uiBusy = isBusy || pendingReplay;

  const shouldClearClientRun =
    Boolean(clientRunLeadId) &&
    (serverActiveLeadId === clientRunLeadId ||
      selectedLeadSettled ||
      trackedRunTerminal ||
      localRunExpired);

  useEffect(() => {
    if (!shouldClearClientRun) return;
    const id = window.setTimeout(() => {
      setClientRun(null);
    }, 0);
    return () => window.clearTimeout(id);
  }, [shouldClearClientRun]);

  useEffect(() => {
    if (
      !trackedRunTerminal ||
      selectedLeadSettled ||
      selectedLeadHasRunWrite
    ) {
      return;
    }
    const id = window.setTimeout(() => {
      setError(
        "Pipeline run ended before any stage updated. The agent did not produce tool activity, so no pipeline output was saved.",
      );
    }, 0);
    return () => window.clearTimeout(id);
  }, [selectedLeadHasRunWrite, selectedLeadSettled, trackedRunTerminal]);

  // If the server or lead state says the turn ended but the client stream did
  // not close, abort the stale stream so a new run can start.
  useEffect(() => {
    if ((!trackedRunTerminal && !selectedLeadSettled) || !agentBusy) return;
    const id = window.setTimeout(() => stopAgent(), 3000);
    return () => window.clearTimeout(id);
  }, [trackedRunTerminal, selectedLeadSettled, agentBusy, stopAgent]);

  useEffect(() => {
    if (!agentBusy && !runState?.activeRun && !clientRun && !pendingReplay)
      return;
    const id = window.setInterval(() => {
      void refreshLeads();
      void refreshActivity();
    }, 1500);
    return () => window.clearInterval(id);
  }, [
    agentBusy,
    clientRun,
    pendingReplay,
    refreshActivity,
    refreshLeads,
    runState?.activeRun,
  ]);

  const canRunActiveLead =
    lead?.outcome === "open" &&
    !selectedLeadSettled &&
    !runState?.activeRun &&
    !clientRun;
  const hasResettableState =
    agentBusy ||
    Boolean(runState?.activeRun) ||
    Boolean(clientRun) ||
    activity.length > 0 ||
    leads.some(leadHasResettableState);

  const activeLeadIndex = useMemo(
    () => (lead ? leads.findIndex((item) => item.id === lead.id) : -1),
    [lead, leads],
  );

  function goToLead(offset: number) {
    if (leads.length === 0) return;
    if (offset > 0) setShowPrevLead(true);
    const current = activeLeadIndex >= 0 ? activeLeadIndex : 0;
    const index = (current + offset + leads.length) % leads.length;
    setActiveLeadId(leads[index].id);
  }

  const inputRequest = useMemo(
    () =>
      findInputRequest(
        agent.data.messages as unknown as Array<{ parts: unknown[] }>,
      ),
    [agent.data.messages],
  );

  const stageEvents = useMemo(() => {
    const displayedIds = new Set(
      stageTimeline.slice(0, displayedCount).map((event) => event.id),
    );
    const byStage = new Map<PipelineStage, ActivityEvent[]>();
    for (const event of runEvents) {
      // Hold back stage-lifecycle events the replay hasn't shown yet so a
      // card's log can't announce completion before its spinner arrives.
      if (STAGE_LIFECYCLE_TYPES.has(event.type) && !displayedIds.has(event.id))
        continue;
      const stage = stageForActivityEvent(event);
      if (!stage || !config || !stageEnabled(stage, config)) continue;
      byStage.set(stage, [...(byStage.get(stage) ?? []), event]);
    }
    return byStage;
  }, [config, displayedCount, runEvents, stageTimeline]);

  // The spinner follows the replayed stage-lifecycle events once the writer
  // starts persisting. Before that (the writer's long composition window) no
  // stage events exist yet, so the first unsettled record — qualification,
  // which the writer composes first — holds it.
  const activeStage = useMemo<PipelineStage | null>(() => {
    if (!lead || !config) return null;
    const enabledStages = STAGE_ORDER.filter((stage) =>
      stageEnabled(stage, config),
    );
    const statusOf = (stage: PipelineStage) =>
      displayStageStatuses.get(stage) ?? stageRecord(lead, stage).status;
    const running = enabledStages.find((stage) => statusOf(stage) === "running");
    if (running) return running;
    const firstPending =
      enabledStages.find((stage) => statusOf(stage) === "pending") ?? null;
    // Disqualified early-exit: the writer finished, its recorded walk is
    // fully displayed, and it never touched this downstream stage — the
    // pipeline is winding down, so don't spin up a stage that won't run.
    if (
      firstPending &&
      writerCompleted &&
      !pendingReplay &&
      stageTimeline.length > 0 &&
      DOWNSTREAM_STAGES.includes(firstPending) &&
      !stageTimeline.some(
        (event) => activityDetailStage(event) === firstPending,
      )
    ) {
      return null;
    }
    return firstPending;
  }, [
    config,
    displayStageStatuses,
    lead,
    pendingReplay,
    stageTimeline,
    writerCompleted,
  ]);

  async function runPipeline() {
    if (
      !lead ||
      !config ||
      isBusy ||
      runSubmittingRef.current ||
      !canRunActiveLead
    ) {
      return;
    }
    runSubmittingRef.current = true;
    setRunSubmitting(true);
    setError(null);
    setClientRun({ leadId: lead.id, startedAt: new Date().toISOString() });
    try {
      await agent.send({ message: buildRunMessage(lead, config) });
      await Promise.all([
        refreshLeads(),
        refreshActivity(),
      ]);
    } catch (err) {
      setClientRun(null);
      setError(describeAgentError(err));
    } finally {
      runSubmittingRef.current = false;
      setRunSubmitting(false);
    }
  }

  async function resetEverything() {
    setError(null);
    try {
      agent.stop();
    } catch {
      // no active request to stop
    }
    runSubmittingRef.current = false;
    setRunSubmitting(false);
    setClientRun(null);
    setReplayRun(null);
    setReplayCount(0);
    agent.reset();
    try {
      const response = await fetch("/api/reset", { method: "POST" });
      if (!response.ok) throw new Error("Reset failed");
      const data = (await response.json()) as { leads: Lead[] };
      setLeads(data.leads);
      setRunState(null);
      setActiveLeadId(data.leads[0]?.id ?? null);
      setShowPrevLead(false);
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

  const runLabel = uiBusy
    ? "Running…"
    : lead && canRunActiveLead
      ? "Run pipeline"
      : lead
        ? "Lead processed"
        : "Run pipeline";

  return (
    <div className="min-h-screen bg-[var(--geist-background)] text-[var(--geist-foreground)]">
      <AppHeader />

      <main className="mx-auto grid max-w-4xl gap-8 px-4 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium">
              New leads{" "}
              <span className="text-[var(--geist-muted)]">
                (pulled from Salesforce)
              </span>
            </div>
            <div className="mt-1 font-mono text-xs text-[var(--geist-muted)]">
              {activeLeadIndex + 1} / {leads.length}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasResettableState ? (
              <button
                type="button"
                onClick={() => void resetEverything()}
                className="geist-btn geist-btn-secondary"
              >
                Reset
              </button>
            ) : null}
            <button
              type="button"
              disabled={uiBusy || !canRunActiveLead}
              onClick={() => void runPipeline()}
              className="geist-btn geist-btn-primary"
            >
              {runLabel}
            </button>
          </div>
        </div>

        {error || agent.error ? (
          <div
            role="alert"
            className="rounded-[8px] border px-4 py-3 text-sm"
            style={{
              borderColor: "var(--geist-error)",
              background: "var(--geist-error-soft)",
            }}
          >
            {error ?? (agent.error ? describeAgentError(agent.error) : null)}
          </div>
        ) : null}

        <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-3">
          <div className="h-9 w-9">
            <button
              type="button"
              onClick={() => goToLead(-1)}
              aria-label="Previous lead"
              tabIndex={showPrevLead ? 0 : -1}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-[var(--geist-border)] text-[var(--geist-muted)] transition hover:bg-[var(--geist-hover)] hover:text-[var(--geist-foreground)] ${
                showPrevLead ? "" : "invisible pointer-events-none"
              }`}
            >
              ←
            </button>
          </div>
          <section className="min-w-0 flex-1 rounded-[8px] border border-[var(--geist-border)] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-medium">Active lead</div>
              <span className="font-mono text-xs text-[var(--geist-muted)]">
                {activeLeadIndex + 1} / {leads.length}
              </span>
            </div>
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
          <button
            type="button"
            onClick={() => goToLead(1)}
            aria-label="Next lead"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[var(--geist-border)] text-[var(--geist-muted)] transition hover:bg-[var(--geist-hover)] hover:text-[var(--geist-foreground)]"
          >
            →
          </button>
        </div>

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
            {uiBusy ? (
              <span className="flex items-center gap-1.5 text-xs text-[var(--geist-muted)]">
                <Spinner /> pipeline running
              </span>
            ) : null}
          </div>
          {STAGE_ORDER.map((stage) => (
            <StageCard
              // Keyed by lead so switching leads remounts the cards closed
              // instead of carrying over the previous lead's open state.
              key={`${lead.id}:${stage}`}
              stage={stage}
              record={stageRecord(lead, stage)}
              status={
                displayStageStatuses.get(stage) ??
                stageRecord(lead, stage).status
              }
              running={uiBusy && stage === activeStage}
              liveEvents={stageEvents.get(stage) ?? []}
              syntheticLog={STAGE_RUNNING_LOGS[stage]}
            />
          ))}
        </section>
      </main>
    </div>
  );
}
