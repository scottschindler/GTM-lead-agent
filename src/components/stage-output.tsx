import type { PipelineStage } from "../../agent/lib/types";

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--geist-muted)]">
      {children}
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  const uniqueItems = Array.from(new Set(items.filter(Boolean)));
  if (uniqueItems.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {uniqueItems.map((item) => (
        <span
          key={item}
          className="rounded-full border border-[var(--geist-border)] px-2.5 py-0.5 text-xs"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Fact({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="text-sm">
      <span className="text-[var(--geist-muted)]">{label}</span>
      <div>{value}</div>
    </div>
  );
}

function hasText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasItems(items: string[] | undefined): boolean {
  return Array.isArray(items) && items.some((item) => hasText(item));
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[var(--geist-accent-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--geist-success)]">
      {children}
    </span>
  );
}

function ScoreBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  return (
    <div className="text-sm">
      <div className="mb-1 flex justify-between text-xs text-[var(--geist-muted)]">
        <span>{label}</span>
        <span>
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--geist-subtle)]">
        <div
          className="h-1.5 rounded-full bg-[var(--geist-success)]"
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function SourceLinks({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {urls.map((url) => {
        let host = url;
        try {
          host = new URL(url).hostname.replace(/^www\./, "");
        } catch {
          // keep the raw string when it's not a parseable URL
        }
        return (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[var(--geist-success)] underline-offset-2 hover:underline"
          >
            {host}
          </a>
        );
      })}
    </div>
  );
}

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  linkedin: "LinkedIn",
  phone: "Phone",
  call: "Call",
};

function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel.toLowerCase()] ?? channel;
}

function titleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// ---------------------------------------------------------------------------
// Per-stage views
// ---------------------------------------------------------------------------

function IntakeView({ data }: { data: { leadId?: string; source?: string } }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Fact label="Lead ID" value={data.leadId} />
      <Fact label="Source" value={data.source ? titleCase(data.source) : undefined} />
    </div>
  );
}

type ResearchData = {
  company?: {
    name?: string;
    industry?: string;
    employeeCount?: string;
    funding?: string;
    hiringActivity?: string;
    techStack?: string[];
    recentNews?: string[];
    growthSignals?: string[];
    sources?: string[];
  };
  person?: {
    name?: string;
    title?: string;
    team?: string;
    seniority?: string;
    technicalBackground?: string;
    decisionMakingAuthority?: string;
    sources?: string[];
  };
  initiatives?: string[];
  productLaunches?: string[];
  aiInitiatives?: string[];
  priorities?: string[];
  summary?: string;
  vercelAngle?: string;
  sources?: string[];
};

