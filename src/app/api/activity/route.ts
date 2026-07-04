import { NextResponse } from "next/server";

import { readActivity } from "../../../../agent/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since") ?? undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 200;
  const events = await readActivity({ since, limit });
  return NextResponse.json({ events });
}
