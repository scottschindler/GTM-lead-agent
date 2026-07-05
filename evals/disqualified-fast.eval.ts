import { defineEval } from "eve/evals";
import { equals, satisfies } from "eve/evals/expect";

import { getLead } from "../agent/lib/store";
import type { QualificationOutput } from "../agent/lib/types";

export default defineEval({
  description:
    "competitor/low-fit leads are qualified and stopped before pipeline_writer or downstream work.",
  async test(t) {
    const startedAt = Date.now();
    await t.send("DISQUALIFY_EVAL: run a competitor lead through the fast gate.");
    const durationMs = Date.now() - startedAt;

    t.succeeded();
    t.calledTool("get_lead");
    t.calledSubagent("researcher", { count: 1 });
    t.calledTool("qualify_lead", { count: 1 });
    t.calledTool("set_lead_outcome", { count: 1 });
    t.notCalledTool("load_skill");
    t.notCalledTool("create_landing_page");
    t.notCalledTool("send_message");
    t.noFailedActions();
    t.eventsSatisfy("pipeline_writer is skipped for disqualified leads", (events) =>
      events.every((event) => {
        if (event.type !== "actions.requested") return true;
        return event.data.actions.every(
          (action) =>
            !(
              action.kind === "subagent-call" &&
              action.name === "pipeline_writer"
            ),
        );
      }),
    );
    t.check(
      durationMs,
      satisfies(
        (value): value is number => typeof value === "number" && value < 30_000,
        "mock disqualified pipeline finishes under 30 seconds",
      ),
    );

    const lead = await getLead("lead_eval_disqualified");
    await t.require(lead?.stages.research.status, equals("done"));
    await t.require(lead?.stages.qualification.status, equals("done"));
    await t.require(lead?.outcome, equals("disqualified"));
    await t.require(lead?.stages.hypothesis.status, equals("pending"));
    await t.require(lead?.stages.opportunity_mapping.status, equals("pending"));
    await t.require(lead?.stages.content_generation.status, equals("pending"));
    await t.require(lead?.stages.sequence_planning.status, equals("pending"));

    const qualification = lead?.stages.qualification.output as
      | QualificationOutput
      | undefined;
    await t.require(qualification?.verdict, equals("disqualified"));
  },
});
