import type { Metadata } from "next";

import { AppHeader } from "../../components/app-header";
import { LandingPagesToggle } from "./landing-pages-toggle";

export const metadata: Metadata = {
  title: "Configure | GTM Lead Factory",
  description:
    "Every knob and dial a salesperson can use to tune the lead factory agent.",
};

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-[var(--geist-border)] pb-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-[var(--geist-muted)]">{description}</p>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-surface)] p-5 shadow-[var(--geist-shadow)]">
      {children}
    </div>
  );
}

function Toggle({
  label,
  hint,
  on = true,
}: {
  label: string;
  hint?: string;
  on?: boolean;
}) {
  return (
    <label className="flex items-start justify-between gap-4 py-2">
      <span>
        <span className="block text-sm">{label}</span>
        {hint ? (
          <span className="block text-xs text-[var(--geist-muted)]">{hint}</span>
        ) : null}
      </span>
      <input type="checkbox" defaultChecked={on} disabled className="mt-1" />
    </label>
  );
}

function Slider({
  label,
  hint,
  value,
  min = 0,
  max = 10,
  unit,
}: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
}) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between">
        <span className="text-sm">{label}</span>
        <span className="text-xs text-[var(--geist-muted)]">
          {value}
          {unit ?? ""}
        </span>
      </div>
      {hint ? (
        <p className="text-xs text-[var(--geist-muted)]">{hint}</p>
      ) : null}
      <input
        type="range"
        min={min}
        max={max}
        defaultValue={value}
        disabled
        className="mt-2 w-full"
      />
    </div>
  );
}

