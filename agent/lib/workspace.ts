import {
  ANONYMOUS_WORKSPACE_ID,
  runWithWorkspace,
  sanitizeWorkspaceId,
  storage,
} from "./storage";
import { WORKSPACE_COOKIE } from "./workspace-cookie";

// Anonymous per-visitor workspaces. A middleware cookie identifies each
// browser; the eve channel turns it into the session principal
// (`ws_<id>`), and everything below namespaces storage by it. No accounts,
// no login — four people can use the deployed demo at once without
// touching each other's leads, activity, or runs.

export { WORKSPACE_COOKIE };
export const WORKSPACE_PRINCIPAL_PREFIX = "ws_";

export function workspaceIdFromCookieHeader(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${WORKSPACE_COOKIE}=([^;]+)`),
  );
  return match ? sanitizeWorkspaceId(decodeURIComponent(match[1])) : null;
}

type SessionLike = {
  readonly id: string;
  readonly parent?: { readonly rootSessionId: string };
  readonly auth?: {
    readonly current?: { readonly principalId?: string } | null;
    readonly initiator?: { readonly principalId?: string } | null;
  };
};

function workspaceFromPrincipal(
  principalId: string | undefined,
): string | null {
  if (!principalId?.startsWith(WORKSPACE_PRINCIPAL_PREFIX)) return null;
  return sanitizeWorkspaceId(
    principalId.slice(WORKSPACE_PRINCIPAL_PREFIX.length),
  );
}

function sessionMappingKey(rootSessionId: string): string {
  return `session-workspace:${rootSessionId}`;
}

/**
 * Remember which workspace a root session belongs to. Subagent sessions
 * authenticate as internal runtime callers (not with the visitor's cookie),
 * so their tools can't read the workspace from their own auth — they look
 * it up through this mapping instead.
 */
export async function recordSessionWorkspace(
  rootSessionId: string,
  workspaceId: string,
): Promise<void> {
  await storage().setGlobalJson(sessionMappingKey(rootSessionId), workspaceId);
}

/**
 * Resolve the workspace for the current agent execution:
 * 1. the session principal, when the caller authenticated via the
 *    workspace cookie;
 * 2. the recorded root-session mapping, for subagent sessions;
 * 3. the anonymous shared workspace as a last resort.
 * On the fs backend (local dev) there is only one workspace.
 */
export async function workspaceForSession(session: SessionLike): Promise<string> {
  if (storage().kind === "fs") return "local";

  const fromAuth =
    workspaceFromPrincipal(session.auth?.current?.principalId) ??
    workspaceFromPrincipal(session.auth?.initiator?.principalId);
  const rootSessionId = session.parent?.rootSessionId ?? session.id;

  if (fromAuth) {
    // Keep the mapping fresh so subagents spawned later can find it.
    try {
      await recordSessionWorkspace(rootSessionId, fromAuth);
    } catch {
      // Mapping writes are best-effort; the root session doesn't need them.
    }
    return fromAuth;
  }

  const mapped = await storage().getGlobalJson<string>(
    sessionMappingKey(rootSessionId),
  );
  return mapped ? sanitizeWorkspaceId(mapped) : ANONYMOUS_WORKSPACE_ID;
}

/**
 * Entry-point wrapper for agent tools and hooks: resolve the session's
 * workspace, then run the work inside it so every store call lands in the
 * right namespace.
 */
export async function inSessionWorkspace<T>(
  session: SessionLike,
  work: () => Promise<T>,
): Promise<T> {
  const workspaceId = await workspaceForSession(session);
  return runWithWorkspace(workspaceId, work);
}

/**
 * Entry-point wrapper for Next.js route handlers and server components:
 * resolve the visitor's workspace from the request cookie, then run the
 * work inside it.
 */
export function inRequestWorkspace<T>(
  request: { headers: { get(name: string): string | null } },
  work: () => Promise<T>,
): Promise<T> {
  const workspaceId =
    storage().kind === "fs"
      ? "local"
      : (workspaceIdFromCookieHeader(request.headers.get("cookie")) ??
        ANONYMOUS_WORKSPACE_ID);
  return runWithWorkspace(workspaceId, work);
}

/** Same as `inRequestWorkspace`, for callers that only have a cookie value. */
export function inCookieWorkspace<T>(
  cookieValue: string | undefined,
  work: () => Promise<T>,
): Promise<T> {
  const workspaceId =
    storage().kind === "fs"
      ? "local"
      : cookieValue
        ? sanitizeWorkspaceId(cookieValue)
        : ANONYMOUS_WORKSPACE_ID;
  return runWithWorkspace(workspaceId, work);
}
