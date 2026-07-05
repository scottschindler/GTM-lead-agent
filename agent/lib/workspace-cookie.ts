// Shared by the Next proxy (which should stay free of heavy imports) and
// the workspace/storage modules.

export const WORKSPACE_COOKIE = "gtm_workspace";

// Fallback for requests that carry no workspace cookie.
export const ANONYMOUS_WORKSPACE_ID = "anon";

// Workspace ids come from cookies; never let one smuggle path or key syntax.
export function sanitizeWorkspaceId(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return cleaned || ANONYMOUS_WORKSPACE_ID;
}
