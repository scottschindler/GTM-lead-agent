# Todo: pipeline runtime → ~90s

## Phase 1 — verbosity trims (instruction-level only)
- [x] Task 1 (XS): Cap foreman → pipeline_writer handoff at ~120 words, pass
      receipt summary verbatim (`agent/instructions.md`)
- [x] Task 2 (XS): Cap recommendedNextAction at ~30 words
      (`agent/subagents/pipeline_writer/instructions.md`)
- [x] Task 3 (XS): Foreman ends with one sentence, no closing markdown
      summary (`agent/instructions.md`)

## Checkpoint
- [x] tsc / eslint / evals clean (4/4, 38 gates)
- [x] Live local run timed end-to-end: 90.1s (research 31s, writer 54s,
      wrap-up 5s; next action 23 words, email 75 words, all stages done)
- [ ] Deploy + one production run; compare vs 102.3s / 1,566 output tokens
- [x] Human review — target reached locally; Phase 2 not started per plan

## Phase 2 — optional, gated on checkpoint
- [ ] Task 4 (XS, medium risk): foreman `reasoning: "none"` experiment;
      two clean live runs required to keep; instant revert otherwise
