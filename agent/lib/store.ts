import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import {
  SEED_LEAD_IDS,
  SEED_LEAD_PROFILES,
  type SeedLeadProfile,
} from "./seed-leads";
import {
  DEFAULT_PIPELINE_CONFIG,
  emptyStages,
  type ActivityEvent,
  type ContentGenerationOutput,
  type EngagementEvent,
  type LandingPage,
  type Lead,
  type LearningInsight,
  type PipelineConfig,
  type PipelineStage,
  type StageRecord,
  type ToggleableStage,
} from "./types";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const LEADS_DIR = path.join(DATA_DIR, "leads");
const ACTIVITY_PATH = path.join(DATA_DIR, "activity.jsonl");
const CONFIG_PATH = path.join(DATA_DIR, "pipeline-config.json");
const INSIGHTS_PATH = path.join(DATA_DIR, "insights.json");
const LANDING_PAGES_DIR = path.join(DATA_DIR, "landing-pages");

async function ensureDirs(): Promise<void> {
  await fs.mkdir(LEADS_DIR, { recursive: true });
  await fs.mkdir(LANDING_PAGES_DIR, { recursive: true });
}

function leadPath(id: string): string {
  return path.join(LEADS_DIR, `${id}.json`);
}

export async function readPipelineConfig(): Promise<PipelineConfig> {
  await ensureDirs();
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<PipelineConfig>;
    return {
      stages: {
        ...DEFAULT_PIPELINE_CONFIG.stages,
        ...parsed.stages,
      },
      landingPages:
        parsed.landingPages ?? DEFAULT_PIPELINE_CONFIG.landingPages,
    };
  } catch {
    return structuredClone(DEFAULT_PIPELINE_CONFIG);
  }
}

