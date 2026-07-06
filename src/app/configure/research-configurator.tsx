"use client";

import { useState } from "react";

type Signal = {
  label: string;
  description: string;
  current?: boolean;
};

const CURRENT_PIPELINE_SIGNALS: Signal[] = [
  {
    label: "Company summary",
    description: "What the company builds and where it is heading.",
    current: true,
  },
  {
    label: "Industry or category",
    description: "The market, segment, or product category the account belongs to.",
    current: true,
  },
  {
    label: "Employee or team size",
    description: "Visible scale signals such as headcount, engineering team size, or team scope.",
    current: true,
  },
  {
    label: "Funding or customer signal",
    description: "Funding, notable customers, expansion, or other public growth evidence.",
    current: true,
  },
  {
    label: "Current initiatives",
    description: "Visible product, platform, go-to-market, or transformation work.",
    current: true,
  },
  {
    label: "Product launches",
    description: "New products, major releases, launches, or roadmap clues.",
    current: true,
  },
  {
    label: "AI initiatives",
    description: "AI product launches, AI roadmap signals, or AI workflow investment.",
    current: true,
  },
  {
    label: "Tech and product stack",
    description: "Next.js, React, Vercel, frontend, docs, platform, or product signals.",
    current: true,
  },
  {
    label: "Recent news",
    description: "Launches, announcements, partnerships, or public company updates.",
    current: true,
  },
  {
    label: "Growth signals",
    description: "Funding, customers, usage growth, expansion, or hiring momentum.",
    current: true,
  },
  {
    label: "Contact title",
    description: "Role, team, seniority, and likely relevance to platform decisions.",
    current: true,
  },
  {
    label: "Decision-making authority",
    description: "Whether the person can own, influence, or route the right buying conversation.",
    current: true,
  },
  {
    label: "Technical background",
    description: "Visible engineering, product, developer, or platform experience.",
    current: true,
  },
  {
    label: "Account priorities",
    description: "Public priorities the downstream stages can turn into a hypothesis.",
    current: true,
  },
  {
    label: "Vercel angle",
    description: "The buyer-facing reason this account is relevant for Vercel.",
    current: true,
  },
  {
    label: "Source URLs",
    description: "One to three URLs that support the saved research brief.",
    current: true,
  },
];

const OPTIONAL_SIGNALS: Signal[] = [
  {
    label: "Hiring trends",
    description: "Role openings that imply engineering, platform, or growth urgency.",
  },
  {
    label: "Architecture notes",
    description: "Stack, hosting, performance, workflow, or infrastructure clues.",
  },
  {
    label: "Competitor mentions",
    description: "Signals that the account is using or evaluating adjacent platforms.",
  },
  {
    label: "ARR or usage estimate",
    description: "Scale proxy that helps size the business impact of a qualified lead.",
  },
  {
    label: "Security or compliance signal",
    description: "Procurement, trust, enterprise readiness, or regulated-market clues.",
  },
  {
    label: "Customer proof fit",
    description: "Which Vercel proof point or customer story could credibly map to the account.",
  },
];

const SIGNALS = [...CURRENT_PIPELINE_SIGNALS, ...OPTIONAL_SIGNALS];

function SignalCheckbox({
  signal,
  checked,
  onChange,
}: {
  signal: Signal;
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
          {signal.label}
        </span>
        <span className="mt-0.5 block text-[11px] leading-4 text-[var(--geist-muted)]">
          {signal.description}
        </span>
      </span>
    </label>
  );
}

export function ResearchConfigurator() {
  const [depth, setDepth] = useState("Quick scan (~2 min)");
  const [selectedSignals, setSelectedSignals] = useState(
    CURRENT_PIPELINE_SIGNALS.map((signal) => signal.label),
  );

  return (
    <div>
      <div className="py-1.5">
        <label className="block text-xs font-medium">Research depth</label>
        <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
          Demo-only. The current flow is optimized for a quick scan.
        </p>
        <select
          value={depth}
          onChange={(event) => setDepth(event.target.value)}
          className="mt-1.5 w-full rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-background)] px-2.5 py-1.5 text-xs"
        >
          {[
            "Quick scan (~2 min)",
            "Standard (~5 min)",
            "Deep dive (~12 min)",
          ].map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      <fieldset className="mt-3 py-2">
        <legend className="text-xs font-medium">Research signals</legend>
        <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
          Checked defaults match the research stage today. Extra signals can be
          toggled for the demo.
        </p>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {SIGNALS.map((signal) => (
            <SignalCheckbox
              key={signal.label}
              signal={signal}
              checked={selectedSignals.includes(signal.label)}
              onChange={(checked) =>
                setSelectedSignals((current) =>
                  checked
                    ? Array.from(new Set([...current, signal.label]))
                    : current.filter((item) => item !== signal.label),
                )
              }
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
