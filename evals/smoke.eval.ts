import { defineEval } from "eve/evals";
import { equals } from "eve/evals/expect";

import { getLead } from "../agent/lib/store";

export default defineEval({
  description:
    "create_lead then save_stage_output persists qualification on the lead file.",
  async test(t) {
    await t.send("SMOKE_EVAL: create a lead and save qualification.");
    t.succeeded();
    t.calledTool("create_lead");
    t.calledTool("save_stage_output");

    const lead = await getLead("lead_eval_smoke");
    await t.require(lead?.stages.qualification.status, equals("done"));
    await t.require(
      (lead?.stages.qualification.output as { verdict?: string } | undefined)
        ?.verdict,
      equals("qualified"),
    );
  },
});