export async function writePipelineConfig(
  config: PipelineConfig,
): Promise<PipelineConfig> {
  await ensureDirs();
  const next: PipelineConfig = {
    stages: {
      ...DEFAULT_PIPELINE_CONFIG.stages,
      ...config.stages,
    },
    landingPages:
      config.landingPages ?? DEFAULT_PIPELINE_CONFIG.landingPages,
  };
  await fs.writeFile(CONFIG_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export async function isStageEnabled(
  stage: ToggleableStage,
): Promise<boolean> {
  const config = await readPipelineConfig();
  return config.stages[stage] !== false;
}

export async function listLeads(): Promise<Lead[]> {
  await ensureDirs();
  const files = await fs.readdir(LEADS_DIR);
  const leads: Lead[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const raw = await fs.readFile(path.join(LEADS_DIR, file), "utf8");
    leads.push(JSON.parse(raw) as Lead);
  }
  const sorted = leads.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const hasAllSeeds = SEED_LEAD_PROFILES.every((profile) =>
    sorted.some((lead) => lead.id === profile.id),
  );
  if (!hasAllSeeds) {
    return ensureSeedLeads();
  }
  return sorted;
}

export async function getLead(id: string): Promise<Lead | null> {
  await ensureDirs();
  try {
    const raw = await fs.readFile(leadPath(id), "utf8");
    return JSON.parse(raw) as Lead;
  } catch {
    return null;
  }
}

export async function saveLead(lead: Lead): Promise<Lead> {
  await ensureDirs();
  const next = { ...lead, updatedAt: new Date().toISOString() };
  await fs.writeFile(
    leadPath(next.id),
    `${JSON.stringify(next, null, 2)}\n`,
    "utf8",
  );
  return next;
}

export function buildFreshSeedLead(profile: SeedLeadProfile, now?: string): Lead {
  const timestamp = now ?? new Date().toISOString();
  const lead: Lead = {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    company: profile.company,
    companyDomain: profile.companyDomain,
    source: profile.source,
    timezone: profile.timezone,
    createdAt: timestamp,
    updatedAt: timestamp,
    currentStage: "intake",
    outcome: "open",
    stages: emptyStages(),
    engagementEvents: [],
    intentScore: 0,
  };
  lead.stages.intake = {
    status: "done",
    updatedAt: timestamp,
    output: { leadId: profile.id, source: profile.source },
  };
  return lead;
}

export function isLeadPending(lead: Lead): boolean {
  return lead.outcome === "open";
}

export async function ensureSeedLeads(): Promise<Lead[]> {
  await ensureDirs();
  const leads: Lead[] = [];
  for (const profile of SEED_LEAD_PROFILES) {
    const existing = await getLead(profile.id);
    if (existing) {
      leads.push(existing);
      continue;
    }
    const lead = buildFreshSeedLead(profile);
    leads.push(await saveLead(lead));
  }
  return leads.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getNextPendingLead(): Promise<Lead | null> {
  const leads = await listLeads();
  return leads.find(isLeadPending) ?? null;
}

export async function createLead(input: {
  name: string;
  email: string;
  company: string;
  companyDomain: string;
  source: string;
  timezone?: string;
  id?: string;
}): Promise<Lead> {
  const now = new Date().toISOString();
  const id = input.id ?? `lead_${randomUUID().slice(0, 8)}`;
  const existing = await getLead(id);
  if (existing) {
    return existing;
  }

  const byEmail = (await listLeads()).find(
    (lead) => lead.email.toLowerCase() === input.email.toLowerCase(),
  );
  if (byEmail) {
    return byEmail;
  }

  const lead: Lead = {
    id,
    name: input.name,
    email: input.email,
    company: input.company,
    companyDomain: input.companyDomain
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, ""),
    source: input.source,
    timezone: input.timezone,
    createdAt: now,
    updatedAt: now,
    currentStage: "intake",
    outcome: "open",
    stages: emptyStages(),
    engagementEvents: [],
    intentScore: 0,
  };

  lead.stages.intake = {
    status: "done",
    updatedAt: now,
    output: { leadId: id, source: input.source },
  };

  return saveLead(lead);
}

export async function saveStageOutput<T>(
  leadId: string,
  stage: PipelineStage,
  output: T,
  options?: { status?: StageRecord["status"]; note?: string },
): Promise<Lead> {
  const lead = await getLead(leadId);
  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }

  const now = new Date().toISOString();
  (lead.stages as Record<PipelineStage, StageRecord>)[stage] = {
    status: options?.status ?? "done",
    updatedAt: now,
    output,
    note: options?.note,
  };
  lead.currentStage = stage;
  return saveLead(lead);
}

export async function markStageSkipped(
  leadId: string,
  stage: PipelineStage,
  note: string,
): Promise<Lead> {
  const lead = await getLead(leadId);
  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }
  (lead.stages as Record<PipelineStage, StageRecord>)[stage] = {
    status: "skipped",
    updatedAt: new Date().toISOString(),
    note,
  };
  lead.currentStage = stage;
  return saveLead(lead);
}

export async function setLeadOutcome(
  leadId: string,
  outcome: Lead["outcome"],
  recommendedNextAction?: string,
): Promise<Lead> {
  const lead = await getLead(leadId);
  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }
  lead.outcome = outcome;
  if (recommendedNextAction) {
    lead.recommendedNextAction = recommendedNextAction;
  }
  return saveLead(lead);
}

export type SendReviewAction = "approve" | "deny" | "edit";

/**
 * BDR review of a queued outreach draft. Approval is the gate: drafts stay
 * "drafted" until a human approves or denies them here. "edit" updates the
 * outgoing subject/body while keeping the draft in the review queue.
 */
export async function reviewSend(
  leadId: string,
  action: SendReviewAction,
  edits?: { subject?: string; body?: string },
): Promise<Lead> {
  const lead = await getLead(leadId);
  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }

  const content = lead.stages.content_generation?.output as
    | ContentGenerationOutput
    | undefined;
  if (!content?.send) {
    throw new Error(`Lead ${leadId} has no draft queued for review`);
  }

  const send = { ...content.send };
  if (edits?.subject !== undefined && edits.subject.trim()) {
    send.subject = edits.subject.trim();
  }
  if (edits?.body !== undefined && edits.body.trim()) {
    send.body = edits.body.trim();
  }

  const now = new Date().toISOString();
  if (action === "approve") {
    send.status = "approved";
    send.approvedAt = now;
    delete send.deniedAt;
  } else if (action === "deny") {
    send.status = "denied";
    send.deniedAt = now;
    delete send.approvedAt;
  } else {
    send.status = "drafted";
    delete send.approvedAt;
    delete send.deniedAt;
  }

  lead.stages.content_generation = {
    ...lead.stages.content_generation,
    updatedAt: now,
    output: { ...content, send },
  };
  const saved = await saveLead(lead);

  const summaries: Record<SendReviewAction, string> = {
    approve: `Draft approved by BDR — send released: "${send.subject}"`,
    deny: `Draft denied by BDR — send blocked: "${send.subject}"`,
    edit: `Draft edited by BDR: "${send.subject}"`,
  };
  await appendActivity({
    type: "review.decision",
    summary: summaries[action],
    detail: { leadId, action, subject: send.subject, status: send.status },
  });

  return saved;
}

