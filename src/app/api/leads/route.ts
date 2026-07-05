import { NextResponse } from "next/server";

import { readPipelineRunSnapshot } from "../../../../agent/lib/run-guard";
import { listLeads } from "../../../../agent/lib/store";
import { inRequestWorkspace } from "../../../../agent/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return inRequestWorkspace(request, async () => {
    const [leads, runState] = await Promise.all([
      listLeads(),
      readPipelineRunSnapshot(),
    ]);
    return NextResponse.json({ leads, runState });
  });
}
