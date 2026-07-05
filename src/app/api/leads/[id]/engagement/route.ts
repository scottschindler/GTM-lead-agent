import { NextResponse } from "next/server";

import { getLead, runEngagementSimulation } from "../../../../../../agent/lib/store";
import { inRequestWorkspace } from "../../../../../../agent/lib/workspace";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return inRequestWorkspace(request, async () => {
    const { id } = await context.params;

    const lead = await getLead(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    try {
      const updated = await runEngagementSimulation(id);
      return NextResponse.json({ lead: updated });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Engagement simulation failed",
        },
        { status: 400 },
      );
    }
  });
}
