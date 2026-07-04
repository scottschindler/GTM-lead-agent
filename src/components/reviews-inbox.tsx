"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  ContentGenerationOutput,
  HypothesisOutput,
  Lead,
  QualificationOutput,
  ResearchBrief,
  SendRecord,
} from "../../agent/lib/types";
import { StageOutput } from "./stage-output";
import { AppHeader } from "./app-header";

type ReviewAction = "approve" | "deny" | "edit";

type ReviewItem = {
  lead: Lead;
  content: ContentGenerationOutput;
  send: SendRecord;
  qualification?: QualificationOutput;
  research?: ResearchBrief;
  hypothesis?: HypothesisOutput;
};

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

const STATUS_STYLES: Record<
  SendRecord["status"],
  { label: string; color: string; background: string }
> = {
  drafted: {
    label: "Needs review",
    color: "var(--geist-warning)",
    background: "var(--geist-warning-soft)",
  },
  approved: {
    label: "Approved — send released",
    color: "var(--geist-success)",
    background: "var(--geist-accent-soft)",
  },
  denied: {
    label: "Denied — send blocked",
    color: "var(--geist-error)",
    background: "var(--geist-error-soft)",
  },
};

function StatusBadge({ status }: { status: SendRecord["status"] }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ color: style.color, background: style.background }}
    >
      {style.label}
    </span>
  );
}

