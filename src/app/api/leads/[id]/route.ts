import { NextResponse } from "next/server";

import { getLead } from "../../../../../agent/lib/store";
import { inRequestWorkspace } from "../../../../../agent/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return inRequestWorkspace(request, async () => {
    const { id } = await context.params;
    const lead = await getLead(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json({ lead });
  });
}
