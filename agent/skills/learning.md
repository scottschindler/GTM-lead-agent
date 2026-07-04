---
description: Review a completed pipeline run and extract insights that improve future runs.
---

# Learning review

Run after engagement/intent. Review the whole run:

- Which hypotheses did engagement signals support or contradict?
- What messaging or angle likely drove the strongest signals?
- Did qualification scores predict the intent we saw?
- What should change for the next similar lead (persona, industry, stack)?

Produce:

- `insights` — each with `category` (messaging | qualification | hypothesis_accuracy | sequence | objections | general), `insight`, `evidence`, `applyTo` (which future leads/personas it applies to)
- `hypothesisAccuracy` — one-paragraph verdict on how the hypotheses held up
- `whatWorked` / `whatToChange` — short lists

Then:

1. `save_stage_output` stage `learning` with that payload.
2. `save_insight` with the same insights so future runs can read them via `get_insights`.

Note honestly when evidence is simulated — insights from simulated engagement are directional, not proven.
