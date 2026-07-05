import type { Metadata } from "next";

import { AppHeader } from "../../components/app-header";

export const metadata: Metadata = {
  title: "Agent Architecture | Lead Agent",
  description:
    "Specialized GTM factory workers that increase confidence until a lead buys, disqualifies, hands off, or nurtures.",
};

type AgentStage =
  | "Intake"
  | "Enrichment"
  | "Discovery"
  | "Strategy"
  | "Outreach";

type Agent = {
  id: number;
  name: string;
  stage: AgentStage;
  summary: string;
  responsibility: string;
  output: string;
  details: string[];
};

const outcomes = [
  "The lead buys",
  "The lead is disqualified",
  "The lead is handed to a human",
  "The lead is nurtured for later",
];

const stages: { label: AgentStage; description: string }[] = [
  {
    label: "Intake",
    description: "Initialize leads and kick off the pipeline.",
  },
  {
    label: "Enrichment",
    description: "Build a complete company and contact profile.",
  },
  {
    label: "Discovery",
    description: "Qualify accounts and understand engineering priorities.",
  },
  {
    label: "Strategy",
    description: "Map pain to Vercel value and choose how to communicate.",
  },
  {
    label: "Outreach",
    description: "Plan, generate, and optimize outbound motion.",
  },
];

const agents: Agent[] = [
  {
    id: 1,
    name: "Lead Intake Agent",
    stage: "Intake",
    summary: "Creates and initializes a new lead.",
    responsibility: "Create the lead record and trigger the pipeline.",
    output: "Lead object with ID, source attribution, and timestamps.",
    details: ["Lead object", "Unique ID", "Source attribution", "Timestamps"],
  },
  {
    id: 2,
    name: "Data Enrichment Agent",
    stage: "Enrichment",
    summary: "Builds a complete profile of the company and contact.",
    responsibility: "Collect firmographic, contact, and relationship data.",
    output: "Enriched account and person profile.",
    details: [
      "Company: industry, size, funding, ARR, tech stack, hiring, news",
      "Person: title, team, seniority, LinkedIn, authority",
      "Relationship: CRM history and prior interactions",
    ],
  },
  {
    id: 3,
    name: "Qualification Agent",
    stage: "Discovery",
    summary: "Determines whether this account is worth pursuing.",
    responsibility: "Score ICP fit and overall priority.",
    output: "Qualification score and pursuit recommendation.",
    details: [
      "ICP fit and buying authority",
      "Product usage or intent signals",
      "Engineering maturity and company growth",
      "Potential business impact",
    ],
  },
  {
    id: 4,
    name: "Research Agent",
    stage: "Discovery",
    summary:
      "Builds a deep understanding of what engineering is trying to accomplish.",
    responsibility: "Research public signals across web, docs, and news.",
    output:
      "A narrative of what the engineering organization appears to be working on.",
    details: [
      "Website, engineering blog, product launches",
      "AI initiatives, hiring trends, documentation",
      "Tech stack, competitors, architecture changes",
      "Performance and developer experience priorities",
    ],
  },
  {
    id: 5,
    name: "Hypothesis Agent",
    stage: "Discovery",
    summary: "Infers the engineering problems they are likely facing.",
    responsibility: "Generate testable hypotheses with evidence.",
    output: "Ranked hypotheses with confidence and business impact.",
    details: [
      "Scaling frontend development",
      "Building AI-native products",
      "Standardizing on Next.js",
      "Improving deployment velocity and performance",
      "Modernizing developer workflows",
    ],
  },
  {
    id: 6,
    name: "Opportunity Mapping Agent",
    stage: "Strategy",
    summary: "Maps engineering challenges to Vercel's platform.",
    responsibility:
      "Connect engineering pain to capability, outcome, and ROI.",
    output: "Prioritized opportunities with estimated ROI.",
    details: [
      "Engineering pain → Vercel capability",
      "Developer outcome → business impact",
      "Estimated ROI for each opportunity",
    ],
  },
  {
    id: 7,
    name: "Personalization Strategy Agent",
    stage: "Strategy",
    summary: "Determines how to communicate before copy is written.",
    responsibility: "Choose messaging angle, tone, hooks, and proof points.",
    output: "Messaging strategy with objections and customer examples.",
    details: [
      "Messaging angle and technical depth",
      "Tone, story, hooks, and CTA",
      "Relevant customer examples",
      "Likely objections",
    ],
  },
  {
    id: 8,
    name: "Sequence Planning Agent",
    stage: "Outreach",
    summary: "Designs the outreach strategy.",
    responsibility: "Choose channels, cadence, timing, and exit conditions.",
    output: "Multi-step sequence plan with follow-up logic.",
    details: [
      "Channels: LinkedIn, email, phone",
      "Cadence, timing, and follow-up logic",
      "Exit conditions when signals change",
    ],
  },
  {
    id: 9,
    name: "Content Generation Agent",
    stage: "Outreach",
    summary: "Creates personalized outbound communication.",
    responsibility: "Generate copy and assets aligned to strategy.",
    output: "Subject lines, emails, CTAs, and supporting assets.",
    details: [
      "Subject lines, emails, and CTAs",
      "Objection responses",
      "Personalized landing pages and demo links",
      "Customer stories and technical examples",
    ],
  },
  {
    id: 10,
    name: "Send Optimization Agent",
    stage: "Outreach",
    summary: "Chooses a review-ready send window.",
    responsibility: "Optimize when messages are sent.",
    output: "Send schedule tuned to the recipient's time zone.",
    details: ["Send time", "Time zone", "Sending schedule"],
  },
];

