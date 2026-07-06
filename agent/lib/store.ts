import { randomUUID } from "node:crypto";

import { buildDemoInboxLeads } from "./demo-inbox-state";
import { bumpRunGeneration } from "./run-guard";
import {
  SEED_LEAD_IDS,
  SEED_LEAD_PROFILES,
  type SeedLeadProfile,
} from "./seed-leads";
import { emailBodyWithLandingPage } from "./stage-schemas";
import { storage } from "./storage";
import {
  DEFAULT_PIPELINE_CONFIG,
  TOGGLEABLE_STAGES,
  emptyStages,
  type ActivityEvent,
  type ContentGenerationOutput,
  type LandingPage,
  type Lead,
  type PipelineConfig,
  type PipelineStage,
  type StageRecord,
  type ToggleableStage,
} from "./types";

// All persistence goes through the storage backend (JSON files locally,
// Upstash Redis in production) and is namespaced by the caller's workspace —
// see storage.ts / workspace.ts. Entry points (API routes, tools, hooks)
// establish the workspace; these functions just read and write within it.

const CONFIG_KEY = "config";
const ACTIVITY_KEY = "activity";
const leadQueues = new Map<string, Promise<void>>();
const seedLeadOrder = new Map(
  SEED_LEAD_PROFILES.map((profile, index) => [profile.id, index]),
);

function leadKey(id: string): string {
  return `lead:${id}`;
}

function landingPageKey(slug: string): string {
  return `landing:${slug}`;
}

