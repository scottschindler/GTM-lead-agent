import { eveChannel } from "eve/channels/eve";
import { localDev, none, vercelOidc, type AuthFn } from "eve/channels/auth";

import {
  WORKSPACE_PRINCIPAL_PREFIX,
  workspaceIdFromCookieHeader,
} from "../lib/workspace";

// Anonymous per-visitor workspaces: the middleware cookie identifies each
// browser, and this authenticator turns it into the session principal
// (`ws_<id>`) so tools and hooks can namespace storage per visitor. It is
// identification, not authentication — anyone can mint a cookie — which is
// fine for a demo on seeded data.
function workspaceCookie(): AuthFn<Request> {
  return (request) => {
    const workspaceId = workspaceIdFromCookieHeader(
      request.headers.get("cookie"),
    );
    if (!workspaceId) return null; // fall through to the next entry
    return {
      attributes: {},
      authenticator: "workspace-cookie",
      principalId: `${WORKSPACE_PRINCIPAL_PREFIX}${workspaceId}`,
      principalType: "user",
    };
  };
}

// Route auth for POST /eve/v1/session (+ continue/stream). eve fails closed,
// so the final `none()` deliberately admits visitors whose cookie hasn't
// been set yet (they land in a shared anonymous workspace). Swap in a real
// authenticator before putting anything sensitive behind this agent.
// vercelOidc() stays first so eve's internal runtime/subagent callers keep
// authenticating with project OIDC tokens.
export default eveChannel({
  auth: [vercelOidc(), localDev(), workspaceCookie(), none()],
});
