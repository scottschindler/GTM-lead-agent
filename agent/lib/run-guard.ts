import { storage } from "./storage";

// Eve sessions are durable workflows: aborting the client's stream (what the
// dashboard's "Reset" button does via `agent.stop()`) only detaches the
// browser from the run — it does not stop the turn executing server-side.
// Without this guard a run that was mid-flight when Reset was pressed keeps
// calling tools and can write stage output on top of the freshly-reset
// leads a few seconds later.
//
// This file makes Reset an actual kill switch: it bumps a generation
// counter. Every mutating tool registers the run (by its root session id,
// so a subagent shares its parent's registration) against the generation
// active when it first wrote, then checks that generation on every later
// write. A run that predates a Reset finds its generation stale and throws
// instead of persisting.
//
// State lives in the workspace-namespaced storage backend, so the
// one-active-run rule is per workspace: visitors never queue behind each
// other's runs, only behind their own.
const RUN_STATE_KEY = "run-state";

type RunState = {
  generation: number;
  sessions: Record<string, number>;
  activeRun?: {
    rootSessionId: string;
    leadId: string;
    generation: number;
    startedAt: string;
  };
};

export type PipelineRunSnapshot = {
  generation: number;
  activeRun?: {
    leadId: string;
    startedAt: string;
  };
};

const DEFAULT_STATE: RunState = { generation: 0, sessions: {} };
const ACTIVE_RUN_TTL_MS = 45 * 60 * 1000;
let runStateQueue: Promise<void> = Promise.resolve();

async function withRunStateLock<T>(work: () => Promise<T>): Promise<T> {
  const previous = runStateQueue;
  let release!: () => void;
  runStateQueue = new Promise((resolve) => {
    release = resolve;
  });

  await previous;
  try {
    return await work();
  } finally {
    release();
  }
}

async function readRunState(): Promise<RunState> {
  const parsed = await storage().getJson<Partial<RunState>>(RUN_STATE_KEY);
  if (!parsed) {
    return structuredClone(DEFAULT_STATE);
  }
  return {
    generation: parsed.generation ?? 0,
    sessions: parsed.sessions ?? {},
    activeRun: parsed.activeRun,
  };
}

async function writeRunState(state: RunState): Promise<void> {
  await storage().setJson(RUN_STATE_KEY, state);
}

export async function readPipelineRunSnapshot(): Promise<PipelineRunSnapshot> {
  return withRunStateLock(async () => {
    const state = await readRunState();
    if (isActiveRunStale(state)) {
      delete state.activeRun;
      await writeRunState(state);
    }
    return {
      generation: state.generation,
      activeRun: state.activeRun
        ? {
            leadId: state.activeRun.leadId,
            startedAt: state.activeRun.startedAt,
          }
        : undefined,
    };
  });
}

/**
 * Advances the run generation. Existing session registrations are left in
 * place (at their old, now-stale generation number) rather than cleared or
 * pruned — a registration missing from the map reads as "never seen",
 * which `assertRunIsCurrent` treats as a fresh, legitimate claim. Deleting
 * a stale entry would let that run revive itself as "current" on its next
 * write instead of staying dead, so entries are kept for the life of the
 * process. Call this from `resetFactory`; it's what turns Reset into a
 * kill switch for any pipeline run already in flight.
 */
export async function bumpRunGeneration(): Promise<number> {
  return withRunStateLock(async () => {
    const state = await readRunState();
    state.generation += 1;
    delete state.activeRun;
    await writeRunState(state);
    return state.generation;
  });
}

function isActiveRunStale(state: RunState): boolean {
  if (!state.activeRun) return false;
  if (state.activeRun.generation !== state.generation) return true;

  const startedAt = Date.parse(state.activeRun.startedAt);
  if (Number.isNaN(startedAt)) return true;
  return Date.now() - startedAt > ACTIVE_RUN_TTL_MS;
}

export class StaleRunError extends Error {
  constructor() {
    super(
      "This pipeline run was stopped by a Reset. Do not retry this tool or call any further tools — end the turn now.",
    );
    this.name = "StaleRunError";
  }
}

export class PipelineRunAlreadyActiveError extends Error {
  constructor(leadId: string) {
    super(
      `A pipeline run is already active for ${leadId}. Wait for it to finish or press Reset before starting another run.`,
    );
    this.name = "PipelineRunAlreadyActiveError";
  }
}

/**
 * Claims the single active pipeline slot for a root session. This catches
 * double-clicks, duplicate browser tabs, and stale client streams at the
 * runtime boundary instead of relying only on button disabled state.
 */
export async function claimPipelineRun(
  rootSessionId: string,
  leadId: string,
): Promise<void> {
  await withRunStateLock(async () => {
    const state = await readRunState();
    if (isActiveRunStale(state)) {
      delete state.activeRun;
    }

    if (
      state.activeRun &&
      state.activeRun.rootSessionId !== rootSessionId
    ) {
      throw new PipelineRunAlreadyActiveError(state.activeRun.leadId);
    }

    const registered = state.sessions[rootSessionId];
    if (registered !== undefined && registered !== state.generation) {
      throw new StaleRunError();
    }

    state.sessions[rootSessionId] ??= state.generation;
    state.activeRun = {
      rootSessionId,
      leadId,
      generation: state.generation,
      startedAt: state.activeRun?.startedAt ?? new Date().toISOString(),
    };
    await writeRunState(state);
  });
}

export async function releasePipelineRun(rootSessionId: string): Promise<void> {
  await withRunStateLock(async () => {
    const state = await readRunState();
    if (state.activeRun?.rootSessionId === rootSessionId) {
      delete state.activeRun;
      await writeRunState(state);
    }
  });
}

/**
 * Claims the current generation for `rootSessionId` on first use, or
 * validates it on later calls. Throws `StaleRunError` once a Reset has
 * bumped the generation out from under an in-flight run.
 */
export async function assertRunIsCurrent(rootSessionId: string): Promise<void> {
  await withRunStateLock(async () => {
    const state = await readRunState();
    if (isActiveRunStale(state)) {
      delete state.activeRun;
    }
    if (
      state.activeRun &&
      state.activeRun.rootSessionId !== rootSessionId
    ) {
      throw new PipelineRunAlreadyActiveError(state.activeRun.leadId);
    }

    const registered = state.sessions[rootSessionId];
    if (registered === undefined) {
      state.sessions[rootSessionId] = state.generation;
      await writeRunState(state);
      return;
    }
    if (registered !== state.generation) {
      throw new StaleRunError();
    }
  });
}

/**
 * The id that ties a subagent's session back to the top-level run it was
 * delegated from, so a foreman turn and its researcher subagent share one
 * registration. Root sessions (no `parent`) use their own id.
 */
export function rootSessionIdOf(session: {
  readonly id: string;
  readonly parent?: { readonly rootSessionId: string };
}): string {
  return session.parent?.rootSessionId ?? session.id;
}
