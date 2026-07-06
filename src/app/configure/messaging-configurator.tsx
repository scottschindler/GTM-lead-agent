"use client";

import { useState } from "react";

type Signal = {
  label: string;
  description: string;
  current?: boolean;
};

const CURRENT_PIPELINE_SIGNALS: Signal[] = [
  {
    label: "Messaging angle",
    description: "The core account narrative saved in messagingStrategy.",
    current: true,
  },
  {
    label: "Technical depth",
    description: "Low, medium, or high detail based on the buyer and landing page usage.",
    current: true,
  },
  {
    label: "Tone",
    description: "Concise, peer-to-peer, non-salesy writing style.",
    current: true,
  },
  {
    label: "Account-specific story",
    description: "One sentence that ties the research to this prospect.",
    current: true,
  },
  {
    label: "Opening hook",
    description: "A researched hook that starts the email.",
    current: true,
  },
  {
    label: "Call to action",
    description: "The specific ask the email makes.",
    current: true,
  },
  {
    label: "Customer examples",
    description: "Relevant Vercel proof patterns for the sender, not a long email dump.",
    current: true,
  },
  {
    label: "Likely objections",
    description: "What the buyer may push back on before the BDR reviews the draft.",
    current: true,
  },
  {
    label: "Personalized landing page",
    description: "Unique prospect page with headline, note, opportunities, stories, stats, and CTA.",
    current: true,
  },
  {
    label: "Subject line options",
    description: "One to four short subjects, each under eight words in the skill instructions.",
    current: true,
  },
  {
    label: "Short email draft",
    description: "Four to seven short sentences, capped by the content-generation schema.",
    current: true,
  },
  {
    label: "Objection responses",
    description: "Short sender-only responses for likely pushback.",
    current: true,
  },
  {
    label: "Approved send released",
    description:
      "The full pipeline stores the approved send and send window before moving the lead to In process.",
    current: true,
  },
];

const OPTIONAL_SIGNALS: Signal[] = [
  {
    label: "A/B subject variant",
    description: "Generate a second subject-line angle for the BDR to compare.",
  },
  {
    label: "Persona-specific CTA",
    description: "Tune the ask for engineering, product, growth, or executive buyers.",
  },
  {
    label: "Industry-specific proof point",
    description: "Prefer proof that maps to the prospect's market or business model.",
  },
  {
    label: "Competitor-aware positioning",
    description: "Frame Vercel against a known platform only when research supports it.",
  },
  {
    label: "Risk or compliance caveat",
    description: "Add a conservative sender note when claims need legal or security care.",
  },
  {
    label: "Follow-up opener",
    description: "Prepare the next touch opener if the first email gets no response.",
  },
];

const WRITING_RULES: Signal[] = [
  {
    label: "No em-dashes",
    description: "Keep punctuation plain and easy to skim.",
    current: true,
  },
  {
    label: "No fake urgency",
    description: "Do not manufacture timing pressure.",
    current: true,
  },
  {
    label: "Ground every claim",
    description: "Use research, hypotheses, or opportunities. Do not invent facts.",
    current: true,
  },
  {
    label: "Keep proof points off the email when a landing page exists",
    description: "Tease the page instead of listing metrics in the body.",
    current: true,
  },
  {
    label: "Avoid banned filler",
    description: "Avoid quick call, touching base, circle back, buzzwords, and generic sales copy.",
    current: true,
  },
];

const SIGNALS = [...CURRENT_PIPELINE_SIGNALS, ...OPTIONAL_SIGNALS];

function toggle(values: string[], value: string, checked: boolean): string[] {
  if (checked) return Array.from(new Set([...values, value]));
  return values.filter((item) => item !== value);
}

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

export function MessagingConfigurator() {
  const [tone, setTone] = useState("Peer engineer");
  const [maxWords, setMaxWords] = useState(120);
  const [selectedSignals, setSelectedSignals] = useState(
    CURRENT_PIPELINE_SIGNALS.map((signal) => signal.label),
  );
  const [selectedRules, setSelectedRules] = useState(
    WRITING_RULES.map((signal) => signal.label),
  );

  return (
    <div>
      <div className="grid gap-3 py-1.5 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium">Default tone</label>
          <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
            Demo-only setting for the generated messaging strategy.
          </p>
          <select
            value={tone}
            onChange={(event) => setTone(event.target.value)}
            className="mt-1.5 w-full rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-background)] px-2.5 py-1.5 text-xs"
          >
            {[
              "Peer engineer",
              "Consultative",
              "Executive brief",
              "Casual founder-to-founder",
            ].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium">Max email length</span>
            <span className="font-mono text-[11px] text-[var(--geist-muted)]">
              {maxWords} words
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
            Matches the content-generation schema limit.
          </p>
          <input
            type="range"
            min={60}
            max={120}
            value={maxWords}
            onChange={(event) => setMaxWords(Number(event.target.value))}
            className="mt-1.5 w-full accent-[var(--geist-success)]"
          />
        </div>
      </div>

      <fieldset className="mt-3 py-2">
        <legend className="text-xs font-medium">Messaging signals</legend>
        <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
          Checked defaults match the content-generation stage today. Extra
          signals can be toggled for the demo.
        </p>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {SIGNALS.map((signal) => (
            <SignalCheckbox
              key={signal.label}
              signal={signal}
              checked={selectedSignals.includes(signal.label)}
              onChange={(checked) =>
                setSelectedSignals((current) =>
                  toggle(current, signal.label, checked),
                )
              }
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-3 py-2">
        <legend className="text-xs font-medium">Global writing rules</legend>
        <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
          Rules applied to every generated email and landing-page tease.
        </p>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {WRITING_RULES.map((signal) => (
            <SignalCheckbox
              key={signal.label}
              signal={signal}
              checked={selectedRules.includes(signal.label)}
              onChange={(checked) =>
                setSelectedRules((current) =>
                  toggle(current, signal.label, checked),
                )
              }
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
