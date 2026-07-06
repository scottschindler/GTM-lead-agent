import { defineHook } from "eve/hooks";

import { buildActivityEntries } from "../../../lib/activity-entries";
import { appendActivity } from "../../../lib/store";
import { inSessionWorkspace } from "../../../lib/workspace";

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
            console.error("[pipeline_writer activity hook]", error);
          }
        }
      });
    },
  },
});
