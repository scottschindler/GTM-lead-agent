---
description: Infer engineering problems the account is likely facing from research evidence.
---

# Hypothesis

Generate 3–5 engineering hypotheses grounded only in the research brief.

For each hypothesis include:

- `statement` — concise claim about what they are trying to accomplish or struggling with
- `confidence` — 0 to 1
- `evidence` — supporting facts from research (with sources when available)
- `engineeringPain` — the likely developer/platform pain
- `businessImpact` — why it matters commercially

Prefer hypotheses like:

- Scaling frontend development
- Building AI-native products
- Standardizing on Next.js
- Improving deployment velocity
- Reducing infrastructure complexity
- Improving performance / DX

Persist with `save_stage_output` stage `hypothesis`:

```json
{
  "hypotheses": [
    {
      "statement": "...",
      "confidence": 0.7,
      "evidence": ["..."],
      "engineeringPain": "...",
      "businessImpact": "..."
    }
  ]
}
```
