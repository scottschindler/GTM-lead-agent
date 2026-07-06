"use client";

import { useState } from "react";

type Signal = {
  label: string;
  description: string;
  current?: boolean;
};

type Touchpoint = {
  label: string;
  channel: string;
  delayDays: number;
  purpose: string;
  current?: boolean;
};

const CURRENT_PIPELINE_SIGNALS: Signal[] = [
  {
    label: "Ordered channel list",
    description: "The sequence stage saves the channels in the order it plans to use them.",
    current: true,
  },
  {
    label: "Cadence",
    description: "Overall rhythm for the first email, light social touch, follow-up, then pause.",
    current: true,
  },
  {
    label: "Timing window",
    description: "When to start and which recipient-local windows are preferred.",
    current: true,
  },
  {
    label: "Ordered touchpoints",
    description: "Each planned step has a channel, day offset, and purpose.",
    current: true,
  },
  {
    label: "Follow-up logic",
    description: "How silence, replies, and engagement change the next step.",
    current: true,
  },
  {
    label: "Exit conditions",
    description: "When the sequence should stop, hand off, or nurture instead of continuing.",
    current: true,
  },
  {
    label: "Draft first email only",
    description: "The live demo drafts the first email now; later touches remain planned.",
    current: true,
  },
];

const OPTIONAL_SIGNALS: Signal[] = [
  {
    label: "Phone handoff",
    description: "Add a call task instead of an automated phone step.",
  },
  {
    label: "Executive escalation",
    description: "Route senior replies or enterprise interest to a human immediately.",
  },
  {
    label: "Engagement-based acceleration",
    description: "Move faster when the prospect clicks, replies, or views the landing page.",
  },
  {
    label: "Nurture fallback",
    description: "Move low-intent leads to nurture instead of continuing outbound touches.",
  },
  {
    label: "Timezone strict mode",
    description: "Only schedule touches inside the recipient's local business hours.",
  },
  {
    label: "One follow-up maximum",
    description: "Cap outreach after one follow-up if there is no engagement.",
  },
];

const CHANNELS: Signal[] = [
  {
    label: "Email",
    description: "Primary outbound channel and first drafted touch.",
    current: true,
  },
  {
    label: "LinkedIn",
    description: "Light social touch after the first email.",
    current: true,
  },
  {
    label: "Phone handoff",
    description: "Human-owned call task, not automated dialing.",
  },
  {
    label: "Slack alert",
    description: "Notify the team on high-intent engagement.",
  },
];

const TOUCHPOINTS: Touchpoint[] = [
  {
    label: "First email",
    channel: "email",
    delayDays: 0,
    purpose: "Share the tailored page and ask for a short conversation.",
    current: true,
  },
  {
    label: "Light social touch",
    channel: "LinkedIn",
    delayDays: 2,
    purpose: "Warm the account without adding a second email immediately.",
    current: true,
  },
  {
    label: "One email follow-up",
    channel: "email",
    delayDays: 5,
    purpose: "Follow up once, then pause unless there is engagement.",
    current: true,
  },
  {
    label: "Human call task",
    channel: "phone",
    delayDays: 1,
    purpose: "Create a BDR-owned call task for enterprise or high-intent leads.",
  },
  {
    label: "Landing-page revisit",
    channel: "email",
    delayDays: 7,
    purpose: "Send a short note only if the prospect viewed the personalized page.",
  },
];

const EXIT_RULES: Signal[] = [
  {
    label: "Positive reply",
    description: "Stop scheduled touches and move to human handoff.",
    current: true,
  },
  {
    label: "Explicit no",
    description: "Stop immediately and do not continue the sequence.",
    current: true,
  },
  {
    label: "No engagement after follow-up",
    description: "Pause after the planned follow-up instead of sending more touches.",
    current: true,
  },
  {
    label: "Unsubscribe or stop request",
    description: "Stop immediately and mark do not contact.",
  },
  {
    label: "Pricing or procurement signal",
    description: "Pause outreach and create a human handoff.",
  },
  {
    label: "Hard bounce",
    description: "Stop the sequence and mark the email invalid.",
  },
];

