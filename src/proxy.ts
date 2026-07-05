import { NextResponse, type NextRequest } from "next/server";

import { WORKSPACE_COOKIE } from "../agent/lib/workspace-cookie";

// Anonymous per-visitor workspaces: every browser gets a random workspace id
// on first visit. No accounts or login — the cookie is identification, not
// authentication. It rides along automatically on the app's API calls and
// on the eve agent routes (same origin), where the channel auth turns it
// into the session principal.
export function proxy(request: NextRequest) {
  if (request.cookies.get(WORKSPACE_COOKIE)?.value) {
    return NextResponse.next();
  }
  const response = NextResponse.next();
  response.cookies.set(WORKSPACE_COOKIE, crypto.randomUUID(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export const config = {
  // Skip static assets; pages and API routes are enough — the cookie exists
  // before anyone can click "Run pipeline".
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
