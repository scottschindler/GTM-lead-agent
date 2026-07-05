import { defineHook } from "eve/hooks";

import { buildActivityEntries } from "../../../lib/activity-entries";
import { appendActivity } from "../../../lib/store";
import { inSessionWorkspace } from "../../../lib/workspace";

// Parent-agent hooks never fire for subagent turns, so without this hook the
// researcher's web searches and brief-saving are invisible in the dashboard's
// live progress log.
//
// Only tool call/result activity is logged. Lifecycle events from this child
// session (turn.completed, session.waiting, …) must stay out of the shared
// feed: the dashboard reads the newest of those as "the pipeline run ended".
const LOGGED_EVENT_TYPES = new Set([
  "actions.requested",
  "action.result",
]);

export default defineHook({
  events: {
    async "*"(event, ctx) {
      if (!LOGGED_EVENT_TYPES.has(event.type)) return;

      const data = "data" in event ? event.data : undefined;
      await inSessionWorkspace(ctx.session, async () => {
        for (const entry of buildActivityEntries(event.type, data)) {
          try {
            await appendActivity({
              sessionId: ctx.session.id,
              type: entry.type,
              summary: entry.summary,
              detail: entry.detail,
            });
          } catch (error) {
            console.error("[researcher activity hook]", error);
          }
        }
      });
    },
  },
});
