import { NextResponse } from "next/server";

import { listLeads } from "../../../../agent/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const leads = await listLeads();
  return NextResponse.json({ leads });
}