function Select({
  label,
  hint,
  options,
  value,
}: {
  label: string;
  hint?: string;
  options: string[];
  value: string;
}) {
  return (
    <div className="py-2">
      <label className="block text-sm">{label}</label>
      {hint ? (
        <p className="text-xs text-[var(--geist-muted)]">{hint}</p>
      ) : null}
      <select
        defaultValue={value}
        disabled
        className="mt-2 w-full rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-background)] px-3 py-2 text-sm"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function TextField({
  label,
  hint,
  value,
  textarea,
}: {
  label: string;
  hint?: string;
  value: string;
  textarea?: boolean;
}) {
  return (
    <div className="py-2">
      <label className="block text-sm">{label}</label>
      {hint ? (
        <p className="text-xs text-[var(--geist-muted)]">{hint}</p>
      ) : null}
      {textarea ? (
        <textarea
          defaultValue={value}
          disabled
          rows={3}
          className="mt-2 w-full rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-background)] px-3 py-2 text-xs"
        />
      ) : (
        <input
          defaultValue={value}
          disabled
          className="mt-2 w-full rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-background)] px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}

function Chips({ label, hint, items }: { label: string; hint?: string; items: string[] }) {
  return (
    <div className="py-2">
      <span className="block text-sm">{label}</span>
      {hint ? (
        <p className="text-xs text-[var(--geist-muted)]">{hint}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-[var(--geist-border)] bg-[var(--geist-subtle)] px-2.5 py-1 text-xs"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ConfigurePage() {
  return (
    <main className="min-h-screen bg-[var(--geist-background)] text-[var(--geist-foreground)]">
      <AppHeader subtitle="Configure" />

      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-8">
        <section className="flex flex-col gap-4">
          <SectionHeading
            title="ICP & qualification"
            description="Define who is worth pursuing and where the bar sits. These feed the qualification skill's rubric and the disqualify threshold enforced in code."
          />
          <Card>
            <Chips
              label="Ideal industries"
              items={["Developer tools", "AI products", "B2B SaaS", "E-commerce platforms", "Fintech"]}
            />
            <Select
              label="Company size sweet spot"
              options={["1–20", "21–200", "201–1,000", "1,000+"]}
              value="21–200"
            />
            <Chips
              label="Required tech signals"
              hint="At least one must be present in research for a strong ICP score."
              items={["Next.js", "React", "AI features shipping", "Frontend team ≥ 5"]}
            />
            <Slider
              label="Disqualify below overall priority"
              hint="Leads scoring under this are auto-disqualified before any outreach."
              value={4}
            />
            <Slider
              label="Score weight: buying authority"
              hint="How much the contact's seniority matters vs. company fit."
              value={7}
            />
            <Toggle
              label="Require decision-making authority"
              hint="Disqualify individual contributors even if the company fits."
              on={false}
            />
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading
            title="Research & enrichment"
            description="Control how deep the researcher subagent digs and which sources it trusts."
          />
          <Card>
            <Select
              label="Research depth"
              hint="Deeper research costs more tokens and time per lead."
              options={["Quick scan (~2 min)", "Standard (~5 min)", "Deep dive (~12 min)"]}
              value="Quick scan (~2 min)"
            />
            <Slider
              label="Max web searches per lead"
              value={2}
              max={40}
            />
            <Chips
              label="Prioritized sources"
              items={["Company engineering blog", "Careers page", "GitHub org", "Recent news", "Docs site", "LinkedIn"]}
            />
            <TextField
              label="Blocked domains"
              hint="Never fetch or cite these."
              value="reddit.com, quora.com"
            />
            <Toggle
              label="Include firmographic enrichment"
              hint="Headcount, funding, ARR estimates alongside engineering research."
            />
            <Toggle
              label="Require cited sources for every claim"
              hint="Uncited findings are dropped from the brief."
            />
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading
            title="Messaging & content"
            description="Shape how the agent writes. These feed the messaging-strategy and content-generation skills."
          />
          <Card>
            <Select
              label="Default tone"
              options={["Peer engineer", "Consultative", "Executive brief", "Casual founder-to-founder"]}
              value="Peer engineer"
            />
            <Select
              label="Technical depth"
              options={["Low", "Medium", "High"]}
              value="Medium"
            />
            <TextField
              label="Sender persona"
              hint="Who the outreach is from — signature, role, and voice."
              value="Scott Schindler · Enterprise AE, Vercel"
            />
            <TextField
              textarea
              label="Banned phrases"
              hint="The agent will never use these."
              value="synergy, circle back, quick call, touching base, revolutionary"
            />
            <Chips
              label="Approved customer stories"
              hint="Content generation may only reference these."
              items={["Notion", "Stripe docs", "Runway", "Zapier", "Under Armour"]}
            />
            <LandingPagesToggle />
            <Slider
              label="Max email length"
              value={120}
              max={400}
              unit=" words"
            />
            <Toggle
              label="Always offer an opt-out line"
              hint="e.g. 'If this isn't relevant, tell me and I won't follow up.'"
            />
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading
            title="Sequence & sending"
            description="Cadence, channels, timing windows, and the exit rules that stop outreach."
          />
          <Card>
            <Chips
              label="Enabled channels"
              items={["Email", "LinkedIn", "Phone (handoff only)"]}
            />
            <Slider label="Max touches per lead" value={4} max={10} />
            <Slider
              label="Minimum days between touches"
              value={3}
              max={14}
              unit=" days"
            />
            <Select
              label="Send window"
              hint="Local time at the recipient's timezone."
              options={["9:00–11:30 AM", "8:00–10:00 AM", "1:00–3:00 PM", "Any business hours"]}
              value="9:00–11:30 AM"
            />
            <Toggle label="Skip weekends and public holidays" />
            <Slider
              label="Daily send cap (all leads)"
              hint="Protects deliverability and pace."
              value={25}
              max={200}
            />
            <TextField
              textarea
              label="Exit conditions"
              hint="Any of these immediately stops the sequence."
              value="Reply received; unsubscribe or negative sentiment; pricing page visit → escalate to handoff instead of next touch"
            />
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading
            title="Approvals & guardrails"
            description="Where the human is always in the loop, and what the agent must never do."
          />
          <Card>
            <Select
              label="Outbound send approval"
              hint="Drafts queue in the Inbox; a BDR approval releases each send."
              options={["Every send", "First send per lead, then auto", "Auto under 50 words, approve otherwise", "Fully automatic"]}
              value="Every send"
            />
            <Toggle label="Approve before contacting C-level executives" />
            <Toggle label="Approve any claim about pricing or discounts" />
            <Toggle
              label="Approve before researching non-public individuals"
              on={false}
            />
            <TextField
              textarea
              label="Hard refusals"
              hint="Topics the agent declines regardless of prompting."
              value="Competitor disparagement; security posture claims without a source; legal or compliance commitments; fabricated customer references"
            />
            <TextField
              label="Compliance footer"
              hint="Appended to every outbound email."
              value="Vercel Inc. · 340 S Lemon Ave · You can reply 'stop' anytime."
            />
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading
            title="Human handoff"
            description="When the AI should stop and a person should take over."
          />
          <Card>
            <Chips
              label="Auto-escalate on"
              items={["Enterprise signals", "Pricing discussion", "Security review", "Procurement / legal", "Architecture deep-dive", "Executive interest"]}
            />
            <Slider
              label="Escalate above intent score"
              value={8}
              hint="High-intent leads go to a human even without an explicit trigger."
            />
            <Select
              label="Handoff destination"
              options={["Assign to me", "Round-robin AE team", "Slack #gtm-handoffs", "CRM task"]}
              value="Assign to me"
            />
            <Toggle label="Include full conversation history in the brief" />
            <Toggle label="Draft suggested talking points" />
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeading
            title="Integrations & notifications"
            description="Where the factory connects to the rest of the stack."
          />
          <Card>
            <Toggle label="CRM sync (Salesforce / HubSpot)" on={false} />
            <Toggle label="Email delivery via Resend" on={false} />
            <Toggle label="Enrichment provider (Clearbit / Apollo)" on={false} />
            <Toggle label="Engagement webhooks (opens, clicks, page visits)" on={false} />
            <Toggle
              label="Slack alerts"
              hint="Approvals, handoffs, and failures to a channel."
              on={false}
            />
            <Select
              label="Daily digest"
              options={["Off", "Email", "Slack"]}
              value="Off"
            />
          </Card>
        </section>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--geist-border)] pt-6">
          <button
            type="button"
            disabled
            className="rounded-[8px] border border-[var(--geist-border)] px-4 py-2 text-sm opacity-50"
          >
            Reset to defaults
          </button>
          <button
            type="button"
            disabled
            className="rounded-[8px] border border-[var(--geist-foreground)] bg-[var(--geist-foreground)] px-4 py-2 text-sm font-medium text-[var(--geist-background)] opacity-50"
          >
            Save configuration
          </button>
        </div>
      </div>
    </main>
  );
}