function toggle(values: string[], value: string, checked: boolean): string[] {
  if (checked) return Array.from(new Set([...values, value]));
  return values.filter((item) => item !== value);
}

function CheckboxCard({
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

function TouchpointCard({
  step,
  checked,
  onChange,
}: {
  step: Touchpoint;
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
          {step.label}
          <span className="font-mono text-[10px] font-normal text-[var(--geist-muted)]">
            {step.delayDays === 0 ? "day 0" : `day ${step.delayDays}`}
          </span>
        </span>
        <span className="mt-0.5 block text-[11px] leading-4 text-[var(--geist-muted)]">
          {step.channel}: {step.purpose}
        </span>
      </span>
    </label>
  );
}

export function SequenceConfigurator() {
  const [sendWindow, setSendWindow] = useState("9:00-11:30 AM");
  const [maxTouches, setMaxTouches] = useState(3);
  const [selectedSignals, setSelectedSignals] = useState(
    CURRENT_PIPELINE_SIGNALS.map((signal) => signal.label),
  );
  const [selectedChannels, setSelectedChannels] = useState(
    CHANNELS.filter((signal) => signal.current).map((signal) => signal.label),
  );
  const [selectedTouchpoints, setSelectedTouchpoints] = useState(
    TOUCHPOINTS.filter((step) => step.current).map((step) => step.label),
  );
  const [selectedExitRules, setSelectedExitRules] = useState(
    EXIT_RULES.filter((rule) => rule.current).map((rule) => rule.label),
  );

  return (
    <div>
      <div className="grid gap-3 py-1.5 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium">Send window</label>
          <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
            Demo-only timing preference for recipient-local business hours.
          </p>
          <select
            value={sendWindow}
            onChange={(event) => setSendWindow(event.target.value)}
            className="mt-1.5 w-full rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-background)] px-2.5 py-1.5 text-xs"
          >
            {[
              "9:00-11:30 AM",
              "8:00-10:00 AM",
              "1:00-3:00 PM",
              "Any business hours",
            ].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium">Max planned touches</span>
            <span className="font-mono text-[11px] text-[var(--geist-muted)]">
              {maxTouches}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
            The live default is light: first email, social touch, one follow-up.
          </p>
          <input
            type="range"
            min={1}
            max={5}
            value={maxTouches}
            onChange={(event) => setMaxTouches(Number(event.target.value))}
            className="mt-1.5 w-full accent-[var(--geist-success)]"
          />
        </div>
      </div>

      <fieldset className="py-2">
        <legend className="text-xs font-medium">Sequence planning signals</legend>
        <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
          Checked defaults match the sequence planning stage today. Extra
          signals can be toggled for the demo.
        </p>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {[...CURRENT_PIPELINE_SIGNALS, ...OPTIONAL_SIGNALS].map((signal) => (
            <CheckboxCard
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

      <fieldset className="py-2">
        <legend className="text-xs font-medium">Channels</legend>
        <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
          Email and LinkedIn match the current demo default.
        </p>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {CHANNELS.map((signal) => (
            <CheckboxCard
              key={signal.label}
              signal={signal}
              checked={selectedChannels.includes(signal.label)}
              onChange={(checked) =>
                setSelectedChannels((current) =>
                  toggle(current, signal.label, checked),
                )
              }
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="py-2">
        <legend className="text-xs font-medium">Touchpoint plan</legend>
        <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
          Current planned touches mirror the persisted sequence steps.
        </p>
        <div className="mt-2 grid gap-1.5">
          {TOUCHPOINTS.map((step) => (
            <TouchpointCard
              key={step.label}
              step={step}
              checked={selectedTouchpoints.includes(step.label)}
              onChange={(checked) =>
                setSelectedTouchpoints((current) =>
                  toggle(current, step.label, checked),
                )
              }
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="py-2">
        <legend className="text-xs font-medium">Exit conditions</legend>
        <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
          Selected rules define when to stop, hand off, or pause.
        </p>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {EXIT_RULES.map((signal) => (
            <CheckboxCard
              key={signal.label}
              signal={signal}
              checked={selectedExitRules.includes(signal.label)}
              onChange={(checked) =>
                setSelectedExitRules((current) =>
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