function ResearchView({ data }: { data: ResearchData }) {
  const company = data.company ?? {};
  const person = data.person ?? {};
  const allSources = [
    ...(data.sources ?? []),
    ...(company.sources ?? []),
    ...(person.sources ?? []),
  ];
  const hasSubstantiveResearch =
    hasText(data.summary) ||
    hasText(company.industry) ||
    hasText(company.employeeCount) ||
    hasText(company.funding) ||
    hasText(person.title) ||
    hasText(person.seniority) ||
    hasText(person.technicalBackground) ||
    hasText(person.decisionMakingAuthority) ||
    hasItems(company.techStack) ||
    hasItems(company.recentNews) ||
    hasItems(company.growthSignals) ||
    hasItems(data.initiatives) ||
    hasItems(data.aiInitiatives) ||
    hasItems(data.priorities);

  return (
    <div className="space-y-4">
      {data.summary ? <p className="text-sm">{data.summary}</p> : null}
      {!hasSubstantiveResearch ? (
        <p className="rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-subtle)] p-3 text-sm text-[var(--geist-muted)]">
          Research saved sources, but no usable company or contact details.
          Re-run this stage to capture a complete brief.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3 rounded-[8px] border border-[var(--geist-border)] p-3">
          <Label>Company</Label>
          <Fact label="Name" value={company.name} />
          <Fact label="Industry" value={company.industry} />
          <Fact label="Employees" value={company.employeeCount} />
          <Fact label="Funding" value={company.funding} />
          <Fact label="Hiring" value={company.hiringActivity} />
          {(company.techStack ?? []).length > 0 ? (
            <Section label="Tech stack">
              <Chips items={company.techStack ?? []} />
            </Section>
          ) : null}
        </div>

        <div className="space-y-3 rounded-[8px] border border-[var(--geist-border)] p-3">
          <Label>Contact</Label>
          <Fact label="Name" value={person.name} />
          <Fact label="Title" value={person.title} />
          <Fact label="Team" value={person.team} />
          <Fact label="Seniority" value={person.seniority} />
          <Fact label="Technical background" value={person.technicalBackground} />
          <Fact label="Decision authority" value={person.decisionMakingAuthority} />
        </div>
      </div>

      {(company.recentNews ?? []).length > 0 ? (
        <Section label="Recent news">
          <Bullets items={company.recentNews ?? []} />
        </Section>
      ) : null}
      {(company.growthSignals ?? []).length > 0 ? (
        <Section label="Growth signals">
          <Bullets items={company.growthSignals ?? []} />
        </Section>
      ) : null}
      {(data.initiatives ?? []).length > 0 ? (
        <Section label="Initiatives">
          <Bullets items={data.initiatives ?? []} />
        </Section>
      ) : null}
      {(data.productLaunches ?? []).length > 0 ? (
        <Section label="Product launches">
          <Bullets items={data.productLaunches ?? []} />
        </Section>
      ) : null}
      {(data.aiInitiatives ?? []).length > 0 ? (
        <Section label="AI initiatives">
          <Bullets items={data.aiInitiatives ?? []} />
        </Section>
      ) : null}
      {(data.priorities ?? []).length > 0 ? (
        <Section label="Priorities">
          <Bullets items={data.priorities ?? []} />
        </Section>
      ) : null}
      {allSources.length > 0 ? (
        <Section label="Sources">
          <SourceLinks urls={Array.from(new Set(allSources))} />
        </Section>
      ) : null}
    </div>
  );
}

function QualificationView({
  data,
}: {
  data: { scores?: Record<string, number>; verdict?: string; rationale?: string };
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-[var(--geist-muted)]">Verdict</span>
        <Badge>{data.verdict ? titleCase(data.verdict) : "—"}</Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {Object.entries(data.scores ?? {}).map(([key, value]) => (
          <ScoreBar key={key} label={titleCase(key)} value={value} />
        ))}
      </div>
      {data.rationale ? (
        <p className="text-sm text-[var(--geist-muted)]">{data.rationale}</p>
      ) : null}
    </div>
  );
}

function HypothesisView({
  data,
}: {
  data: {
    hypotheses?: Array<{
      statement: string;
      confidence: number;
      engineeringPain: string;
      businessImpact: string;
    }>;
  };
}) {
  return (
    <ul className="space-y-3">
      {(data.hypotheses ?? []).map((item) => (
        <li
          key={item.statement}
          className="rounded-[8px] border border-[var(--geist-border)] p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm font-medium">{item.statement}</div>
            <span className="shrink-0 font-mono text-xs text-[var(--geist-muted)]">
              {(item.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--geist-muted)]">
            <span className="text-[var(--geist-foreground)]">Pain:</span>{" "}
            {item.engineeringPain}
          </p>
          <p className="mt-1 text-sm text-[var(--geist-muted)]">
            <span className="text-[var(--geist-foreground)]">Impact:</span>{" "}
            {item.businessImpact}
          </p>
        </li>
      ))}
    </ul>
  );
}

function OpportunityView({
  data,
}: {
  data: {
    opportunities?: Array<{
      engineeringPain: string;
      vercelCapability: string;
      developerOutcome: string;
      businessImpact: string;
      estimatedRoi: string;
      priority: number;
    }>;
  };
}) {
  const opportunities = (data.opportunities ?? [])
    .slice()
    .sort((a, b) => a.priority - b.priority);
  return (
    <ul className="space-y-3">
      {opportunities.map((item) => (
        <li
          key={item.engineeringPain}
          className="rounded-[8px] border border-[var(--geist-border)] p-3"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 rounded-full bg-[var(--geist-accent-soft)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--geist-success)]">
              #{item.priority}
            </span>
            <div className="min-w-0 space-y-2">
              <div className="text-sm font-medium">{item.engineeringPain}</div>
              <p className="text-sm">
                <span className="text-[var(--geist-muted)]">Vercel fit:</span>{" "}
                {item.vercelCapability}
              </p>
              <p className="text-sm text-[var(--geist-muted)]">
                {item.developerOutcome}
              </p>
              <p className="text-sm text-[var(--geist-muted)]">
                <span className="text-[var(--geist-foreground)]">Business impact:</span>{" "}
                {item.businessImpact}
              </p>
              <p className="text-sm text-[var(--geist-muted)]">
                <span className="text-[var(--geist-foreground)]">Estimated ROI:</span>{" "}
                {item.estimatedRoi}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

type MessagingStrategyData = {
  messagingAngle?: string;
  technicalDepth?: string;
  tone?: string;
  story?: string;
  hooks?: string[];
  cta?: string;
  customerExamples?: string[];
  likelyObjections?: string[];
};

// Messaging strategy lives inside the content_generation output; exported so
// the reviews inbox can render it as its own panel.
export function MessagingStrategyView({ data }: { data: MessagingStrategyData }) {
  return (
    <div className="space-y-4">
      {data.messagingAngle ? <p className="text-sm">{data.messagingAngle}</p> : null}
      <Fact label="Tone" value={data.tone} />
      {data.story ? (
        <Section label="Story">
          <p className="text-sm text-[var(--geist-muted)]">{data.story}</p>
        </Section>
      ) : null}
      {(data.hooks ?? []).length > 0 ? (
        <Section label="Opening hooks">
          <ul className="space-y-2">
            {(data.hooks ?? []).map((hook) => (
              <li
                key={hook}
                className="rounded-[8px] border-l-2 border-[var(--geist-success)] bg-[var(--geist-subtle)] px-3 py-2 text-sm italic"
              >
                “{hook}”
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      {data.cta ? (
        <Section label="Call to action">
          <p className="text-sm">{data.cta}</p>
        </Section>
      ) : null}
      {(data.customerExamples ?? []).length > 0 ? (
        <Section label="Customer examples to reference">
          <Bullets items={data.customerExamples ?? []} />
        </Section>
      ) : null}
      {(data.likelyObjections ?? []).length > 0 ? (
        <Section label="Likely objections">
          <Bullets items={data.likelyObjections ?? []} />
        </Section>
      ) : null}
    </div>
  );
}

function SequenceView({
  data,
}: {
  data: {
    channels?: string[];
    cadence?: string;
    timing?: string;
    steps?: Array<{ channel: string; delayDays: number; purpose: string }>;
    followUpLogic?: string;
    exitConditions?: string[];
  };
}) {
  return (
    <div className="space-y-4">
      {(data.channels ?? []).length > 0 ? (
        <Section label="Channels">
          <Chips items={(data.channels ?? []).map(channelLabel)} />
        </Section>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {data.cadence ? (
          <Section label="Cadence">
            <p className="text-sm text-[var(--geist-muted)]">{data.cadence}</p>
          </Section>
        ) : null}
        {data.timing ? (
          <Section label="Timing">
            <p className="text-sm text-[var(--geist-muted)]">{data.timing}</p>
          </Section>
        ) : null}
      </div>

      {(data.steps ?? []).length > 0 ? (
        <Section label="Touchpoints">
          <ol className="relative space-y-0">
            {(data.steps ?? []).map((step, index, steps) => (
              <li
                key={`${step.channel}-${step.delayDays}-${index}`}
                className="relative flex gap-3 pb-4 last:pb-0"
              >
                <div className="flex flex-col items-center">
                  <span className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--geist-border)] bg-[var(--geist-background)] font-mono text-[11px]">
                    {index + 1}
                  </span>
                  {index < steps.length - 1 ? (
                    <span className="w-px flex-1 bg-[var(--geist-border)]" />
                  ) : null}
                </div>
                <div className="min-w-0 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {channelLabel(step.channel)}
                    <span className="font-mono text-[11px] font-normal text-[var(--geist-muted)]">
                      {step.delayDays === 0 ? "day 0" : `day ${step.delayDays}`}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-[var(--geist-muted)]">
                    {step.purpose}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {data.followUpLogic ? (
        <Section label="Follow-up logic">
          <p className="text-sm text-[var(--geist-muted)]">{data.followUpLogic}</p>
        </Section>
      ) : null}
      {(data.exitConditions ?? []).length > 0 ? (
        <Section label="Exit conditions">
          <Bullets items={data.exitConditions ?? []} />
        </Section>
      ) : null}
    </div>
  );
}

function formatRecommendedAt(iso?: string, timezone?: string): string | undefined {
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

function ContentView({
  data,
}: {
  data: {
    messagingStrategy?: MessagingStrategyData;
    subjectLines?: string[];
    emailBody?: string;
    cta?: string;
    objectionResponses?: string[];
    landingPageSlug?: string;
    landingPageUrl?: string;
    send?: {
      status?: string;
      sendWindow?: {
        timezone?: string;
        earliestLocal?: string;
        latestLocal?: string;
        recommendedAt?: string;
      };
    };
  };
}) {
  const send = data.send;
  const window = send?.sendWindow;
  return (
    <div className="space-y-4">
      {data.messagingStrategy ? (
        <Section label="Messaging strategy">
          <MessagingStrategyView data={data.messagingStrategy} />
        </Section>
      ) : null}
      {(data.subjectLines ?? []).length > 0 ? (
        <Section label="Subject line options">
          <Bullets items={data.subjectLines ?? []} />
        </Section>
      ) : null}
      {data.emailBody ? (
        <Section label="Email draft">
          <div className="rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-subtle)] p-3">
            <pre className="whitespace-pre-wrap font-sans text-sm">
              {data.emailBody}
            </pre>
          </div>
        </Section>
      ) : null}
      {data.landingPageUrl ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-[var(--geist-border)] p-3">
          <div className="min-w-0">
            <Label>Personalized landing page</Label>
            <div className="truncate font-mono text-xs text-[var(--geist-muted)]">
              {data.landingPageUrl}
            </div>
          </div>
          <a
            href={data.landingPageSlug ? `/for/${data.landingPageSlug}` : data.landingPageUrl}
            target="_blank"
            rel="noreferrer"
            className="geist-btn geist-btn-secondary"
          >
            View page
          </a>
        </div>
      ) : null}
      {data.cta ? (
        <div className="text-sm">
          <span className="text-[var(--geist-muted)]">CTA:</span>{" "}
          <span className="font-medium">{data.cta}</span>
        </div>
      ) : null}
      {send ? (
        <div className="rounded-[8px] border border-[var(--geist-border)] p-3">
          <div className="mb-3 flex items-center gap-2">
            <Label>Optimized send</Label>
            {send.status ? <Badge>{titleCase(send.status)}</Badge> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Fact
              label="Recommended"
              value={formatRecommendedAt(window?.recommendedAt, window?.timezone)}
            />
            <Fact
              label="Window (local)"
              value={
                window?.earliestLocal && window?.latestLocal
                  ? `${window.earliestLocal} – ${window.latestLocal}`
                  : undefined
              }
            />
            <Fact label="Timezone" value={window?.timezone} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EngagementView({
  data,
}: {
  data: {
    intentScore?: number;
    confidence?: number;
    events?: Array<{ id: string; type: string; occurredAt: string }>;
    signalBreakdown?: Array<{ signal: string; weight: number }>;
    recommendedNextAction?: string;
  };
}) {
  const score = data.intentScore ?? 0;
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 flex justify-between font-mono text-xs text-[var(--geist-muted)]">
          <span>intent score</span>
          <span>
            {score}/10 · confidence {((data.confidence ?? 0) * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--geist-subtle)]">
          <div
            className="h-1.5 rounded-full bg-[var(--geist-success)]"
            style={{ width: `${Math.min(100, (score / 10) * 100)}%` }}
          />
        </div>
      </div>
      {(data.signalBreakdown ?? []).length > 0 ? (
        <Section label="Signal breakdown">
          <ul className="space-y-1">
            {(data.signalBreakdown ?? []).map((item) => (
              <li key={item.signal} className="flex justify-between text-sm">
                <span>{titleCase(item.signal)}</span>
                <span className="font-mono text-xs text-[var(--geist-muted)]">
                  {item.weight}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      {(data.events ?? []).length > 0 ? (
        <Section label="Events">
          <ul className="space-y-1">
            {(data.events ?? []).map((event) => (
              <li key={event.id} className="text-sm">
                <span className="font-mono text-[11px] text-[var(--geist-muted)]">
                  {new Date(event.occurredAt).toLocaleString()}
                </span>{" "}
                {titleCase(event.type)}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      {data.recommendedNextAction ? (
        <p className="text-sm">
          Next: <span className="font-medium">{data.recommendedNextAction}</span>
        </p>
      ) : null}
    </div>
  );
}

function LearningView({
  data,
}: {
  data: {
    insights?: Array<{
      category: string;
      insight: string;
      evidence: string;
      applyTo: string;
    }>;
    hypothesisAccuracy?: string;
    whatWorked?: string[];
    whatToChange?: string[];
  };
}) {
  return (
    <div className="space-y-3">
      {data.hypothesisAccuracy ? (
        <p className="text-sm text-[var(--geist-muted)]">{data.hypothesisAccuracy}</p>
      ) : null}
      <ul className="space-y-2">
        {(data.insights ?? []).map((item) => (
          <li
            key={item.insight}
            className="rounded-[8px] border border-[var(--geist-border)] p-3"
          >
            <div className="font-mono text-[11px] uppercase tracking-wide text-[var(--geist-success)]">
              {item.category.replaceAll("_", " ")}
            </div>
            <div className="mt-1 text-sm font-medium">{item.insight}</div>
            <p className="mt-1 text-sm text-[var(--geist-muted)]">{item.evidence}</p>
            <p className="mt-1 font-mono text-xs text-[var(--geist-muted)]">
              applies to: {item.applyTo}
            </p>
          </li>
        ))}
      </ul>
      <div className="grid gap-3 sm:grid-cols-2">
        {(data.whatWorked ?? []).length > 0 ? (
          <Section label="What worked">
            <Bullets items={data.whatWorked ?? []} />
          </Section>
        ) : null}
        {(data.whatToChange ?? []).length > 0 ? (
          <Section label="What to change">
            <Bullets items={data.whatToChange ?? []} />
          </Section>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function StageOutput({
  stage,
  output,
}: {
  stage: PipelineStage;
  output: unknown;
}) {
  if (!output || typeof output !== "object") {
    return (
      <pre className="overflow-x-auto rounded-[8px] bg-[var(--geist-subtle)] p-3 font-sans text-xs">
        {JSON.stringify(output, null, 2)}
      </pre>
    );
  }

  const data = output as Record<string, never>;
  switch (stage) {
    case "intake":
      return <IntakeView data={data} />;
    case "research":
      return <ResearchView data={data} />;
    case "qualification":
      return <QualificationView data={data} />;
    case "hypothesis":
      return <HypothesisView data={data} />;
    case "opportunity_mapping":
      return <OpportunityView data={data} />;
    case "sequence_planning":
      return <SequenceView data={data} />;
    case "content_generation":
      return <ContentView data={data} />;
    case "engagement_intent":
      return <EngagementView data={data} />;
    case "learning":
      return <LearningView data={data} />;
    default:
      return (
        <pre className="overflow-x-auto rounded-[8px] bg-[var(--geist-subtle)] p-3 font-sans text-xs">
          {JSON.stringify(output, null, 2)}
        </pre>
      );
  }
}
