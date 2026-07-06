import type { Metadata } from "next";

import { AppHeader } from "../../components/app-header";
import { HandoffConfigurator } from "./handoff-configurator";
import { IcpConfigurator } from "./icp-configurator";
import { MessagingConfigurator } from "./messaging-configurator";
import { PromptConfigurator } from "./prompt-configurator";
import { ResearchConfigurator } from "./research-configurator";
import { SequenceConfigurator } from "./sequence-configurator";

export const metadata: Metadata = {
  title: "Configure | GTM Lead Agent",
  description:
    "Every knob and dial a salesperson can use to tune the lead factory agent.",
};

function CollapsibleSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <details className="group rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-surface)] shadow-[var(--geist-shadow)]">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 marker:hidden">
          <span>
            <span className="block text-xl font-semibold">{title}</span>
            <span className="mt-1 block text-sm text-[var(--geist-muted)]">
              {description}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--geist-border)] font-mono text-sm text-[var(--geist-muted)] transition group-open:rotate-45"
          >
            +
          </span>
        </summary>
        <div className="border-t border-[var(--geist-border)] px-5 py-5">
          {children}
        </div>
      </details>
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
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
      <input type="checkbox" defaultChecked={on} className="mt-1" />
    </label>
  );
}

export default function ConfigurePage() {
  return (
    <main className="min-h-screen bg-[var(--geist-background)] text-[var(--geist-foreground)]">
      <AppHeader />

      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-8">
        <CollapsibleSection
          title="ICP & qualification"
          description="Define what a qualified lead looks like. Thresholds set the minimum bar; weights decide which evidence matters most."
        >
          <Card>
            <IcpConfigurator />
          </Card>
        </CollapsibleSection>

        <CollapsibleSection
          title="Research & enrichment"
          description="Control how deep the researcher subagent digs and which sources it trusts."
        >
          <Card>
            <ResearchConfigurator />
          </Card>
        </CollapsibleSection>

        <CollapsibleSection
          title="Messaging & content"
          description="Shape how the agent writes. These feed the content-generation skill, which decides the messaging strategy before drafting."
        >
          <Card>
            <MessagingConfigurator />
            <div className="mt-5 border-t border-[var(--geist-border)] pt-5">
              <div className="mb-3">
                <h3 className="text-sm font-medium">Prompts</h3>
                <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
                  Edit messaging and content prompt versions, restore prior
                  versions, and compare which variants perform best.
                </p>
              </div>
              <PromptConfigurator />
            </div>
          </Card>
        </CollapsibleSection>

        <CollapsibleSection
          title="Sequence & sending"
          description="Cadence, channels, timing windows, and the exit rules that stop outreach."
        >
          <Card>
            <SequenceConfigurator />
          </Card>
        </CollapsibleSection>

        <CollapsibleSection
          title="Human handoff and guardrails"
          description="When the AI should stop, wait for approval, or hand the lead to a person."
        >
          <Card>
            <HandoffConfigurator />
          </Card>
        </CollapsibleSection>

        <CollapsibleSection
          title="Integrations & notifications"
          description="Where the factory connects to the rest of the stack."
        >
          <Card>
            <Toggle label="Engagement webhooks (opens, clicks, page visits)" on={false} />
            <Toggle
              label="Slack alerts"
              hint="Approvals, handoffs, and failures to a channel."
              on={false}
            />
          </Card>
        </CollapsibleSection>

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
