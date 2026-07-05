"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  ContentGenerationOutput,
  EngagementIntentOutput,
  HypothesisOutput,
  Lead,
  MessagingStrategyOutput,
  PipelineStage,
  QualificationOutput,
  ResearchBrief,
  SendRecord,
} from "../../agent/lib/types";
import { StageOutput } from "./stage-output";
import { AppHeader } from "./app-header";
import {
  DEMO_LEAD_IDS,
  DEMO_REVIEW_LEAD,
  DEMO_REVIEW_LEAD_ID,
} from "../lib/demo-review-lead";
import {
  DEMO_IN_PROCESS_LEADS,
  type DemoEngagement,
  type DemoInProcessLead,
  type DemoIntentTrend,
  type DemoSequenceTouchStatus,
} from "../lib/demo-in-process";
import {
  DEMO_COMPLETE_LEADS,
  type DemoCompleteLead,
  type DemoJourneyEventKind,
} from "../lib/demo-complete";
import {
  COCKROACH_INTAKE,
  COCKROACH_MESSAGING,
  COCKROACH_OPPORTUNITIES,
  COCKROACH_QUALIFICATION,
  COCKROACH_RESEARCH,
  REPLIT_INTAKE,
  REPLIT_QUALIFICATION,
  REPLIT_RESEARCH,
} from "../lib/demo-needs-review";
import { STAGE_LABELS, STAGE_ORDER, STRIP_STAGE_LABELS } from "../lib/pipeline";
import { withDemoLeads } from "../lib/review-queue";

type ReviewAction = "approve" | "deny" | "edit";
type DashboardPanel = "needs_review" | "in_process" | "complete";

type ReviewItem = {
  lead: Lead;
  content: ContentGenerationOutput;
  send: SendRecord;
  qualification?: QualificationOutput;
  research?: ResearchBrief;
  hypothesis?: HypothesisOutput;
  messaging?: MessagingStrategyOutput;
  engagement?: EngagementIntentOutput;
};

type ReviewCardKind = "qualification" | "messaging" | "send";
type PipelineStepState = "done" | "current" | "future" | "missed";

type ReviewPipelineStep = {
  label: string;
  state: PipelineStepState;
  // When a step carries the stage's saved output, the strip chip becomes
  // clickable and reveals it via the shared StageOutput renderer.
  stage?: PipelineStage;
  output?: unknown;
};

type PipelineReviewCard = {
  id: string;
  kind: ReviewCardKind;
  leadName: string;
  company: string;
  source: string;
  currentStage: string;
  blockedBy: string;
  approvalReason: string;
  completedActions: string[];
  nextRequiredAction: string;
  recommendedDecision: string;
  pipelineSteps: ReviewPipelineStep[];
  evidence: string[];
  guardrails: string[];
  score?: number;
  item?: ReviewItem;
};

type MetricTone = "warning" | "success" | "neutral";

const METRIC_TONE_STYLES: Record<
  MetricTone,
  { color: string; background: string }
> = {
  warning: {
    color: "var(--geist-warning)",
    background: "var(--geist-warning-soft)",
  },
  success: {
    color: "var(--geist-success)",
    background: "var(--geist-accent-soft)",
  },
  neutral: {
    color: "var(--geist-muted)",
    background: "var(--geist-subtle)",
  },
};

const DATE_RANGE_LABELS = [
  "Today",
  "Last 7 days",
  "Last 30 days",
  "All",
] as const;

function toReviewItem(lead: Lead): ReviewItem | null {
  const content = lead.stages.content_generation?.output;
  if (!content?.send) return null;
  return {
    lead,
    content,
    send: content.send,
    qualification: lead.stages.qualification?.output,
    research: lead.stages.research?.output,
    hypothesis: lead.stages.hypothesis?.output,
    messaging: content.messagingStrategy,
    engagement: lead.stages.engagement_intent?.output,
  };
}

function formatWhen(iso?: string, timezone?: string): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return date.toLocaleString(undefined, {
      timeZone: timezone,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return date.toLocaleString();
  }
}

function formatSource(source: string): string {
  return source.replace(/-/g, " ");
}

function formatCloseRate(closed: number, total: number): string {
  if (total === 0) return "0%";
  const rate = (closed / total) * 100;
  if (rate > 0 && rate < 1) return "<1%";
  return `${Math.round(rate)}%`;
}

function messagingAngle(item: ReviewItem): string | undefined {
  return (
    item.messaging?.messagingAngle ??
    item.hypothesis?.hypotheses?.[0]?.statement
  );
}

function applySendAction(
  lead: Lead,
  action: ReviewAction,
  edits?: { subject: string; body: string },
): Lead {
  const content = lead.stages.content_generation?.output;
  if (!content?.send) return lead;

  const send = { ...content.send };
  if (edits?.subject !== undefined && edits.subject.trim()) {
    send.subject = edits.subject.trim();
  }
  if (edits?.body !== undefined && edits.body.trim()) {
    send.body = edits.body.trim();
  }

  const now = new Date().toISOString();
  if (action === "approve") {
    send.status = "approved";
    send.approvedAt = now;
    delete send.deniedAt;
  } else if (action === "deny") {
    send.status = "denied";
    send.deniedAt = now;
    delete send.approvedAt;
  } else {
    send.status = "drafted";
    delete send.approvedAt;
    delete send.deniedAt;
  }

  return {
    ...lead,
    stages: {
      ...lead.stages,
      content_generation: {
        ...lead.stages.content_generation,
        status: lead.stages.content_generation?.status ?? "done",
        updatedAt: now,
        output: {
          ...content,
          subjectLines: [send.subject],
          emailBody: send.body,
          send,
        },
      },
    },
  };
}

function SourceChip({ source }: { source: string }) {
  return (
    <span className="rounded-full border border-[var(--geist-border)] px-2 py-0.5 text-[11px] capitalize text-[var(--geist-muted)]">
      {formatSource(source)}
    </span>
  );
}

