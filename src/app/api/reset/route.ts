import { NextResponse } from "next/server";

import {
  resetFactory,
  type ResetFactoryMode,
} from "../../../../agent/lib/store";

export const dynamic = "force-dynamic";

function parseMode(value: string | null): ResetFactoryMode {
  return value === "demo" ? "demo" : "clean";
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const mode = parseMode(url.searchParams.get("mode"));
  const leads = await resetFactory({ mode });
  return NextResponse.json({ ok: true, mode, leads, lead: leads[0] ?? null });
}