export default function AgentsPage() {
  return (
    <main className="min-h-screen bg-[var(--geist-background)] text-[var(--geist-foreground)]">
      <AppHeader />

      <section className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
        <section className="flex flex-col gap-6 border-b border-[var(--geist-border)] pb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal text-[var(--geist-foreground)] sm:text-4xl">
              GTM factory workers
            </h1>
            <p className="mt-4 max-w-2xl text-base text-[var(--geist-muted)]">
              Instead of one monolithic agent, Lead Agent runs specialized
              workers on an assembly line. Each worker has a clear input,
              output, responsibility, and decision point.
            </p>
          </div>

          <div className="rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-surface)] p-5 shadow-[var(--geist-shadow)]">
            <p className="text-sm font-medium text-[var(--geist-foreground)]">
              North star
            </p>
            <p className="mt-2 text-sm text-[var(--geist-muted)]">
              The goal is not to send email sequences. The goal is to
              continuously increase confidence until one of four outcomes
              happens.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {outcomes.map((outcome) => (
                <li
                  className="rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-subtle)] px-3 py-2 text-sm text-[var(--geist-foreground)]"
                  key={outcome}
                >
                  {outcome}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stages.map((stage) => (
            <div
              className="rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-surface)] p-4 shadow-[var(--geist-shadow)]"
              key={stage.label}
            >
              <p className="text-sm font-medium text-[var(--geist-foreground)]">
                {stage.label}
              </p>
              <p className="mt-2 text-sm text-[var(--geist-muted)]">
                {stage.description}
              </p>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-6">
          {stages.map((stage) => {
            const stageAgents = agents.filter(
              (agent) => agent.stage === stage.label,
            );

            return (
              <div className="flex flex-col gap-4" key={stage.label}>
                <div className="flex flex-col gap-1 border-b border-[var(--geist-border)] pb-3">
                  <h2 className="text-xl font-semibold text-[var(--geist-foreground)]">
                    {stage.label}
                  </h2>
                  <p className="text-sm text-[var(--geist-muted)]">
                    {stage.description}
                  </p>
                </div>

                <div className="grid gap-4">
                  {stageAgents.map((agent) => (
                    <article
                      className="rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-surface)] p-5 shadow-[var(--geist-shadow)]"
                      key={agent.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-[var(--geist-muted)]">
                            Worker {agent.id.toString().padStart(2, "0")}
                          </p>
                          <h3 className="mt-1 text-lg font-semibold text-[var(--geist-foreground)]">
                            {agent.name}
                          </h3>
                          <p className="mt-2 text-sm text-[var(--geist-muted)]">
                            {agent.summary}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-sm font-medium text-[var(--geist-foreground)]">
                            Responsibility
                          </p>
                          <p className="mt-2 text-sm text-[var(--geist-muted)]">
                            {agent.responsibility}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--geist-foreground)]">
                            Output
                          </p>
                          <p className="mt-2 text-sm text-[var(--geist-muted)]">
                            {agent.output}
                          </p>
                        </div>
                      </div>

                      <ul className="mt-5 flex flex-col gap-2">
                        {agent.details.map((detail) => (
                          <li
                            className="rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-subtle)] px-3 py-2 text-sm text-[var(--geist-foreground)]"
                            key={detail}
                          >
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      </section>
    </main>
  );
}
