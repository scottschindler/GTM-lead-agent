import { AsyncLocalStorage } from "node:async_hooks";
import { promises as fs } from "node:fs";
import path from "node:path";

import { Redis } from "@upstash/redis";

import {
  ANONYMOUS_WORKSPACE_ID,
  sanitizeWorkspaceId,
} from "./workspace-cookie";

// Storage backend for everything the app persists (leads, activity, config,
// insights, landing pages, run state). Two implementations:
//
// - fs: JSON files under ./data, exactly the layout this repo has always
//   used. Local dev is single-user, so the workspace prefix is ignored and
//   on-disk files stay byte-compatible with existing data.
// - redis: Upstash (REST, serverless-safe). Every key is namespaced by an
//   anonymous per-visitor workspace id so multiple people can use the
//   deployed app at the same time without seeing each other's state.
//
// The active workspace travels via AsyncLocalStorage: entry points (API
// routes, agent tools, hooks) wrap their work in `runWithWorkspace`, and the
// store reads `currentWorkspaceId()` internally, so store function
// signatures stay unchanged.

export type StorageBackend = {
  readonly kind: "fs" | "redis";
  getJson<T>(key: string): Promise<T | null>;
  setJson(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
  /** Full keys (workspace-relative) that start with `prefix`. */
  listKeys(prefix: string): Promise<string[]>;
  appendLog(key: string, entry: unknown): Promise<void>;
  readLog(key: string): Promise<unknown[]>;
  clearLog(key: string): Promise<void>;
  /** Workspace-independent key/value, e.g. session→workspace mappings. */
  getGlobalJson<T>(key: string): Promise<T | null>;
  setGlobalJson(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
};

export const LOCAL_WORKSPACE_ID = "local";
export { ANONYMOUS_WORKSPACE_ID, sanitizeWorkspaceId };

const workspaceContext = new AsyncLocalStorage<string>();

export function currentWorkspaceId(): string {
  return workspaceContext.getStore() ?? LOCAL_WORKSPACE_ID;
}

export function runWithWorkspace<T>(
  workspaceId: string,
  work: () => Promise<T>,
): Promise<T> {
  return workspaceContext.run(sanitizeWorkspaceId(workspaceId), work);
}

// ---------------------------------------------------------------------------
// fs backend — the repo's original data/ layout
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");

function fsPathForKey(key: string): string {
  const lead = key.match(/^lead:(.+)$/);
  if (lead) return path.join(DATA_DIR, "leads", `${lead[1]}.json`);
  const landing = key.match(/^landing:(.+)$/);
  if (landing) {
    return path.join(DATA_DIR, "landing-pages", `${landing[1]}.json`);
  }
  switch (key) {
    case "config":
      return path.join(DATA_DIR, "pipeline-config.json");
    case "insights":
      return path.join(DATA_DIR, "insights.json");
    case "run-state":
      return path.join(DATA_DIR, "run-state.json");
    case "activity":
      return path.join(DATA_DIR, "activity.jsonl");
    default:
      return path.join(DATA_DIR, "kv", `${key.replace(/[:/]/g, "_")}.json`);
  }
}

async function ensureParentDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

const fsBackend: StorageBackend = {
  kind: "fs",
  async getJson<T>(key: string): Promise<T | null> {
    try {
      const raw = await fs.readFile(fsPathForKey(key), "utf8");
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  async setJson(key: string, value: unknown): Promise<void> {
    const filePath = fsPathForKey(key);
    await ensureParentDir(filePath);
    await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  },
  async del(key: string): Promise<void> {
    await fs.rm(fsPathForKey(key), { force: true });
  },
  async listKeys(prefix: string): Promise<string[]> {
    const dir =
      prefix === "lead:"
        ? path.join(DATA_DIR, "leads")
        : prefix === "landing:"
          ? path.join(DATA_DIR, "landing-pages")
          : null;
    if (!dir) return [];
    try {
      const files = await fs.readdir(dir);
      return files
        .filter((file) => file.endsWith(".json"))
        .map((file) => `${prefix}${file.replace(/\.json$/, "")}`);
    } catch {
      return [];
    }
  },
  async appendLog(key: string, entry: unknown): Promise<void> {
    const filePath = fsPathForKey(key);
    await ensureParentDir(filePath);
    await fs.appendFile(filePath, `${JSON.stringify(entry)}\n`, "utf8");
  },
  async readLog(key: string): Promise<unknown[]> {
    try {
      const raw = await fs.readFile(fsPathForKey(key), "utf8");
      return raw
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as unknown);
    } catch {
      return [];
    }
  },
  async clearLog(key: string): Promise<void> {
    const filePath = fsPathForKey(key);
    await ensureParentDir(filePath);
    await fs.writeFile(filePath, "", "utf8");
  },
  async getGlobalJson<T>(key: string): Promise<T | null> {
    return this.getJson<T>(key);
  },
  async setGlobalJson(key: string, value: unknown): Promise<void> {
    await this.setJson(key, value);
  },
};

// ---------------------------------------------------------------------------
// redis backend — Upstash REST, workspace-namespaced
// ---------------------------------------------------------------------------

// Abandoned workspaces shouldn't accumulate forever. Sliding expiry: every
// write refreshes the key's TTL. If part of a workspace expires, listLeads'
// seed check self-heals it back to fresh seed leads.
const WORKSPACE_TTL_SECONDS = 14 * 24 * 60 * 60;

function redisEnv(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

function createRedisBackend(env: { url: string; token: string }): StorageBackend {
  const redis = new Redis({ url: env.url, token: env.token });

  const nsKey = (key: string) => `ws:${currentWorkspaceId()}:${key}`;

  // The SDK JSON-parses values on read; entries written as objects come back
  // as objects, but keep string handling as a safety net.
  const parseEntry = (entry: unknown): unknown => {
    if (typeof entry !== "string") return entry;
    try {
      return JSON.parse(entry);
    } catch {
      return entry;
    }
  };

  return {
    kind: "redis",
    async getJson<T>(key: string): Promise<T | null> {
      return (await redis.get<T>(nsKey(key))) ?? null;
    },
    async setJson(key: string, value: unknown): Promise<void> {
      await redis.set(nsKey(key), value, { ex: WORKSPACE_TTL_SECONDS });
    },
    async del(key: string): Promise<void> {
      await redis.del(nsKey(key));
    },
    async listKeys(prefix: string): Promise<string[]> {
      const pattern = `${nsKey(prefix)}*`;
      const strip = `ws:${currentWorkspaceId()}:`;
      const keys: string[] = [];
      let cursor = "0";
      do {
        const [next, batch] = await redis.scan(cursor, {
          match: pattern,
          count: 200,
        });
        cursor = String(next);
        keys.push(...batch.map((key) => key.slice(strip.length)));
      } while (cursor !== "0");
      return keys;
    },
    async appendLog(key: string, entry: unknown): Promise<void> {
      const namespaced = nsKey(key);
      await redis.rpush(namespaced, JSON.stringify(entry));
      await redis.expire(namespaced, WORKSPACE_TTL_SECONDS);
    },
    async readLog(key: string): Promise<unknown[]> {
      const entries = await redis.lrange(nsKey(key), 0, -1);
      return entries.map(parseEntry);
    },
    async clearLog(key: string): Promise<void> {
      await redis.del(nsKey(key));
    },
    async getGlobalJson<T>(key: string): Promise<T | null> {
      return (await redis.get<T>(`global:${key}`)) ?? null;
    },
    async setGlobalJson(
      key: string,
      value: unknown,
      ttlSeconds = 24 * 60 * 60,
    ): Promise<void> {
      await redis.set(`global:${key}`, value, { ex: ttlSeconds });
    },
  };
}

let cachedBackend: StorageBackend | null = null;

export function storage(): StorageBackend {
  if (!cachedBackend) {
    const env = redisEnv();
    cachedBackend = env ? createRedisBackend(env) : fsBackend;
  }
  return cachedBackend;
}