export async function appendActivity(
  event: Omit<ActivityEvent, "id" | "timestamp"> & {
    id?: string;
    timestamp?: string;
  },
): Promise<ActivityEvent> {
  await ensureDirs();
  const entry: ActivityEvent = {
    id: event.id ?? randomUUID(),
    timestamp: event.timestamp ?? new Date().toISOString(),
    sessionId: event.sessionId,
    type: event.type,
    summary: event.summary,
    detail: event.detail,
  };
  await fs.appendFile(ACTIVITY_PATH, `${JSON.stringify(entry)}\n`, "utf8");
  return entry;
}

export async function readActivity(options?: {
  since?: string;
  limit?: number;
}): Promise<ActivityEvent[]> {
  await ensureDirs();
  try {
    const raw = await fs.readFile(ACTIVITY_PATH, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    let events = lines.map((line) => JSON.parse(line) as ActivityEvent);
    if (options?.since) {
      events = events.filter((event) => event.timestamp > options.since!);
    }
    if (options?.limit) {
      events = events.slice(-options.limit);
    }
    return events;
  } catch {
    return [];
  }
}

export type StoredInsight = LearningInsight & {
  id: string;
  leadId: string;
  createdAt: string;
};

export async function readInsights(): Promise<StoredInsight[]> {
  await ensureDirs();
  try {
    const raw = await fs.readFile(INSIGHTS_PATH, "utf8");
    return JSON.parse(raw) as StoredInsight[];
  } catch {
    return [];
  }
}

export async function saveInsights(
  leadId: string,
  insights: LearningInsight[],
): Promise<StoredInsight[]> {
  const existing = await readInsights();
  const now = new Date().toISOString();
  const stored = insights.map((insight) => ({
    ...insight,
    id: randomUUID().slice(0, 8),
    leadId,
    createdAt: now,
  }));
  const next = [...existing, ...stored];
  await fs.writeFile(
    INSIGHTS_PATH,
    `${JSON.stringify(next, null, 2)}\n`,
    "utf8",
  );
  return stored;
}

function landingPagePath(slug: string): string {
  return path.join(LANDING_PAGES_DIR, `${slug}.json`);
}

export async function saveLandingPage(page: LandingPage): Promise<LandingPage> {
  await ensureDirs();
  await fs.writeFile(
    landingPagePath(page.slug),
    `${JSON.stringify(page, null, 2)}\n`,
    "utf8",
  );
  return page;
}

export async function getLandingPage(
  slug: string,
): Promise<LandingPage | null> {
  // Slugs come from public URLs; never let them escape the landing pages dir.
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return null;
  }
  await ensureDirs();
  try {
    const raw = await fs.readFile(landingPagePath(slug), "utf8");
    return JSON.parse(raw) as LandingPage;
  } catch {
    return null;
  }
}

const ENGAGEMENT_SIGNALS: Array<{
  type: string;
  weight: number;
  chance: number;
}> = [
  { type: "email_opened", weight: 1, chance: 0.9 },
  { type: "email_link_clicked", weight: 2, chance: 0.6 },
  { type: "docs_page_visited", weight: 2, chance: 0.5 },
  { type: "pricing_page_visited", weight: 3, chance: 0.4 },
  { type: "customer_story_read", weight: 2, chance: 0.35 },
  { type: "reply_received", weight: 4, chance: 0.25 },
  { type: "product_signup", weight: 5, chance: 0.15 },
  { type: "calendar_link_viewed", weight: 3, chance: 0.2 },
];

