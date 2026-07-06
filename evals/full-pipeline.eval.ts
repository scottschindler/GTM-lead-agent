import { defineEval } from "eve/evals";
import { equals, satisfies } from "eve/evals/expect";

import { getLead, readActivity } from "../agent/lib/store";
import type {
  ContentGenerationOutput,
  HypothesisOutput,
  OpportunityMappingOutput,
} from "../agent/lib/types";

export default defineEval({
  description:
    "fast full-pipeline path uses researcher and pipeline_writer, saves 2/2 strategy outputs, queues a draft, and does not run learning.",
  async test(t) {
    const startedAt = Date.now();
    const activitySince = new Date(startedAt - 1000).toISOString();
    await t.send("FULL_PIPELINE_EVAL: run the optimized full pipeline.");
    const durationMs = Date.now() - startedAt;

    t.succeeded();
    t.calledTool("get_lead");
    t.calledSubagent("researcher", { count: 1 });
    t.calledSubagent("pipeline_writer", { count: 1 });
    t.calledTool("set_lead_outcome");
    t.notCalledTool("load_skill");
    t.notCalledTool("save_stage_output");
    t.notCalledTool("create_landing_page");
    t.notCalledTool("send_message");
    t.noFailedActions();
    t.eventsSatisfy("pipeline_writer call does not pass outputSchema", (events) => {
      const writerCalls = events.flatMap((event) => {
        if (event.type !== "actions.requested") return [];
        return event.data.actions.filter(
          (action) =>
            action.kind === "subagent-call" &&
            action.name === "pipeline_writer",
        );
      });
      return (
        writerCalls.length > 0 &&
        writerCalls.every((action) => {
          const input = action.input as Record<string, unknown>;
          return !("outputSchema" in input);
        })
      );
    });
    t.check(
      durationMs,
      satisfies(
        (value): value is number => typeof value === "number" && value < 60_000,
        "mock full-pipeline eval finishes under 60 seconds",
      ),
    );

    const activity = await readActivity({ since: activitySince, limit: 200 });
    const persistStageProgress = activity.flatMap((event) => {
      if (event.type !== "pipeline.stage.progress") return [];
      const detail =
        event.detail && typeof event.detail === "object"
          ? (event.detail as Record<string, unknown>)
          : {};
      return detail.source === "persist_pipeline_payload" &&
        typeof detail.stage === "string"
        ? [detail.stage]
        : [];
    });
    await t.require(
      persistStageProgress.join(","),
      equals(
        "qualification,hypothesis,opportunity_mapping,content_generation,sequence_planning",
      ),
    );

    const lead = await getLead("lead_eval_full");
    await t.require(lead?.stages.research.status, equals("done"));
    await t.require(lead?.stages.qualification.status, equals("done"));
    await t.require(lead?.stages.hypothesis.status, equals("done"));
    await t.require(lead?.stages.opportunity_mapping.status, equals("done"));
    await t.require(lead?.stages.sequence_planning.status, equals("done"));
    await t.require(lead?.stages.content_generation.status, equals("done"));

    const hypotheses = lead?.stages.hypothesis.output as
      | HypothesisOutput
      | undefined;
    await t.require(hypotheses?.hypotheses.length, equals(2));

    const opportunities = lead?.stages.opportunity_mapping.output as
      | OpportunityMappingOutput
      | undefined;
    await t.require(opportunities?.opportunities.length, equals(2));

    const content = lead?.stages.content_generation.output as
      | ContentGenerationOutput
      | undefined;
    await t.require(Boolean(content?.landingPageUrl), equals(true));
    await t.require(
      Boolean(
        content?.landingPageUrl &&
          content.emailBody.includes(content.landingPageUrl),
      ),
      equals(true),
    );
    await t.require(content?.send?.status, equals("drafted"));
    await t.require(lead?.outcome, equals("nurture"));
    await t.require(lead?.stages.learning.status, equals("pending"));
  },
});
