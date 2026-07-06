import { defineEval } from "eve/evals";
import { equals } from "eve/evals/expect";

import {
  createLead,
  getLead,
  saveStageOutput,
} from "../agent/lib/store";

function opportunityOutput() {
  return {
    opportunities: [
      {
        engineeringPain: "Parallel save test opportunity pain A",
        vercelCapability: "Preview deployments",
        developerOutcome: "Teams review changes faster",
        businessImpact: "Faster launch cycles",
        estimatedRoi: "High",
        priority: 1,
      },
      {
        engineeringPain: "Parallel save test opportunity pain B",
        vercelCapability: "Managed frontend infrastructure",
        developerOutcome: "Less platform maintenance",
        businessImpact: "More product engineering time",
        estimatedRoi: "Medium",
        priority: 2,
      },
    ],
  };
}

function sequenceOutput() {
  return {
    channels: ["email", "LinkedIn"],
    cadence: "Two touches over one week",
    timing: "Weekday mornings",
    steps: [
      {
        channel: "email",
        delayDays: 0,
        purpose: "Open with the strongest opportunity",
      },
      {
        channel: "LinkedIn",
        delayDays: 4,
        purpose: "Light reminder if there is no reply",
      },
    ],
    followUpLogic: "Pause if the lead replies or opts out.",
    exitConditions: ["Reply received", "Explicit opt-out", "No engagement"],
  };
}

export default defineEval({
  description:
    "parallel stage saves for the same lead do not clobber each other.",
  async test(t) {
    const leadId = `lead_eval_concurrency_${Date.now()}`;
    await createLead({
      id: leadId,
      name: "Concurrency Eval",
      email: `${leadId}@example.com`,
      company: "Concurrency Co",
      companyDomain: "example.com",
      source: "eval",
    });

    await Promise.all([
      saveStageOutput(leadId, "opportunity_mapping", opportunityOutput()),
      saveStageOutput(leadId, "sequence_planning", sequenceOutput()),
    ]);

    const lead = await getLead(leadId);
    await t.require(
      lead?.stages.opportunity_mapping.status,
      equals("done"),
    );
    await t.require(
      lead?.stages.sequence_planning.status,
      equals("done"),
    );
  },
});