function compareLeadsForDisplay(a: Lead, b: Lead): number {
  const aSeedIndex = seedLeadOrder.get(a.id);
  const bSeedIndex = seedLeadOrder.get(b.id);

  if (aSeedIndex !== undefined || bSeedIndex !== undefined) {
    if (aSeedIndex !== undefined && bSeedIndex !== undefined) {
      return aSeedIndex - bSeedIndex;
    }
    return aSeedIndex !== undefined ? -1 : 1;
  }

  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

// Process-local write serialization for read-modify-write lead updates.
// This protects local fs storage and single-process demos from lost updates.
// Redis multi-instance deployments still need a distributed/atomic primitive.
async function withLeadLock<T>(
  leadId: string,
  work: () => Promise<T>,
): Promise<T> {
  const previous = leadQueues.get(leadId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = previous.then(() => current, () => current);
  leadQueues.set(leadId, chained);

  await previous;
  try {
    return await work();
  } finally {
    release();
    if (leadQueues.get(leadId) === chained) {
      leadQueues.delete(leadId);
    }
  }
}

// Only keep known toggleable stage keys — drops stale keys (e.g. a
// previously-toggleable stage that has since moved out of the pipeline) that
// may still linger in an old stored config.
function sanitizeStages(
  stages: Partial<Record<ToggleableStage, boolean>> | undefined,
): Record<ToggleableStage, boolean> {
  const next = { ...DEFAULT_PIPELINE_CONFIG.stages };
  for (const stage of TOGGLEABLE_STAGES) {
    if (stages?.[stage] !== undefined) {
      next[stage] = stages[stage] as boolean;
    }
  }
  return next;
}

export async function readPipelineConfig(): Promise<PipelineConfig> {
  const parsed = await storage().getJson<Partial<PipelineConfig>>(CONFIG_KEY);
  if (!parsed) {
    return structuredClone(DEFAULT_PIPELINE_CONFIG);
  }
  return {
    stages: sanitizeStages(parsed.stages),
    landingPages: parsed.landingPages ?? DEFAULT_PIPELINE_CONFIG.landingPages,
  };
}

export async function writePipelineConfig(
  config: PipelineConfig,
): Promise<PipelineConfig> {
  const next: PipelineConfig = {
    stages: sanitizeStages(config.stages),
    landingPages:
      config.landingPages ?? DEFAULT_PIPELINE_CONFIG.landingPages,
  };
  await storage().setJson(CONFIG_KEY, next);
  return next;
}

export async function isStageEnabled(
  stage: ToggleableStage,
): Promise<boolean> {
  const config = await readPipelineConfig();
  return config.stages[stage] !== false;
}

export async function listLeads(): Promise<Lead[]> {
  const keys = await storage().listKeys("lead:");
  const leads: Lead[] = [];
  for (const key of keys) {
    const lead = await storage().getJson<Lead>(key);
    if (lead && lead.source !== "eval" && !lead.id.startsWith("lead_eval")) {
      leads.push(lead);
    }
  }
  const sorted = leads.sort(compareLeadsForDisplay);
  const hasAllSeeds = SEED_LEAD_PROFILES.every((profile) =>
    sorted.some((lead) => lead.id === profile.id),
  );
  if (!hasAllSeeds) {
    return ensureSeedLeads();
  }
  return sorted;
}

export async function getLead(id: string): Promise<Lead | null> {
  return storage().getJson<Lead>(leadKey(id));
}

function normalized(value: string): string {
  return value.trim().toLowerCase();
}

function normalizedDomain(value: string): string {
  return normalized(value)
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

function extractEmail(value: string): string | null {
  return (
    value.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0].toLowerCase() ??
    null
  );
}

function uniqueLeadMatch(
  leads: Lead[],
  predicate: (lead: Lead) => boolean,
): Lead | null {
  const matches = leads.filter(predicate);
  return matches.length === 1 ? matches[0] : null;
}

export type LeadReferenceResolution = {
  lead: Lead | null;
  matchedBy?: "id" | "email" | "name" | "companyDomain" | "company";
  ambiguousCandidates?: string[];
};

export async function resolveLeadReference(
  reference: string,
): Promise<LeadReferenceResolution> {
  const value = reference.trim();
  if (!value) return { lead: null };

  const exact = await getLead(value);
  if (exact) return { lead: exact, matchedBy: "id" };

  const leads = await listLeads();
  const key = normalized(value);
  const email = extractEmail(value);
  const domain = normalizedDomain(value);

  const match =
    uniqueLeadMatch(leads, (lead) => normalized(lead.id) === key) ??
    (email
      ? uniqueLeadMatch(leads, (lead) => normalized(lead.email) === email)
      : null) ??
    uniqueLeadMatch(leads, (lead) => normalized(lead.name) === key) ??
    uniqueLeadMatch(
      leads,
      (lead) => normalizedDomain(lead.companyDomain) === domain,
    ) ??
    uniqueLeadMatch(leads, (lead) => normalized(lead.company) === key);

  if (match) {
    const matchedBy =
      normalized(match.id) === key
        ? "id"
        : email && normalized(match.email) === email
          ? "email"
          : normalized(match.name) === key
            ? "name"
            : normalizedDomain(match.companyDomain) === domain
              ? "companyDomain"
              : "company";
    return { lead: match, matchedBy };
  }

  const ambiguous = leads
    .filter(
      (lead) =>
        normalized(lead.id) === key ||
        (email && normalized(lead.email) === email) ||
        normalized(lead.name) === key ||
        normalizedDomain(lead.companyDomain) === domain ||
        normalized(lead.company) === key,
    )
    .map((lead) => lead.id);

  return {
    lead: null,
    ambiguousCandidates: ambiguous.length > 1 ? ambiguous : undefined,
  };
}

export async function saveLead(lead: Lead): Promise<Lead> {
  const next = { ...lead, updatedAt: new Date().toISOString() };
  await storage().setJson(leadKey(next.id), next);
  return next;
}

async function updateLead(
  leadId: string,
  mutate: (lead: Lead) => void | Promise<void>,
): Promise<Lead> {
  return withLeadLock(leadId, async () => {
    const lead = await getLead(leadId);
    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }
    await mutate(lead);
    return saveLead(lead);
  });
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
  return leads.sort(compareLeadsForDisplay);
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
  return updateLead(leadId, (lead) => {
    const now = new Date().toISOString();
    (lead.stages as Record<PipelineStage, StageRecord>)[stage] = {
      status: options?.status ?? "done",
      updatedAt: now,
      output,
      note: options?.note,
    };
    lead.currentStage = stage;
  });
}

export async function markStageSkipped(
  leadId: string,
  stage: PipelineStage,
  note: string,
): Promise<Lead> {
  return updateLead(leadId, (lead) => {
    (lead.stages as Record<PipelineStage, StageRecord>)[stage] = {
      status: "skipped",
      updatedAt: new Date().toISOString(),
      note,
    };
    lead.currentStage = stage;
  });
}

export async function setLeadOutcome(
  leadId: string,
  outcome: Lead["outcome"],
  recommendedNextAction?: string,
): Promise<Lead> {
  return updateLead(leadId, (lead) => {
    lead.outcome = outcome;
    if (recommendedNextAction) {
      lead.recommendedNextAction = recommendedNextAction;
    }
  });
}

function presentText(value: string | undefined, fallback: string): string {
  return value?.trim() ? value : fallback;
}

export async function queueSendDraft(
  leadId: string,
  input: {
    subject: string;
    body: string;
    cta: string;
    timezone?: string;
    reviewStatus?: "drafted" | "approved";
  },
): Promise<{ lead: Lead; send: NonNullable<ContentGenerationOutput["send"]> }> {
  let send: NonNullable<ContentGenerationOutput["send"]>;
  const lead = await updateLead(leadId, (lead) => {
    const existing = (lead.stages.content_generation?.output ??
      {}) as Partial<ContentGenerationOutput>;
    const now = new Date().toISOString();
    const status = input.reviewStatus ?? "drafted";
    const body = emailBodyWithLandingPage(input.body, existing.landingPageUrl);
    const sendWindow = computeSendWindow(
      input.timezone ?? lead.timezone ?? "America/Los_Angeles",
    );

    send = {
      status,
      subject: input.subject,
      body,
      cta: input.cta,
      sendWindow,
      ...(status === "approved" ? { approvedAt: now } : {}),
    };

    lead.stages.content_generation = {
      status: "done",
      updatedAt: now,
      output: {
        messagingStrategy: existing.messagingStrategy,
        subjectLines: existing.subjectLines?.length
          ? existing.subjectLines
          : [input.subject],
        emailBody: emailBodyWithLandingPage(
          presentText(existing.emailBody, body),
          existing.landingPageUrl,
        ),
        cta: presentText(existing.cta, input.cta),
        objectionResponses: existing.objectionResponses ?? [],
        landingPageSlug: existing.landingPageSlug,
        landingPageUrl: existing.landingPageUrl,
        send,
      },
    };
    lead.currentStage = "content_generation";
  });

  return { lead, send: send! };
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
  let reviewedSubject = "";
  let reviewedStatus: NonNullable<ContentGenerationOutput["send"]>["status"] =
    "drafted";
  const saved = await updateLead(leadId, (lead) => {
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
    reviewedSubject = send.subject;
    reviewedStatus = send.status;
  });

  const summaries: Record<SendReviewAction, string> = {
    approve: `Draft approved by BDR — send released: "${reviewedSubject}"`,
    deny: `Draft denied by BDR — send blocked: "${reviewedSubject}"`,
    edit: `Draft edited by BDR: "${reviewedSubject}"`,
  };
  await appendActivity({
    type: "review.decision",
    summary: summaries[action],
    detail: {
      leadId,
      action,
      subject: reviewedSubject,
      status: reviewedStatus,
    },
  });

  return saved;
}

export async function appendActivity(
  event: Omit<ActivityEvent, "id" | "timestamp"> & {
    id?: string;
    timestamp?: string;
  },
): Promise<ActivityEvent> {
  const entry: ActivityEvent = {
    id: event.id ?? randomUUID(),
    timestamp: event.timestamp ?? new Date().toISOString(),
    sessionId: event.sessionId,
    type: event.type,
    summary: event.summary,
    detail: event.detail,
  };
  await storage().appendLog(ACTIVITY_KEY, entry);
  return entry;
}

export async function readActivity(options?: {
  since?: string;
  limit?: number;
}): Promise<ActivityEvent[]> {
  let events = (await storage().readLog(ACTIVITY_KEY)) as ActivityEvent[];
  if (options?.since) {
    events = events.filter((event) => event.timestamp > options.since!);
  }
  if (options?.limit) {
    events = events.slice(-options.limit);
  }
  return events;
}

export async function saveLandingPage(page: LandingPage): Promise<LandingPage> {
  await storage().setJson(landingPageKey(page.slug), page);
  return page;
}

export async function getLandingPage(
  slug: string,
): Promise<LandingPage | null> {
  // Slugs come from public URLs; never let them escape the landing-page keys.
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return null;
  }
  return storage().getJson<LandingPage>(landingPageKey(slug));
}

