"use client";

import { useState } from "react";

type Rule = {
  label: string;
  description: string;
  current?: boolean;
};

const STAGE_GATES: Rule[] = [
  {
    label: "Strategic qualification review",
    description:
      "Pause before opportunity mapping when the lead is high-fit, high-value, or executive-owned.",
    current: true,
  },
  {
    label: "Messaging angle review",
    description:
      "Require a human to approve the core angle before sequence planning starts.",
    current: true,
  },
  {
    label: "Every outbound send",
    description:
      "Drafts stay in the review inbox until a BDR approves, edits, or denies them.",
    current: true,
  },
  {
    label: "Agent failure or fallback",
    description:
      "Route to a human when research falls back to metadata or the writer cannot persist a complete payload.",
    current: true,
  },
  {
    label: "Low-confidence qualification",
    description:
      "Pause when the lead is close to qualified but the evidence is thin or conflicting.",
  },
  {
    label: "Disqualified strategic account",
    description:
      "Let a human override a disqualification for named accounts or executive relationships.",
  },
];

const ENGAGEMENT_TRIGGERS: Rule[] = [
  {
    label: "Positive reply",
    description:
      "Stop the sequence and hand the conversation to a person immediately.",
    current: true,
  },
  {
    label: "Meeting request",
    description:
      "Create a handoff instead of letting the agent continue any follow-up.",
    current: true,
  },
  {
    label: "Pricing, procurement, or legal",
    description:
      "Route commercial or legal discussion to the owner before another message is drafted.",
    current: true,
  },
  {
    label: "Security or architecture review",
    description:
      "Escalate when the prospect asks for security posture, compliance, infra, or architecture detail.",
    current: true,
  },
  {
    label: "Executive interest",
    description:
      "Notify the owner when a founder, CTO, VP, or other senior buyer engages.",
  },
  {
    label: "High-intent page activity",
    description:
      "Handoff when the prospect revisits the personalized page or clicks multiple proof points.",
  },
  {
    label: "Negative sentiment",
    description:
      "Pause outreach and ask a human whether to close, apologize, or mark do not contact.",
  },
  {
    label: "Explicit opt-out",
    description:
      "Stop immediately, mark do not contact, and notify the owner for audit visibility.",
    current: true,
  },
];

const CLAIM_GUARDRAILS: Rule[] = [
  {
    label: "Pricing or discount claims",
    description:
      "Require approval before mentioning price, discounting, packaging, or contract terms.",
    current: true,
  },
  {
    label: "Security and compliance claims",
    description:
      "Require a source or human approval before making SOC, privacy, uptime, or security statements.",
    current: true,
  },
  {
    label: "Customer references",
    description:
      "Block fabricated or unapproved references; require review for named customer examples.",
    current: true,
  },
  {
    label: "Competitor comparisons",
    description:
      "Require review before comparing platforms or implying a competitor weakness.",
  },
  {
    label: "Migration commitments",
    description:
      "Require a human before promising timelines, effort, integrations, or implementation scope.",
  },
  {
    label: "Unsourced strategic claims",
    description:
      "Pause when a strong claim cannot be tied back to research, hypotheses, or opportunity mapping.",
    current: true,
  },
];

function toggle(values: string[], value: string, checked: boolean): string[] {
  if (checked) return Array.from(new Set([...values, value]));
  return values.filter((item) => item !== value);
}

function RuleCard({
  rule,
  checked,
  onChange,
}: {
  rule: Rule;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-background)] px-2.5 py-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 accent-[var(--geist-success)]"
      />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
          {rule.label}
        </span>
        <span className="mt-0.5 block text-[11px] leading-4 text-[var(--geist-muted)]">
          {rule.description}
        </span>
      </span>
    </label>
  );
}

