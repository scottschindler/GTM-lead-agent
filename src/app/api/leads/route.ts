import { NextResponse } from "next/server";

import { listLeads } from "../../../../agent/lib/store";
import { inRequestWorkspace } from "../../../../agent/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return inRequestWorkspace(request, async () => {
    const leads = await listLeads();
    return NextResponse.json({ leads });
  });
}