function DateRangeControl() {
  return (
    <div className="geist-btn-group shrink-0" aria-label="Date range">
      {DATE_RANGE_LABELS.map((label, index) => (
        <button
          key={label}
          type="button"
          aria-pressed={index === 0}
          className="geist-btn text-xs"
          style={
            index === 0
              ? {
                  background: "var(--geist-foreground)",
                  color: "var(--geist-background)",
                }
              : {
                  background: "var(--geist-background)",
                  color: "var(--geist-muted)",
                }
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function DashboardMetricCard({
  label,
  value,
  detail,
  tone,
  selected,
  onSelect,
}: {
  label: string;
  value: string;
  detail: string;
  tone: MetricTone;
  selected: boolean;
  onSelect: () => void;
}) {
  const style = METRIC_TONE_STYLES[tone];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${label}: ${value}`}
      aria-pressed={selected}
      className="rounded-[8px] border bg-[var(--geist-surface)] p-4 text-left transition hover:bg-[var(--geist-hover)]"
      style={{
        borderColor: selected ? "var(--geist-foreground)" : "var(--geist-border)",
        boxShadow: selected
          ? "0 0 0 1px var(--geist-foreground), var(--geist-shadow-sm)"
          : "var(--geist-shadow-sm)",
      }}
    >
      <h2 className="text-sm font-medium text-[var(--geist-muted)]">{label}</h2>
      <div className="mt-4 font-mono text-3xl font-semibold leading-none">
        {value}
      </div>
      <p
        className="mt-3 min-h-10 text-sm leading-5"
        style={{
          color: tone === "neutral" ? "var(--geist-muted)" : style.color,
        }}
      >
        {detail}
      </p>
    </button>
  );
}

const REVIEW_KIND_LABELS: Record<ReviewCardKind, string> = {
  qualification: "Qualification review",
  messaging: "Messaging review",
  send: "Send approval",
};

const PIPELINE_STEP_STYLE: Record<
  PipelineStepState,
  { color: string; background: string; border: string }
> = {
  done: {
    color: "var(--geist-complete, #3fb950)",
    background:
      "var(--geist-complete-soft, color-mix(in srgb, #3fb950 12%, transparent))",
    border: "var(--geist-complete, #3fb950)",
  },
  current: {
    color: "var(--geist-warning)",
    background: "var(--geist-warning-soft)",
    border: "var(--geist-warning)",
  },
  future: {
    color: "var(--geist-muted)",
    background: "var(--geist-background)",
    border: "var(--geist-border)",
  },
  missed: {
    color: "var(--geist-error)",
    background: "var(--geist-error-soft)",
    border: "var(--geist-error)",
  },
};

// Completed (and in-review) steps carry the stage's saved output so the
// salesperson can click each chip and see exactly what the agent produced.
const QUALIFICATION_PIPELINE: ReviewPipelineStep[] = [
  { label: "Intake", state: "done", stage: "intake", output: REPLIT_INTAKE },
  {
    label: "Research",
    state: "done",
    stage: "research",
    output: REPLIT_RESEARCH,
  },
  {
    label: "Qualification",
    state: "current",
    stage: "qualification",
    output: REPLIT_QUALIFICATION,
  },
  { label: "Opportunity", state: "future" },
  { label: "Messaging", state: "future" },
  { label: "Sequence", state: "future" },
  { label: "Send", state: "future" },
];

const MESSAGING_PIPELINE: ReviewPipelineStep[] = [
  { label: "Intake", state: "done", stage: "intake", output: COCKROACH_INTAKE },
  {
    label: "Research",
    state: "done",
    stage: "research",
    output: COCKROACH_RESEARCH,
  },
  {
    label: "Qualification",
    state: "done",
    stage: "qualification",
    output: COCKROACH_QUALIFICATION,
  },
  {
    label: "Opportunity",
    state: "done",
    stage: "opportunity_mapping",
    output: COCKROACH_OPPORTUNITIES,
  },
  {
    label: "Messaging",
    state: "current",
    stage: "content_generation",
    output: { messagingStrategy: COCKROACH_MESSAGING },
  },
  { label: "Sequence", state: "future" },
  { label: "Draft", state: "future" },
  { label: "Send", state: "future" },
];

// The send-approval card is built from a real review lead, so its strip pulls
// outputs straight from that lead's stages.
function buildSendPipeline(item: ReviewItem): ReviewPipelineStep[] {
  const stages = item.lead.stages;
  return [
    {
      label: "Intake",
      state: "done",
      stage: "intake",
      output: stages.intake?.output,
    },
    {
      label: "Research",
      state: "done",
      stage: "research",
      output: stages.research?.output,
    },
    {
      label: "Qualification",
      state: "done",
      stage: "qualification",
      output: stages.qualification?.output,
    },
    {
      label: "Opportunity",
      state: "done",
      stage: "opportunity_mapping",
      output: stages.opportunity_mapping?.output,
    },
    {
      label: "Messaging",
      state: "done",
      stage: "content_generation",
      output: stages.content_generation?.output,
    },
    {
      label: "Sequence",
      state: "done",
      stage: "sequence_planning",
      output: stages.sequence_planning?.output,
    },
    {
      label: "Send",
      state: "current",
      stage: "content_generation",
      output: item.send ? { send: item.send } : undefined,
    },
  ];
}

function pipelineStripGridClass(stepCount: number): string {
  if (stepCount >= 8) return "sm:grid-cols-4 lg:grid-cols-8";
  if (stepCount === 7) return "sm:grid-cols-4 lg:grid-cols-7";
  return "sm:grid-cols-4";
}

function PipelineStrip({ steps }: { steps: ReviewPipelineStep[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const interactive = steps.some((step) => step.output !== undefined);
  const open = openIndex !== null ? steps[openIndex] : undefined;
  // One label size for the whole strip, chosen by its longest title, so
  // every chip reads identically; long titles shrink instead of truncating.
  const labelSizeClass = steps.some((step) => step.label.length > 11)
    ? "text-[11px] tracking-tight"
    : "text-xs";
  const chipClassName =
    "flex h-12 w-full flex-col justify-between rounded-[8px] border px-2 pb-2 pt-1.5 text-left";

  return (
    <div>
      <ol
        className={`grid grid-cols-2 gap-1.5 ${pipelineStripGridClass(steps.length)}`}
      >
        {steps.map((step, index) => {
          const style = PIPELINE_STEP_STYLE[step.state];
          const clickable = step.output !== undefined;
          const selected = openIndex === index;
          const chipStyle = {
            color: style.color,
            background: style.background,
            borderColor: style.border,
            boxShadow: selected
              ? "0 0 0 1px var(--geist-foreground)"
              : undefined,
          };
          const body = (
            <>
              <span className="flex items-center justify-between font-mono text-[10px] leading-none opacity-60">
                <span>{index + 1}</span>
                {clickable ? (
                  <span aria-hidden="true">{selected ? "−" : "+"}</span>
                ) : null}
              </span>
              <span
                className={`block truncate font-medium leading-none ${labelSizeClass}`}
              >
                {step.label}
              </span>
            </>
          );
          return (
            <li key={`${step.label}-${index}`} className="min-w-0">
              {clickable ? (
                <button
                  type="button"
                  onClick={() => setOpenIndex(selected ? null : index)}
                  aria-expanded={selected}
                  aria-label={`${step.label} — ${selected ? "hide" : "show"} output`}
                  title={step.label}
                  className={`${chipClassName} transition hover:opacity-80`}
                  style={chipStyle}
                >
                  {body}
                </button>
              ) : (
                <div
                  className={chipClassName}
                  style={chipStyle}
                  title={step.label}
                >
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {interactive ? (
        <p className="mt-2 text-xs text-[var(--geist-muted)]">
          Click a stage to see exactly what the agent produced there.
        </p>
      ) : null}
      {open?.output !== undefined && open.stage ? (
        <div className="mt-3 rounded-[8px] border border-[var(--geist-border)] p-3">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-[var(--geist-border)] pb-3">
            <h4 className="text-sm font-medium">{open.label}</h4>
            <button
              type="button"
              onClick={() => setOpenIndex(null)}
              className="text-xs text-[var(--geist-muted)] hover:text-[var(--geist-foreground)]"
            >
              Hide
            </button>
          </div>
          <StageOutput stage={open.stage} output={open.output} />
        </div>
      ) : null}
    </div>
  );
}

const SEQUENCE_TOUCH_STATE: Record<DemoSequenceTouchStatus, PipelineStepState> =
  {
    sent: "done",
    next: "current",
    scheduled: "future",
  };

type IntentBand = {
  label: string;
  color: string;
  background: string;
};

// Bands carry an explicit label so intent never reads by color alone.
function intentBand(score: number): IntentBand {
  if (score >= 7) {
    return {
      label: "High intent",
      color: "var(--geist-success)",
      background: "var(--geist-accent-soft)",
    };
  }
  if (score >= 5) {
    return {
      label: "Warming",
      color: "var(--geist-warning)",
      background: "var(--geist-warning-soft)",
    };
  }
  return {
    label: "Low signal",
    color: "var(--geist-muted)",
    background: "var(--geist-subtle)",
  };
}

const INTENT_TREND: Record<DemoIntentTrend, { arrow: string; label: string }> = {
  rising: { arrow: "↑", label: "Rising" },
  steady: { arrow: "→", label: "Steady" },
  cooling: { arrow: "↓", label: "Cooling" },
};

function formatDelta(value: number): string {
  if (value === 0) return "±0.0";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function IntentPill({ engagement }: { engagement: DemoEngagement }) {
  const band = intentBand(engagement.intentScore);
  const trend = INTENT_TREND[engagement.trend];
  return (
    <span
      className="rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium"
      style={{ color: band.color, background: band.background }}
    >
      Intent {engagement.intentScore.toFixed(1)} {trend.arrow} · {band.label}
    </span>
  );
}

// A title with an obvious hover affordance (dashed underline + info dot) that
// reveals an explanatory tooltip on hover or keyboard focus.
function HoverHint({
  label,
  hintId,
  children,
}: {
  label: string;
  hintId: string;
  children: ReactNode;
}) {
  return (
    <span
      tabIndex={0}
      aria-describedby={hintId}
      className="group relative inline-flex cursor-help items-center gap-1.5 outline-none"
    >
      <span className="border-b border-dashed border-[var(--geist-muted)] pb-0.5">
        {label}
      </span>
      <span
        aria-hidden="true"
        className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-[var(--geist-muted)] font-mono text-[9px] leading-none text-[var(--geist-muted)]"
      >
        i
      </span>
      <span
        id={hintId}
        role="tooltip"
        className="invisible absolute left-0 top-full z-10 mt-2 w-72 rounded-[8px] border border-[var(--geist-border)] p-3 text-sm font-normal leading-relaxed text-[var(--geist-foreground)] opacity-0 transition-opacity duration-100 group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100 sm:w-96"
        style={{
          background: "var(--geist-background)",
          boxShadow: "var(--geist-shadow)",
        }}
      >
        {children}
      </span>
    </span>
  );
}

function EngagementSection({ engagement }: { engagement: DemoEngagement }) {
  const band = intentBand(engagement.intentScore);
  const trend = INTENT_TREND[engagement.trend];

  return (
    <DetailSection
      title={
        <HoverHint
          label="Engagement agent — live buying signals"
          hintId="engagement-agent-hint"
        >
          The engagement agent takes over once outreach is sent. It watches
          every buying signal — email opens, replies, pricing-page visits,
          docs views, product signups, content downloads, meeting bookings,
          and website activity — weighs each one, and continuously re-scores
          how likely this account is to buy. The intent score, confidence,
          and recommended next action update the moment a new signal lands.
        </HoverHint>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--geist-muted)]">
            Intent score
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold leading-none">
              {engagement.intentScore.toFixed(1)}
            </span>
            <span className="text-sm text-[var(--geist-muted)]">/ 10</span>
            <span
              className="font-mono text-xs font-medium"
              style={{
                color:
                  engagement.deltaThisWeek > 0
                    ? "var(--geist-success)"
                    : "var(--geist-muted)",
              }}
            >
              {formatDelta(engagement.deltaThisWeek)} this week
            </span>
          </div>
          <div
            role="meter"
            aria-label="Intent score"
            aria-valuemin={0}
            aria-valuemax={10}
            aria-valuenow={engagement.intentScore}
            className="mt-3 h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: band.background }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, engagement.intentScore * 10)}%`,
                background: band.color,
              }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--geist-muted)]">
            <span style={{ color: band.color }}>{band.label}</span>
            <span>
              {trend.arrow} {trend.label}
            </span>
            <span className="font-mono">
              Confidence {Math.round(engagement.confidence * 100)}%
            </span>
          </div>

          <div className="mt-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--geist-muted)]">
              What moves the score
            </div>
            <ul className="mt-2 space-y-1.5 text-sm">
              {engagement.signalBreakdown.map((entry) => (
                <li
                  key={entry.signal}
                  className="flex items-center justify-between gap-3"
                >
                  <span
                    className={
                      entry.weight === 0
                        ? "text-[var(--geist-muted)]"
                        : undefined
                    }
                  >
                    {entry.signal}
                  </span>
                  <span
                    className="font-mono text-xs"
                    style={{
                      color:
                        entry.weight > 0
                          ? "var(--geist-success)"
                          : "var(--geist-muted)",
                    }}
                  >
                    {formatDelta(entry.weight)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--geist-muted)]">
            Signal timeline
          </div>
          <ol className="mt-2 space-y-3">
            {engagement.timeline.map((event) => {
              const outbound = event.kind === "outbound";
              return (
                <li key={event.id} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full border"
                    style={
                      outbound
                        ? {
                            background: "var(--geist-background)",
                            borderColor: "var(--geist-border)",
                          }
                        : {
                            background: "var(--geist-accent-soft)",
                            borderColor: "var(--geist-success)",
                          }
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span
                        className={`text-sm ${
                          outbound
                            ? "text-[var(--geist-muted)]"
                            : "font-medium"
                        }`}
                      >
                        {event.label}
                      </span>
                      {event.delta !== undefined ? (
                        <span
                          className="font-mono text-xs"
                          style={{ color: "var(--geist-success)" }}
                        >
                          {formatDelta(event.delta)}
                        </span>
                      ) : null}
                    </div>
                    {event.detail ? (
                      <p className="mt-0.5 text-sm text-[var(--geist-muted)]">
                        {event.detail}
                      </p>
                    ) : null}
                    <p className="mt-0.5 font-mono text-[11px] text-[var(--geist-muted)]">
                      {event.timing}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          {engagement.timeline.length <= 1 ? (
            <p className="mt-3 text-sm text-[var(--geist-muted)]">
              No inbound signals yet — the agent re-scores as soon as one
              lands.
            </p>
          ) : null}
        </div>
      </div>
    </DetailSection>
  );
}

const SEQUENCE_TOUCH_BADGES: Record<DemoSequenceTouchStatus, string> = {
  sent: "Sent",
  next: "Up next",
  scheduled: "Scheduled",
};

function SequenceTimeline({ lead }: { lead: DemoInProcessLead }) {
  return (
    <ol className="space-y-3">
      {lead.sequence.map((touch) => {
        const style = PIPELINE_STEP_STYLE[SEQUENCE_TOUCH_STATE[touch.status]];
        return (
          <li key={touch.id} className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full border"
              style={{ background: style.background, borderColor: style.border }}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{touch.label}</span>
                <span className="font-mono text-[11px] text-[var(--geist-muted)]">
                  day {touch.day}
                </span>
                <span
                  className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    color: style.color,
                    background: style.background,
                    borderColor: style.border,
                  }}
                >
                  {SEQUENCE_TOUCH_BADGES[touch.status]}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-[var(--geist-muted)]">
                {touch.detail}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-[var(--geist-muted)]">
                {touch.timing}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function InProcessCard({
  lead,
  expanded,
  onToggle,
}: {
  lead: DemoInProcessLead;
  expanded: boolean;
  onToggle: () => void;
}) {
  // Every stage completed; each chip carries the stage's saved output so the
  // strip doubles as the stage-by-stage record. "Send approved" opens just
  // the approved send details.
  const send = lead.stages.content_generation?.output?.send;
  const pipelineSteps: ReviewPipelineStep[] = [
    ...STAGE_ORDER.map((stage) => ({
      label: STRIP_STAGE_LABELS[stage],
      state: "done" as const,
      stage,
      output: lead.stages[stage]?.output,
    })),
    {
      label: "Send",
      state: "done" as const,
      stage: "content_generation" as const,
      output: send ? { send } : undefined,
    },
  ];

  return (
    <article
      className="rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-background)]"
      style={{ boxShadow: "var(--geist-shadow-sm)" }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-4 px-4 py-4 text-left sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{lead.name}</span>
            <span className="text-xs text-[var(--geist-muted)]">
              {lead.company}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <IntentPill engagement={lead.engagement} />
            <span className="rounded-full border border-[var(--geist-border)] px-2 py-0.5 text-[11px] text-[var(--geist-muted)]">
              Waiting on reply
            </span>
          </div>
          <p className="text-sm text-[var(--geist-muted)]">
            {lead.waitingSummary}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <span className="text-xs text-[var(--geist-muted)]">
            {expanded ? "Collapse" : "Expand"}
          </span>
          <span className="font-mono text-[11px] text-[var(--geist-muted)]">
            {lead.nextTouchLabel}
          </span>
        </div>
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-[var(--geist-border)] px-4 py-4">
          <div>
            <h3 className="mb-2 text-sm font-medium">
              Pipeline{" "}
              <span className="font-normal text-[var(--geist-muted)]">
                — every stage complete
              </span>
            </h3>
            <PipelineStrip steps={pipelineSteps} />
          </div>

          <EngagementSection engagement={lead.engagement} />

          <DetailSection title="What happens next">
            <p className="mb-3 text-sm leading-relaxed">
              Outreach sequence{" "}
              <span className="font-mono text-xs">{lead.cadence}</span>,{" "}
              {lead.timing}. The agent holds each touch until its send window
              and exits the sequence the moment a reply lands.
            </p>
            <SequenceTimeline lead={lead} />
            <p className="mt-4 border-t border-[var(--geist-border)] pt-3 text-xs text-[var(--geist-muted)]">
              Sequence exits when: {lead.exitConditions.join(" · ")}
            </p>
          </DetailSection>
        </div>
      ) : null}
    </article>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[8px] border border-[var(--geist-border)] p-3">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span
            aria-hidden="true"
            className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ background: "var(--geist-complete, #3fb950)" }}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function GuardrailList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span
            aria-hidden="true"
            className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-[var(--geist-warning)]"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function buildNeedsReviewCards(sendItem: ReviewItem): PipelineReviewCard[] {
  const sendBy = formatWhen(
    sendItem.send.sendWindow.recommendedAt,
    sendItem.send.sendWindow.timezone,
  );
  const sendAngle = messagingAngle(sendItem);

  return [
    {
      id: "demo-qualification-review",
      kind: "qualification",
      leadName: "Amjad Masad",
      company: "Replit",
      source: "product-signup",
      currentStage: "Qualification review",
      blockedBy: "High-value executive account",
      approvalReason:
        "The agent found a strong ICP fit and an executive contact. Configure requires human confirmation before spending more agent work on strategic accounts.",
      completedActions: [
        "Captured lead from product signup and normalized the company domain.",
        "Researched Replit's AI coding agent motion and developer audience.",
        "Scored the account 8.1 overall with strong engineering maturity and buying-authority signals.",
      ],
      nextRequiredAction:
        "Confirm whether this account is worth pursuing before opportunity mapping starts.",
      recommendedDecision: "Approve pursuit and let the agent continue.",
      pipelineSteps: QUALIFICATION_PIPELINE,
      evidence: [
        "Product signup came from a developer-platform company.",
        "Public AI coding agent launches make the timing relevant.",
        "Executive buyer plus high-growth developer audience matches ICP.",
      ],
      guardrails: [
        "Approve before contacting C-level executives.",
        "High-priority strategic accounts need a human before sequence work.",
      ],
      score: 8.1,
    },
    {
      id: "demo-messaging-review",
      kind: "messaging",
      leadName: "Spencer Kimball",
      company: "Cockroach Labs",
      source: "demo-request",
      currentStage: "Messaging review",
      blockedBy: "Executive touch plus strategic positioning",
      approvalReason:
        "The agent mapped a platform-team opportunity and proposed a messaging angle. Configure requires a BDR to approve the angle before the agent plans the sequence and writes the first draft.",
      completedActions: [
        "Mapped the pain from internal developer portals to Vercel preview deploys and edge delivery.",
        "Selected a peer-engineer messaging angle for infrastructure leaders.",
      ],
      nextRequiredAction:
        "Approve the messaging angle, or request a rewrite before sequence planning and draft generation.",
      recommendedDecision:
        "Approve the angle; it is concise and tied to real developer-experience pain.",
      pipelineSteps: MESSAGING_PIPELINE,
      evidence: [
        "Demo request submitted this week.",
        "Public investment in developer experience and internal tooling.",
        "Multi-product engineering org with portal sprawl risk.",
      ],
      guardrails: [
        "Approve before contacting C-level executives.",
        "Approve strategic claims before draft generation.",
        "Sequence timing must respect configured send windows and exit conditions.",
      ],
      score: 8.6,
    },
    {
      id: `demo-send-review-${sendItem.lead.id}`,
      kind: "send",
      leadName: sendItem.lead.name,
      company: sendItem.lead.company,
      source: sendItem.lead.source,
      currentStage: "Human send approval",
      blockedBy: "Outbound send gate",
      approvalReason:
        "The full pipeline is complete, but Configure is set to approve every send. Nothing has been sent until a BDR approves this draft.",
      completedActions: [
        "Researched the account and contact.",
        `Qualified the lead${
          sendItem.qualification
            ? ` at ${sendItem.qualification.scores.overallPriority.toFixed(1)}/10`
            : ""
        }.`,
        sendAngle
          ? `Selected messaging angle: ${sendAngle}`
          : "Selected a concise technical messaging angle.",
        sendItem.content.landingPageSlug
          ? "Generated a personalized landing page for the email."
          : "Prepared outreach without a landing page.",
        sendBy
          ? `Queued the draft for the recommended send window: ${sendBy}.`
          : "Queued the draft for BDR review.",
      ],
      nextRequiredAction:
        "Approve, edit, or deny the outbound email before the send can be released.",
      recommendedDecision: "Review the copy, then approve if it matches your voice.",
      pipelineSteps: buildSendPipeline(sendItem),
      evidence:
        sendItem.hypothesis?.hypotheses?.[0]?.evidence ??
        sendItem.research?.company.growthSignals ??
        [],
      guardrails: [
        "Outbound send approval: Every send.",
        "Approve any claim about pricing, discounts, or strategic customer fit.",
        "Hard refusals block fabricated customer references and unsourced claims.",
      ],
      score: sendItem.qualification?.scores.overallPriority,
      item: sendItem,
    },
  ];
}

function demoActionLabels(kind: ReviewCardKind): {
  primary: string;
  secondary: string;
  primaryDone: string;
  secondaryDone: string;
} {
  if (kind === "qualification") {
    return {
      primary: "Approve pursuit",
      secondary: "Mark not worth pursuing",
      primaryDone: "we will continue the pipeline",
      secondaryDone: "Marked not worth pursuing",
    };
  }
  return {
    primary: "Approve angle",
    secondary: "Request rewrite",
    primaryDone: "we will continue the pipeline",
    secondaryDone: "Rewrite requested",
  };
}

function PipelineReviewCard({
  card,
  expanded,
  demoDecision,
  onToggle,
  onDemoDecision,
  onDecide,
}: {
  card: PipelineReviewCard;
  expanded: boolean;
  demoDecision?: string;
  onToggle: () => void;
  onDemoDecision: (cardId: string, decision: string) => void;
  onDecide: (
    leadId: string,
    action: ReviewAction,
    edits?: { subject: string; body: string },
  ) => Promise<void>;
}) {
  const send = card.item?.send;
  const pending = send?.status === "drafted";
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(send?.subject ?? "");
  const [body, setBody] = useState(send?.body ?? "");
  const [busy, setBusy] = useState<ReviewAction | null>(null);
  const labels = demoActionLabels(card.kind);

  function startEditing() {
    setSubject(send?.subject ?? "");
    setBody(send?.body ?? "");
    setEditing(true);
  }

  async function decide(action: ReviewAction, withEdits: boolean) {
    if (!card.item) return;
    setBusy(action);
    try {
      await onDecide(
        card.item.lead.id,
        action,
        withEdits ? { subject, body } : undefined,
      );
      setEditing(false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <article
      className="rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-background)]"
      style={{ boxShadow: "var(--geist-shadow-sm)" }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-4 px-4 py-4 text-left sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{card.leadName}</span>
            <span className="text-xs text-[var(--geist-muted)]">
              {card.company}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--geist-warning-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--geist-warning)]">
              {REVIEW_KIND_LABELS[card.kind]}
            </span>
          </div>
          <p className="text-sm text-[var(--geist-muted)]">
            {card.nextRequiredAction}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <span className="text-xs text-[var(--geist-muted)]">
            {expanded ? "Collapse" : "Expand"}
          </span>
        </div>
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-[var(--geist-border)] px-4 py-4">
          <PipelineStrip steps={card.pipelineSteps} />

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailSection title="What the agent did">
              <Checklist items={card.completedActions} />
            </DetailSection>
            <DetailSection title="Why this needs approval">
              <p className="mb-3 text-sm leading-relaxed">
                {card.approvalReason}
              </p>
              <GuardrailList items={card.guardrails} />
            </DetailSection>
          </div>

          {card.kind === "send" && send ? (
            <DetailSection title="Draft awaiting release">
              {editing ? (
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--geist-muted)]">
                      Subject
                    </span>
                    <input
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      className="w-full rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-background)] px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--geist-muted)]">
                      Body
                    </span>
                    <textarea
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      rows={10}
                      className="w-full rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-background)] px-3 py-2 font-sans text-sm leading-relaxed"
                    />
                  </label>
                </div>
              ) : (
                <div className="rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-subtle)] p-3">
                  <div className="mb-2 text-sm font-medium">
                    {send.subject}
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {send.body}
                  </pre>
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span>
                  <span className="text-[var(--geist-muted)]">CTA:</span>{" "}
                  <span className="font-medium">{send.cta}</span>
                </span>
                {card.item?.content.landingPageSlug ? (
                  <a
                    href={`/for/${card.item.content.landingPageSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--geist-success)] underline-offset-2 hover:underline"
                  >
                    Personalized landing page ↗
                  </a>
                ) : null}
                <span className="text-xs text-[var(--geist-muted)]">
                  Optimal window {send.sendWindow.earliestLocal}–
                  {send.sendWindow.latestLocal} ({send.sendWindow.timezone})
                </span>
              </div>
            </DetailSection>
          ) : null}

          <div className="border-t border-[var(--geist-border)] pt-4">
            <div className="mb-3">
              <h3 className="text-sm font-medium">
                What the salesperson needs to do
              </h3>
              <p className="mt-1 text-sm text-[var(--geist-muted)]">
                {card.recommendedDecision}
              </p>
            </div>
            {card.kind === "send" && send ? (
              <div className="flex flex-wrap items-center gap-2">
                {editing ? (
                  <>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void decide("approve", true)}
                      className="geist-btn geist-btn-primary"
                    >
                      {busy === "approve" ? "Approving…" : "Save & approve"}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void decide("edit", true)}
                      className="geist-btn geist-btn-secondary"
                    >
                      {busy === "edit" ? "Saving…" : "Save draft"}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => setEditing(false)}
                      className="geist-btn geist-btn-secondary"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {pending ? (
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void decide("approve", false)}
                        className="geist-btn geist-btn-primary"
                      >
                        {busy === "approve" ? "Approving…" : "Approve send"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={startEditing}
                      className="geist-btn geist-btn-secondary"
                    >
                      Edit draft
                    </button>
                    {pending ? (
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void decide("deny", false)}
                        className="geist-btn geist-btn-secondary"
                        style={{ color: "var(--geist-error)" }}
                      >
                        {busy === "deny" ? "Denying…" : "Deny send"}
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--geist-muted)]">
                        This send has already been reviewed.
                      </span>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onDemoDecision(card.id, labels.primaryDone)
                  }
                  className="geist-btn geist-btn-primary"
                >
                  {labels.primary}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onDemoDecision(card.id, labels.secondaryDone)
                  }
                  className="geist-btn geist-btn-secondary"
                >
                  {labels.secondary}
                </button>
                {demoDecision ? (
                  <span className="text-xs text-[var(--geist-muted)]">
                    {demoDecision}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}

const RESULT_BADGE: Record<
  DemoCompleteLead["result"],
  { label: string; color: string; background: string }
> = {
  sale: {
    label: "Closed won",
    color: "var(--geist-complete, #3fb950)",
    background:
      "var(--geist-complete-soft, color-mix(in srgb, #3fb950 12%, transparent))",
  },
  decline: {
    label: "Declined",
    color: "var(--geist-error)",
    background: "var(--geist-error-soft)",
  },
};

const JOURNEY_DOT_STYLE: Record<
  DemoJourneyEventKind,
  { background: string; borderColor: string }
> = {
  outbound: {
    background: "var(--geist-background)",
    borderColor: "var(--geist-border)",
  },
  signal: {
    background: "var(--geist-accent-soft)",
    borderColor: "var(--geist-success)",
  },
  positive: {
    background:
      "var(--geist-complete-soft, color-mix(in srgb, #3fb950 12%, transparent))",
    borderColor: "var(--geist-complete, #3fb950)",
  },
  negative: {
    background: "var(--geist-error-soft)",
    borderColor: "var(--geist-error)",
  },
};

function CompleteCard({
  item,
  expanded,
  onToggle,
}: {
  item: DemoCompleteLead;
  expanded: boolean;
  onToggle: () => void;
}) {
  const badge = RESULT_BADGE[item.result];

  // Every pipeline stage ran; the learning agent marks the ones whose
  // judgment didn't survive contact with the buyer. Each chip carries the
  // stage's saved output so clicking it shows exactly what was produced.
  const pipelineSteps: ReviewPipelineStep[] = [
    ...STAGE_ORDER.map((stage) => ({
      label: STRIP_STAGE_LABELS[stage],
      state: (item.missedStages.includes(stage)
        ? "missed"
        : "done") as PipelineStepState,
      stage,
      output: item.lead.stages[stage]?.output,
    })),
    item.result === "sale"
      ? { label: "Closed won", state: "done" as const }
      : { label: "Declined", state: "missed" as const },
  ];

  return (
    <article
      className="rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-background)]"
      style={{ boxShadow: "var(--geist-shadow-sm)" }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-4 px-4 py-4 text-left sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{item.lead.name}</span>
            <span className="text-xs text-[var(--geist-muted)]">
              {item.lead.company}
            </span>
            <SourceChip source={item.lead.source} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ color: badge.color, background: badge.background }}
            >
              {badge.label}
            </span>
            <span className="rounded-full border border-[var(--geist-border)] px-2 py-0.5 text-[11px] text-[var(--geist-muted)]">
              Learning captured
            </span>
          </div>
          <p className="text-sm text-[var(--geist-muted)]">
            {item.resultSummary}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <span className="text-xs text-[var(--geist-muted)]">
            {expanded ? "Collapse" : "Expand"}
          </span>
          <span className="font-mono text-[11px] text-[var(--geist-muted)]">
            {item.resultAtLabel}
          </span>
        </div>
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-[var(--geist-border)] px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailSection title="End result">
              <p className="text-sm font-medium leading-relaxed">
                {item.resultHeadline}
              </p>
              <p className="mt-2 font-mono text-[11px] text-[var(--geist-muted)]">
                {item.resultAtLabel}
              </p>
            </DetailSection>
            <DetailSection title="How we found out">
              <p className="text-sm text-[var(--geist-muted)]">
                {item.discoveredVia}
              </p>
              <blockquote
                className="mt-2 rounded-[8px] border-l-2 bg-[var(--geist-subtle)] px-3 py-2 text-sm italic leading-relaxed"
                style={{ borderColor: badge.color }}
              >
                “{item.discoveredQuote}”
              </blockquote>
            </DetailSection>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">
              Pipeline{" "}
              <span className="font-normal text-[var(--geist-muted)]">
                — where it succeeded and where it missed
              </span>
            </h3>
            <PipelineStrip steps={pipelineSteps} />
            <p className="mt-2 text-sm text-[var(--geist-muted)]">
              {item.pipelineVerdict}
            </p>
          </div>

          <DetailSection title="What happened">
            <ol className="space-y-3">
              {item.journey.map((event) => {
                const dot = JOURNEY_DOT_STYLE[event.kind];
                const outbound = event.kind === "outbound";
                return (
                  <li key={event.id} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full border"
                      style={dot}
                    />
                    <div className="min-w-0">
                      <span
                        className={`text-sm ${
                          outbound ? "text-[var(--geist-muted)]" : "font-medium"
                        }`}
                      >
                        {event.label}
                      </span>
                      {event.detail ? (
                        <p className="mt-0.5 text-sm text-[var(--geist-muted)]">
                          {event.detail}
                        </p>
                      ) : null}
                      <p className="mt-0.5 font-mono text-[11px] text-[var(--geist-muted)]">
                        {event.timing}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </DetailSection>

          <DetailSection
            title={
              <HoverHint
                label="Learning agent — full assessment"
                hintId={`learning-agent-hint-${item.id}`}
              >
                The learning agent runs after a lead&apos;s outcome is known.
                It reviews the entire run — every stage&apos;s output against
                what the buyer actually said and did — grades the original
                hypothesis,
                pinpoints which pipeline stages succeeded or missed, and turns
                the result into insights that feed back into research,
                qualification, messaging, and sequencing for future leads.
              </HoverHint>
            }
          >
            <StageOutput stage="learning" output={item.learning} />
          </DetailSection>

          <DetailSection title="Stage-by-stage record">
            <p className="mb-3 text-sm text-[var(--geist-muted)]">
              What each pipeline stage produced for this lead — the exact
              output the agent saved as it ran.
            </p>
            <div className="space-y-2">
              {STAGE_ORDER.map((stage) => {
                const record = item.lead.stages[stage];
                if (!record?.output) return null;
                return (
                  <details
                    key={stage}
                    className="rounded-[8px] border border-[var(--geist-border)] px-3 py-2"
                  >
                    <summary className="cursor-pointer text-sm font-medium">
                      {STAGE_LABELS[stage]}
                    </summary>
                    <div className="mt-3 border-t border-[var(--geist-border)] pt-3">
                      <StageOutput stage={stage} output={record.output} />
                    </div>
                  </details>
                );
              })}
            </div>
          </DetailSection>
        </div>
      ) : null}
    </article>
  );
}

export function ReviewsInbox() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPanel, setSelectedPanel] =
    useState<DashboardPanel>("needs_review");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [demoDecisions, setDemoDecisions] = useState<Record<string, string>>(
    {},
  );

  const refresh = useCallback(async () => {
    const response = await fetch("/api/leads", { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load leads");
    const data = (await response.json()) as { leads: Lead[] };
    setLeads(withDemoLeads(data.leads));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
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
  }, [refresh]);

  const decide = useCallback(
    async (
      leadId: string,
      action: ReviewAction,
      edits?: { subject: string; body: string },
    ) => {
      setError(null);

      const previous = leads;
      const currentLead = leads.find((lead) => lead.id === leadId);
      if (!currentLead) return;

      // Optimistic update so approve/deny feels instant in the demo.
      const optimistic = applySendAction(currentLead, action, edits);
      setLeads((current) =>
        current.map((lead) => (lead.id === leadId ? optimistic : lead)),
      );

      if (action === "approve" || action === "deny") {
        setExpandedId(null);
      }

      if (DEMO_LEAD_IDS.has(leadId)) return;

      try {
        const response = await fetch(`/api/leads/${leadId}/send`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action, ...edits }),
        });
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          setLeads(previous);
          setExpandedId(leadId);
          setError(data?.error ?? "Review action failed");
          return;
        }
        const data = (await response.json()) as { lead: Lead };
        setLeads((current) =>
          current.map((lead) => (lead.id === data.lead.id ? data.lead : lead)),
        );
      } catch (err) {
        setLeads(previous);
        setExpandedId(leadId);
        setError(err instanceof Error ? err.message : "Review action failed");
      }
    },
    [leads],
  );

  const items = useMemo(
    () =>
      leads
        .map(toReviewItem)
        .filter((item): item is ReviewItem => item !== null),
    [leads],
  );

  const pendingItems = useMemo(
    () =>
      items
        .filter((item) => item.send.status === "drafted")
        .sort((a, b) =>
          a.send.sendWindow.recommendedAt.localeCompare(
            b.send.sendWindow.recommendedAt,
          ),
        ),
    [items],
  );

  const sendApprovalItem = useMemo(
    () =>
      items.find((item) => item.lead.id === DEMO_REVIEW_LEAD_ID) ??
      pendingItems[0] ??
      toReviewItem(DEMO_REVIEW_LEAD)!,
    [items, pendingItems],
  );

  const needsReviewCards = useMemo(
    () => buildNeedsReviewCards(sendApprovalItem),
    [sendApprovalItem],
  );

  // Demo data for now: leads whose full pipeline already ran and whose send
  // was approved — the agent is working the outreach sequence, waiting on a
  // reply.
  const inProcessLeads = DEMO_IN_PROCESS_LEADS;
  // Demo data for now: leads with a known end result (sale or decline) and
  // the learning agent's full assessment of the run.
  const completeLeads = DEMO_COMPLETE_LEADS;

  const wonCount = completeLeads.filter(
    (item) => item.result === "sale",
  ).length;
  const sentCount = inProcessLeads.length + completeLeads.length;
  const handledCount =
    needsReviewCards.length + inProcessLeads.length + completeLeads.length;
  const closeRate = formatCloseRate(wonCount, handledCount);

  const activeExpandedId = expandedId;

  const toggleExpanded = useCallback(
    (cardId: string) => {
      setExpandedId((current) => {
        return current === cardId ? null : cardId;
      });
    },
    [],
  );

  const recordDemoDecision = useCallback(
    (cardId: string, decision: string) => {
      setDemoDecisions((current) => ({ ...current, [cardId]: decision }));
    },
    [],
  );

  return (
    <div className="min-h-screen bg-[var(--geist-background)] text-[var(--geist-foreground)]">
      <AppHeader
        subtitle="Dashboard"
        dashboardNotificationCount={loading ? null : needsReviewCards.length}
      />

      <main className="mx-auto grid max-w-4xl gap-8 px-4 py-8">
        {error ? (
          <div className="rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-error-soft)] px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">
                Dashboard
              </h1>
              {!loading && handledCount > 0 ? (
                <p className="mt-2 text-sm text-[var(--geist-muted)]">
                  Agent prepped {handledCount} lead
                  {handledCount === 1 ? "" : "s"} · {sentCount} sent ·{" "}
                  {closeRate} close rate
                </p>
              ) : null}
            </div>
            <DateRangeControl />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <DashboardMetricCard
              label="Needs review"
              value={loading ? "..." : String(needsReviewCards.length)}
              detail={
                loading
                  ? "Loading review queue."
                  : `${needsReviewCards.length} human checkpoints need a BDR decision.`
              }
              tone="warning"
              selected={selectedPanel === "needs_review"}
              onSelect={() => setSelectedPanel("needs_review")}
            />
            <DashboardMetricCard
              label="In process"
              value={loading ? "..." : String(inProcessLeads.length)}
              detail={
                loading
                  ? "Loading active sequences."
                  : `${inProcessLeads.length} sequence${
                      inProcessLeads.length === 1 ? "" : "s"
                    } live — waiting to hear back.`
              }
              tone="neutral"
              selected={selectedPanel === "in_process"}
              onSelect={() => setSelectedPanel("in_process")}
            />
            <DashboardMetricCard
              label="Complete"
              value={loading ? "..." : String(completeLeads.length)}
              detail={
                loading
                  ? "Loading completed leads."
                  : completeLeads.length > 0
                    ? `${wonCount} closed won, ${
                        completeLeads.length - wonCount
                      } declined.`
                    : "No completed leads yet."
              }
              tone="success"
              selected={selectedPanel === "complete"}
              onSelect={() => setSelectedPanel("complete")}
            />
          </div>
        </section>

        {selectedPanel === "needs_review" ? (
          <section className="grid gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium">Review queue</h2>
            </div>
            {loading ? (
              <p className="text-sm text-[var(--geist-muted)]">
                Loading reviews…
              </p>
            ) : needsReviewCards.length === 0 ? (
              <div className="rounded-[8px] border border-[var(--geist-border)] px-4 py-8 text-center">
                <p className="text-sm font-medium">You&apos;re caught up</p>
                <p className="mt-1 text-sm text-[var(--geist-muted)]">
                  New qualified drafts appear here automatically when the agent
                  finishes outreach prep.
                </p>
              </div>
            ) : (
              needsReviewCards.map((card) => (
                <PipelineReviewCard
                  key={card.id}
                  card={card}
                  expanded={activeExpandedId === card.id}
                  demoDecision={demoDecisions[card.id]}
                  onToggle={() => toggleExpanded(card.id)}
                  onDemoDecision={recordDemoDecision}
                  onDecide={decide}
                />
              ))
            )}
          </section>
        ) : null}

        {selectedPanel === "in_process" ? (
          <section className="grid gap-3">
            <div>
              <h2 className="text-sm font-medium">In process</h2>
              <p className="mt-1 text-sm text-[var(--geist-muted)]">
                The pipeline ran end to end and the send was approved. While
                the sequence waits for a reply, the engagement agent watches
                every buying signal — opens, replies, pricing visits, docs
                views, product signups — and keeps the intent score live.
              </p>
            </div>
            {inProcessLeads.length === 0 ? (
              <div className="rounded-[8px] border border-[var(--geist-border)] px-4 py-8 text-center">
                <p className="text-sm font-medium">No leads in process</p>
                <p className="mt-1 text-sm text-[var(--geist-muted)]">
                  Leads appear here after their outreach is approved, while the
                  agent waits for a reply.
                </p>
              </div>
            ) : (
              inProcessLeads.map((lead) => (
                <InProcessCard
                  key={lead.id}
                  lead={lead}
                  expanded={activeExpandedId === lead.id}
                  onToggle={() => toggleExpanded(lead.id)}
                />
              ))
            )}
          </section>
        ) : null}

        {selectedPanel === "complete" ? (
          <section className="grid gap-3">
            <div>
              <h2 className="text-sm font-medium">Complete</h2>
              <p className="mt-1 text-sm text-[var(--geist-muted)]">
                Leads with a known end result — a sale or a decline. The
                learning agent reviews each full run: what happened, how we
                found out, and where the pipeline succeeded or missed.
              </p>
            </div>
            {completeLeads.length === 0 ? (
              <div className="rounded-[8px] border border-[var(--geist-border)] px-4 py-8 text-center">
                <p className="text-sm font-medium">No completed leads yet</p>
                <p className="mt-1 text-sm text-[var(--geist-muted)]">
                  Leads land here once their outcome is known and the learning
                  agent has assessed the run.
                </p>
              </div>
            ) : (
              completeLeads.map((item) => (
                <CompleteCard
                  key={item.id}
                  item={item}
                  expanded={activeExpandedId === item.id}
                  onToggle={() => toggleExpanded(item.id)}
                />
              ))
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