export function HandoffConfigurator() {
  const [priorityScore, setPriorityScore] = useState(8);
  const [confidenceFloor, setConfidenceFloor] = useState(65);
  const [intentScore, setIntentScore] = useState(7);
  const [replySla, setReplySla] = useState(15);
  const [selectedStageGates, setSelectedStageGates] = useState(
    STAGE_GATES.filter((rule) => rule.current).map((rule) => rule.label),
  );
  const [selectedEngagementTriggers, setSelectedEngagementTriggers] = useState(
    ENGAGEMENT_TRIGGERS.filter((rule) => rule.current).map(
      (rule) => rule.label,
    ),
  );
  const [selectedClaimGuardrails, setSelectedClaimGuardrails] = useState(
    CLAIM_GUARDRAILS.filter((rule) => rule.current).map((rule) => rule.label),
  );

  return (
    <div>
      <div className="grid gap-3 py-2 sm:grid-cols-2">
        <div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium">Review if priority score is above</span>
            <span className="font-mono text-[11px] text-[var(--geist-muted)]">
              {priorityScore.toFixed(1)}/10
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
            Strategic accounts should get human confirmation before more agent work.
          </p>
          <input
            type="range"
            min={5}
            max={10}
            step={0.5}
            value={priorityScore}
            onChange={(event) => setPriorityScore(Number(event.target.value))}
            className="mt-1.5 w-full accent-[var(--geist-success)]"
          />
        </div>
        <div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium">Review if confidence is below</span>
            <span className="font-mono text-[11px] text-[var(--geist-muted)]">
              {confidenceFloor}%
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
            Keeps thin evidence from flowing into confident messaging.
          </p>
          <input
            type="range"
            min={40}
            max={90}
            step={5}
            value={confidenceFloor}
            onChange={(event) => setConfidenceFloor(Number(event.target.value))}
            className="mt-1.5 w-full accent-[var(--geist-success)]"
          />
        </div>
        <div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium">Escalate intent score above</span>
            <span className="font-mono text-[11px] text-[var(--geist-muted)]">
              {intentScore}/10
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
            High-intent behavior should move to a person even without a reply.
          </p>
          <input
            type="range"
            min={1}
            max={10}
            value={intentScore}
            onChange={(event) => setIntentScore(Number(event.target.value))}
            className="mt-1.5 w-full accent-[var(--geist-success)]"
          />
        </div>
        <div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium">Reply handoff SLA</span>
            <span className="font-mono text-[11px] text-[var(--geist-muted)]">
              {replySla} min
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
            Target response time once a positive reply or buying signal appears.
          </p>
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={replySla}
            onChange={(event) => setReplySla(Number(event.target.value))}
            className="mt-1.5 w-full accent-[var(--geist-success)]"
          />
        </div>
      </div>

      <fieldset className="mt-3 py-2">
        <legend className="text-xs font-medium">Stage intervention points</legend>
        <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
          Checked rules create a review card before the next stage runs or before a send is released.
        </p>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {STAGE_GATES.map((rule) => (
            <RuleCard
              key={rule.label}
              rule={rule}
              checked={selectedStageGates.includes(rule.label)}
              onChange={(checked) =>
                setSelectedStageGates((current) =>
                  toggle(current, rule.label, checked),
                )
              }
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-3 py-2">
        <legend className="text-xs font-medium">Engagement handoff triggers</legend>
        <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
          These define exactly when the sequence stops and a person takes over.
        </p>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {ENGAGEMENT_TRIGGERS.map((rule) => (
            <RuleCard
              key={rule.label}
              rule={rule}
              checked={selectedEngagementTriggers.includes(rule.label)}
              onChange={(checked) =>
                setSelectedEngagementTriggers((current) =>
                  toggle(current, rule.label, checked),
                )
              }
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-3 py-2">
        <legend className="text-xs font-medium">Claim and compliance guardrails</legend>
        <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
          Selected guardrails force review before risky language reaches a buyer.
        </p>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {CLAIM_GUARDRAILS.map((rule) => (
            <RuleCard
              key={rule.label}
              rule={rule}
              checked={selectedClaimGuardrails.includes(rule.label)}
              onChange={(checked) =>
                setSelectedClaimGuardrails((current) =>
                  toggle(current, rule.label, checked),
                )
              }
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
