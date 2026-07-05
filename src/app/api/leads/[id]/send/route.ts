import { NextResponse } from "next/server";

import { getLead, reviewSend } from "../../../../../../agent/lib/store";
import type { SendReviewAction } from "../../../../../../agent/lib/store";
import { inRequestWorkspace } from "../../../../../../agent/lib/workspace";

export const dynamic = "force-dynamic";

const ACTIONS = new Set<SendReviewAction>(["approve", "deny", "edit"]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return inRequestWorkspace(request, async () => {
    const { id } = await context.params;

    let payload: {
      action?: string;
      subject?: string;
      body?: string;
    };
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const action = payload.action as SendReviewAction | undefined;
    if (!action || !ACTIONS.has(action)) {
      return NextResponse.json(
        { error: "action must be one of: approve, deny, edit" },
        { status: 400 },
      );
    }

    const lead = await getLead(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    try {
      const updated = await reviewSend(id, action, {
        subject: payload.subject,
        body: payload.body,
      });
      return NextResponse.json({ lead: updated });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Review failed" },
        { status: 400 },
      );
    }
  });
}
