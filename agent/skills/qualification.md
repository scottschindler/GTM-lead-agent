---
description: Score a lead against Vercel's ICP and decide qualify vs disqualify.
---

# Qualification

Use after research is saved. Score each dimension from 0–10:

- **ICP fit** — product/engineering-led company, modern web stack, growth stage
- **Buying authority** — person can influence or own platform decisions
- **Product usage or intent** — signals of Next.js/React/frontend platform interest
- **Engineering maturity** — sophisticated eng org, DX priorities, platform thinking
- **Company growth** — hiring, funding, launches, expansion
- **Business impact** — potential value of Vercel for this account
- **Overall priority** — weighted judgment across the above

## Verdict rules

- `disqualified` if overallPriority < 4, or ICP fit < 3, or no credible engineering/product motion
- otherwise `qualified`

Persist with `save_stage_output` stage `qualification`:

```json
{
  "scores": {
    "icpFit": 0,
    "buyingAuthority": 0,
    "productUsageOrIntent": 0,
    "engineeringMaturity": 0,
    "companyGrowth": 0,
    "businessImpact": 0,
    "overallPriority": 0
  },
  "verdict": "qualified",
  "rationale": "..."
}
```

Cite evidence from the research brief in the rationale. Do not invent facts.
