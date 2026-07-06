"use client";

import { useState } from "react";

type Rule = {
  label: string;
  description: string;
  defaultChecked?: boolean;
};

type ScoreSetting = {
  label: string;
  description: string;
  defaultValue: number;
};

const SCORE_WEIGHTS: ScoreSetting[] = [
  {
    label: "ICP fit",
    description: "Company matches the target account profile.",
    defaultValue: 9,
  },
  {
    label: "Product usage or intent",
    description: "Research shows frontend, Next.js, React, or Vercel-relevant intent.",
    defaultValue: 8,
  },
  {
    label: "Buying authority",
    description: "Contact can own, influence, or route platform decisions.",
    defaultValue: 7,
  },
  {
    label: "Business impact",
    description: "There is a clear revenue, speed, reliability, or DX upside.",
    defaultValue: 7,
  },
  {
    label: "Engineering maturity",
    description: "Team has platform thinking, modern web practices, or DX priorities.",
    defaultValue: 6,
  },
  {
    label: "Company growth",
    description: "Hiring, funding, launches, expansion, or usage growth creates urgency.",
    defaultValue: 5,
  },
];

const QUALIFIED_RULES: Rule[] = [
  {
    label: "Product or engineering-led company",
    description: "The company ships software or web experiences as a meaningful part of the business.",
    defaultChecked: true,
  },
  {
    label: "Credible frontend or platform motion",
    description: "Research shows Next.js, React, frontend infrastructure, DX, docs, AI product, or web performance work.",
    defaultChecked: true,
  },
  {
    label: "Reachable buyer or champion",
    description: "The contact owns, influences, or can route a platform conversation.",
    defaultChecked: true,
  },
  {
    label: "Specific Vercel value hypothesis",
    description: "The agent can name why Vercel would matter for this account.",
    defaultChecked: true,
  },
];

const DISQUALIFIED_RULES: Rule[] = [
  {
    label: "Overall priority below threshold",
    description: "Disqualify when overall priority is below the configured minimum.",
    defaultChecked: true,
  },
  {
    label: "ICP fit below threshold",
    description: "Disqualify when ICP fit is too weak, even if another score is high.",
    defaultChecked: true,
  },
  {
    label: "No credible engineering or product motion",
    description: "Disqualify when research cannot find a real software, web, or product motion.",
    defaultChecked: true,
  },
  {
    label: "No actionable contact path",
    description: "Disqualify when the contact cannot influence, route, or introduce the right owner.",
    defaultChecked: false,
  },
  {
    label: "Weak or generic Vercel fit",
    description: "Disqualify when the only angle is broad cloud, AI, or SaaS messaging without a concrete Vercel fit.",
    defaultChecked: false,
  },
];

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function RangeControl({
  label,
  hint,
  value,
  min = 0,
  max = 10,
  unit,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-medium">{label}</span>
        <span className="font-mono text-[11px] text-[var(--geist-muted)]">
          {value}
          {unit ?? ""}
        </span>
      </div>
      {hint ? (
        <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
          {hint}
        </p>
      ) : null}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 w-full accent-[var(--geist-success)]"
      />
    </div>
  );
}

function RuleList({
  label,
  hint,
  rules,
  selected,
  onToggle,
}: {
  label: string;
  hint: string;
  rules: Rule[];
  selected: string[];
  onToggle: (label: string) => void;
}) {
  return (
    <fieldset className="py-2">
      <legend className="text-xs font-medium">{label}</legend>
      <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
        {hint}
      </p>
      <div className="mt-2 grid gap-1.5">
        {rules.map((rule) => {
          const active = selected.includes(rule.label);
          return (
            <button
              key={rule.label}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(rule.label)}
              className={`block rounded-[8px] border px-2.5 py-2 text-left transition ${
                active
                  ? "border-[var(--geist-foreground)] bg-[var(--geist-background)]"
                  : "border-[var(--geist-border)] bg-[var(--geist-background)] hover:bg-[var(--geist-hover)]"
              }`}
            >
              <span className="min-w-0">
                <span className="block text-xs font-medium">{rule.label}</span>
                <span className="mt-0.5 block text-[11px] leading-4 text-[var(--geist-muted)]">
                  {rule.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function WeightControls({
  values,
  onChange,
}: {
  values: Record<string, number>;
  onChange: (label: string, value: number) => void;
}) {
  return (
    <fieldset className="py-2">
      <legend className="text-xs font-medium">Score weights</legend>
      <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
        These mirror the score fields shown in qualification.
      </p>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {SCORE_WEIGHTS.map((item) => (
          <div
            key={item.label}
            className="rounded-[8px] border border-[var(--geist-border)] px-2.5 py-2"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium">{item.label}</span>
              <span className="font-mono text-[11px] text-[var(--geist-muted)]">
                {values[item.label]}
              </span>
            </div>
            <p className="mt-0.5 min-h-8 text-[11px] leading-4 text-[var(--geist-muted)]">
              {item.description}
            </p>
            <input
              type="range"
              min={0}
              max={10}
              value={values[item.label]}
              onChange={(event) => onChange(item.label, Number(event.target.value))}
              className="mt-1.5 w-full accent-[var(--geist-success)]"
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}

export function IcpConfigurator() {
  const [overallThreshold, setOverallThreshold] = useState(4);
  const [icpThreshold, setIcpThreshold] = useState(3);
  const [intentThreshold, setIntentThreshold] = useState(3);
  const [qualifiedRules, setQualifiedRules] = useState(
    QUALIFIED_RULES.filter((rule) => rule.defaultChecked).map((rule) => rule.label),
  );
  const [disqualifiedRules, setDisqualifiedRules] = useState(
    DISQUALIFIED_RULES.filter((rule) => rule.defaultChecked).map(
      (rule) => rule.label,
    ),
  );
  const [weights, setWeights] = useState(
    Object.fromEntries(
      SCORE_WEIGHTS.map((item) => [item.label, item.defaultValue]),
    ),
  );

  return (
    <div>
      <RangeControl
        label="Minimum overall priority"
        hint="Leads below this score are not qualified."
        value={overallThreshold}
        onChange={setOverallThreshold}
      />
      <RangeControl
        label="Minimum ICP fit"
        hint="Low ICP fit disqualifies even when other signals look good."
        value={icpThreshold}
        onChange={setIcpThreshold}
      />
      <RangeControl
        label="Minimum product intent"
        hint="Extra BDR guardrail for frontend, platform, React, Next.js, or Vercel-relevant intent."
        value={intentThreshold}
        onChange={setIntentThreshold}
      />
      <WeightControls
        values={weights}
        onChange={(label, value) =>
          setWeights((current) => ({ ...current, [label]: value }))
        }
      />
      <RuleList
        label="Qualified lead must have"
        hint="Selected rules define what the BDR wants the agent to treat as qualified."
        rules={QUALIFIED_RULES}
        selected={qualifiedRules}
        onToggle={(label) =>
          setQualifiedRules((current) => toggleValue(current, label))
        }
      />
      <RuleList
        label="Disqualify when"
        hint="Selected rules define what should stop the lead before outreach."
        rules={DISQUALIFIED_RULES}
        selected={disqualifiedRules}
        onToggle={(label) =>
          setDisqualifiedRules((current) => toggleValue(current, label))
        }
      />
    </div>
  );
}
