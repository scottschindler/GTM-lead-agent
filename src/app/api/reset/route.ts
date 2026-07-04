import { NextResponse } from "next/server";

import { resetFactory } from "../../../../agent/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  const leads = await resetFactory();
  return NextResponse.json({ ok: true, leads, lead: leads[0] ?? null });
}