export type ResetFactoryMode = "clean" | "demo";

/**
 * Reset the current workspace to its initial state: all seed leads back to
 * pending, dynamically created leads removed, landing pages cleared, and the
 * activity log truncated.
 *
 * Pass `mode: "demo"` to seed 2 drafted + 4 approved leads for the interview
 * review-queue opening state; remaining seeds stay fresh/pending.
 */
export async function resetFactory(
  options: { mode?: ResetFactoryMode } = {},
): Promise<Lead[]> {
  const mode = options.mode ?? "clean";

  // Kill switch: any pipeline run still executing server-side (the client
  // "Reset" button only aborts the browser's own stream) will find its
  // generation stale on its next write and stop instead of persisting on
  // top of the freshly-reset leads below.
  await bumpRunGeneration();

  for (const key of await storage().listKeys("lead:")) {
    const id = key.replace(/^lead:/, "");
    if (!SEED_LEAD_IDS.has(id)) {
      await storage().del(key);
    }
  }

  for (const key of await storage().listKeys("landing:")) {
    await storage().del(key);
  }

  const now = new Date().toISOString();
  const leads: Lead[] = [];

  if (mode === "demo") {
    const demoLeads = buildDemoInboxLeads(now);
    const demoById = new Map(demoLeads.map((lead) => [lead.id, lead]));
    for (const profile of SEED_LEAD_PROFILES) {
      const demoLead = demoById.get(profile.id);
      if (demoLead) {
        leads.push(await saveLead(demoLead));
      } else {
        leads.push(await saveLead(buildFreshSeedLead(profile, now)));
      }
    }
  } else {
    for (const profile of SEED_LEAD_PROFILES) {
      leads.push(await saveLead(buildFreshSeedLead(profile, now)));
    }
  }

  await storage().clearLog(ACTIVITY_KEY);
  return leads.sort(compareLeadsForDisplay);
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
