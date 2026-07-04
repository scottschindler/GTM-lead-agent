---
description: Map engineering pains to Vercel capabilities, outcomes, business impact, and ROI.
---

# Opportunity mapping

Read `references/vercel-capabilities.md` and `references/customer-stories.md` in this skill package for grounding.

For each prioritized engineering pain (from hypotheses, or research if hypotheses were skipped), produce a chain:

Engineering pain → Vercel capability → Developer outcome → Business impact → Estimated ROI

Prioritize highest-value opportunities first (`priority` 1 = highest).

Persist with `save_stage_output` stage `opportunity_mapping`:

```json
{
  "opportunities": [
    {
      "engineeringPain": "...",
      "vercelCapability": "...",
      "developerOutcome": "...",
      "businessImpact": "...",
      "estimatedRoi": "...",
      "priority": 1
    }
  ]
}
```

Only map to capabilities that are real in the references. Prefer concrete, account-specific language over generic platform marketing. When citing customer stories, pick the 2–3 whose situation best matches this account (industry, scale, stack) and use their real proof points and source URLs — never invent metrics or quotes.
