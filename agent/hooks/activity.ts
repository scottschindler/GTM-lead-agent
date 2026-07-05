import { defineHook } from "eve/hooks";

import { buildActivityEntries } from "../lib/activity-entries";
import { releasePipelineRun } from "../lib/run-guard";
import { appendActivity } from "../lib/store";
import { inSessionWorkspace } from "../lib/workspace";

const ROOT_RUN_RELEASE_EVENTS = new Set([
  "turn.completed",
  "turn.failed",
  "session.failed",
  "session.completed",
]);

export default defineHook({
  events: {
    async "*"(event, ctx) {
      const data = "data" in event ? event.data : undefined;
      const entries = buildActivityEntries(event.type, data);

      // Resolving the workspace here also records the root-session mapping
      // that subagent sessions rely on (see workspace.ts).
      await inSessionWorkspace(ctx.session, async () => {
        if (!ctx.session.parent && ROOT_RUN_RELEASE_EVENTS.has(event.type)) {
          try {
            await releasePipelineRun(ctx.session.id);
          } catch (error) {
            console.error("[run guard]", error);
          }
        }

        for (const entry of entries) {
          try {
            await appendActivity({
              sessionId: ctx.session.id,
              type: entry.type,
              summary: entry.summary,
              detail: entry.detail,
            });
          } catch (error) {
            console.error("[activity hook]", error);
          }
        }
      });
    },
  },
});