/**
 * Deterministic pseudo-random engagement simulation, seeded by lead id so
 * repeated runs on the same lead produce the same "made up" timeline.
 */
export function simulateEngagement(leadId: string): {
  events: EngagementEvent[];
  intentScore: number;
  confidence: number;
  signalBreakdown: Array<{ signal: string; weight: number }>;
} {
  let seed = [...leadId].reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7) >>> 0;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  const now = Date.now();
  const events: EngagementEvent[] = [];
  const signalBreakdown: Array<{ signal: string; weight: number }> = [];
  let score = 0;
  let maxScore = 0;

  for (const signal of ENGAGEMENT_SIGNALS) {
    maxScore += signal.weight;
    if (random() < signal.chance) {
      const hoursAgo = Math.floor(random() * 72) + 1;
      events.push({
        id: randomUUID().slice(0, 8),
        type: signal.type,
        occurredAt: new Date(now - hoursAgo * 3_600_000).toISOString(),
        metadata: { simulated: true },
      });
      signalBreakdown.push({ signal: signal.type, weight: signal.weight });
      score += signal.weight;
    }
  }

  events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const intentScore = Math.round((score / maxScore) * 100) / 10;
  const confidence = Math.round((0.4 + events.length * 0.06) * 100) / 100;

  return {
    events,
    intentScore,
    confidence: Math.min(confidence, 0.95),
    signalBreakdown,
  };
}

export async function recordEngagement(
  leadId: string,
  events: EngagementEvent[],
  intentScore: number,
): Promise<Lead> {
  const lead = await getLead(leadId);
  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }
  lead.engagementEvents = [...lead.engagementEvents, ...events];
  lead.intentScore = intentScore;
  return saveLead(lead);
}

/**
 * Reset the factory to its initial state: all seed leads back to pending,
 * dynamically created lead files removed, and the activity log truncated.
 */
export async function resetFactory(): Promise<Lead[]> {
  await ensureDirs();

  const files = await fs.readdir(LEADS_DIR);
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const id = file.replace(/\.json$/, "");
    if (!SEED_LEAD_IDS.has(id)) {
      await fs.rm(path.join(LEADS_DIR, file), { force: true });
    }
  }

  const landingPages = await fs.readdir(LANDING_PAGES_DIR);
  for (const file of landingPages) {
    if (file.endsWith(".json")) {
      await fs.rm(path.join(LANDING_PAGES_DIR, file), { force: true });
    }
  }

  const now = new Date().toISOString();
  const leads: Lead[] = [];
  for (const profile of SEED_LEAD_PROFILES) {
    leads.push(await saveLead(buildFreshSeedLead(profile, now)));
  }

  await fs.writeFile(ACTIVITY_PATH, "", "utf8");
  return leads;
}

/**
 * A compact view of a lead for model context: everything except the full
 * stage outputs (which are large and already live in conversation history).
 */
export function leadSummary(lead: Lead): {
  id: string;
  name: string;
  email: string;
  company: string;
  companyDomain: string;
  source: string;
  timezone?: string;
  currentStage: PipelineStage;
  outcome: Lead["outcome"];
  stageStatuses: Record<PipelineStage, StageRecord["status"]>;
} {
  const stageStatuses = Object.fromEntries(
    Object.entries(lead.stages).map(([stage, record]) => [
      stage,
      record.status,
    ]),
  ) as Record<PipelineStage, StageRecord["status"]>;

  return {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    company: lead.company,
    companyDomain: lead.companyDomain,
    source: lead.source,
    timezone: lead.timezone,
    currentStage: lead.currentStage,
    outcome: lead.outcome,
    stageStatuses,
  };
}

export function computeSendWindow(timezone = "America/Los_Angeles"): {
  timezone: string;
  earliestLocal: string;
  latestLocal: string;
  recommendedAt: string;
} {
  const now = new Date();
  const recommended = new Date(now);
  recommended.setUTCHours(recommended.getUTCHours() + 2);
  return {
    timezone,
    earliestLocal: "09:00",
    latestLocal: "11:30",
    recommendedAt: recommended.toISOString(),
  };
}