function EvidencePanel({
  item,
  panel,
}: {
  item: ReviewItem;
  panel: "qualification" | "research";
}) {
  if (panel === "qualification") {
    const evidence = (item.hypothesis?.hypotheses ?? []).flatMap(
      (hypothesis) => hypothesis.evidence,
    );
    return (
      <div className="space-y-4">
        {item.qualification ? (
          <StageOutput stage="qualification" output={item.qualification} />
        ) : (
          <p className="text-sm text-[var(--geist-muted)]">
            No qualification output recorded for this lead.
          </p>
        )}
        {evidence.length > 0 ? (
          <div>
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--geist-muted)]">
              Supporting evidence
            </div>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {evidence.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  return item.research ? (
    <StageOutput stage="research" output={item.research} />
  ) : (
    <p className="text-sm text-[var(--geist-muted)]">
      No research brief recorded for this lead.
    </p>
  );
}

function ReviewCard({
  item,
  onDecide,
}: {
  item: ReviewItem;
  onDecide: (
    leadId: string,
    action: ReviewAction,
    edits?: { subject: string; body: string },
  ) => Promise<void>;
}) {
  const { lead, content, send } = item;
  const pending = send.status === "drafted";

  const [expanded, setExpanded] = useState(pending);
  const [panel, setPanel] = useState<"qualification" | "research" | null>(null);
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(send.subject);
  const [body, setBody] = useState(send.body);
  const [busy, setBusy] = useState<ReviewAction | null>(null);

  // Keep local edit fields in sync when the draft changes server-side.
  useEffect(() => {
    if (!editing) {
      setSubject(send.subject);
      setBody(send.body);
    }
  }, [editing, send.subject, send.body]);

  async function decide(action: ReviewAction, withEdits: boolean) {
    setBusy(action);
    try {
      await onDecide(
        lead.id,
        action,
        withEdits ? { subject, body } : undefined,
      );
      setEditing(false);
    } finally {
      setBusy(null);
    }
  }

  const decidedAt = send.approvedAt ?? send.deniedAt;

  return (
    <article
      className="rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-background)]"
      style={{ boxShadow: "var(--geist-shadow-sm)" }}
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{lead.name}</span>
            <span className="text-xs text-[var(--geist-muted)]">
              {lead.company}
            </span>
            <span className="font-mono text-[11px] text-[var(--geist-muted)]">
              {lead.email}
            </span>
          </div>
          <div className="mt-1 truncate text-sm">{send.subject}</div>
          {!expanded ? (
            <p className="mt-1 line-clamp-2 text-sm text-[var(--geist-muted)]">
              {send.body}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={send.status} />
          <span className="text-[11px] text-[var(--geist-muted)]">
            {pending
              ? `Send window: ${formatWhen(send.sendWindow.recommendedAt, send.sendWindow.timezone) ?? "—"}`
              : decidedAt
                ? `Reviewed ${formatWhen(decidedAt)}`
                : null}
          </span>
        </div>
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-[var(--geist-border)] px-4 py-4">
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
                  rows={12}
                  className="w-full rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-background)] px-3 py-2 font-sans text-sm leading-relaxed"
                />
              </label>
            </div>
          ) : (
            <div className="rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-subtle)] p-3">
              <div className="mb-2 text-sm font-medium">{send.subject}</div>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {send.body}
              </pre>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span>
              <span className="text-[var(--geist-muted)]">CTA:</span>{" "}
              <span className="font-medium">{send.cta}</span>
            </span>
            {content.landingPageSlug ? (
              <a
                href={`/for/${content.landingPageSlug}`}
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

          <div className="geist-btn-group">
            <button
              type="button"
              onClick={() =>
                setPanel((value) =>
                  value === "qualification" ? null : "qualification",
                )
              }
              className="geist-btn geist-btn-secondary"
              style={
                panel === "qualification"
                  ? { background: "var(--geist-subtle)" }
                  : undefined
              }
            >
              Why qualified
            </button>
            <button
              type="button"
              onClick={() =>
                setPanel((value) => (value === "research" ? null : "research"))
              }
              className="geist-btn geist-btn-secondary"
              style={
                panel === "research"
                  ? { background: "var(--geist-subtle)" }
                  : undefined
              }
            >
              Research evidence
            </button>
          </div>

          {panel ? (
            <div className="rounded-[8px] border border-[var(--geist-border)] p-3">
              <EvidencePanel item={item} panel={panel} />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--geist-border)] pt-4">
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
                    {busy === "approve" ? "Approving…" : "Approve"}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => setEditing(true)}
                  className="geist-btn geist-btn-secondary"
                >
                  Edit
                </button>
                {pending ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void decide("deny", false)}
                    className="geist-btn geist-btn-secondary"
                    style={{ color: "var(--geist-error)" }}
                  >
                    {busy === "deny" ? "Denying…" : "Deny"}
                  </button>
                ) : null}
                {!pending ? (
                  <span className="text-xs text-[var(--geist-muted)]">
                    Editing re-queues this draft for review.
                  </span>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function ReviewsInbox() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/leads", { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load leads");
    const data = (await response.json()) as { leads: Lead[] };
    setLeads(data.leads);
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
    const id = window.setInterval(() => void refresh().catch(() => {}), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [refresh]);

  const decide = useCallback(
    async (
      leadId: string,
      action: ReviewAction,
      edits?: { subject: string; body: string },
    ) => {
      setError(null);
      const response = await fetch(`/api/leads/${leadId}/send`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...edits }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Review action failed");
        return;
      }
      const data = (await response.json()) as { lead: Lead };
      setLeads((current) =>
        current.map((lead) => (lead.id === data.lead.id ? data.lead : lead)),
      );
    },
    [],
  );

  const items = useMemo(
    () =>
      leads
        .map(toReviewItem)
        .filter((item): item is ReviewItem => item !== null),
    [leads],
  );
  const pendingItems = items.filter((item) => item.send.status === "drafted");
  const reviewedItems = items.filter((item) => item.send.status !== "drafted");

  return (
    <div className="min-h-screen bg-[var(--geist-background)] text-[var(--geist-foreground)]">
      <AppHeader subtitle="Inbox" />

      <main className="mx-auto grid max-w-4xl gap-8 px-4 py-8">
        {error ? (
          <div className="rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-error-soft)] px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}

        <section className="grid gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-medium">Waiting for your review</h1>
            <span className="rounded-full bg-[var(--geist-warning-soft)] px-2 py-0.5 font-mono text-xs font-medium text-[var(--geist-warning)]">
              {pendingItems.length}
            </span>
          </div>
          {loading ? (
            <p className="text-sm text-[var(--geist-muted)]">Loading inbox…</p>
          ) : pendingItems.length === 0 ? (
            <div className="rounded-[8px] border border-[var(--geist-border)] px-4 py-8 text-center">
              <p className="text-sm font-medium">No drafts waiting for review</p>
              <p className="mt-1 text-sm text-[var(--geist-muted)]">
                Run the pipeline in the{" "}
                <a
                  href="/factory"
                  className="text-[var(--geist-success)] underline-offset-2 hover:underline"
                >
                  Factory
                </a>{" "}
                and drafts will land here for approval.
              </p>
            </div>
          ) : (
            pendingItems.map((item) => (
              <ReviewCard key={item.lead.id} item={item} onDecide={decide} />
            ))
          )}
        </section>

        {reviewedItems.length > 0 ? (
          <section className="grid gap-3">
            <h2 className="text-sm font-medium text-[var(--geist-muted)]">
              Reviewed
            </h2>
            {reviewedItems.map((item) => (
              <ReviewCard key={item.lead.id} item={item} onDecide={decide} />
            ))}
          </section>
        ) : null}
      </main>
    </div>
  );
}
