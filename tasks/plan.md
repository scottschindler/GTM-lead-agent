# Implementation Plan: Pipeline runtime 102s → ~90s (no rewrites)

## Overview

The lead_24 (Langfuse) production run took 102.3s, not 2 minutes (the log
header rounds up). Quality was good: rich research brief, correct qualified
verdict, landing page + draft queued, honest sequential stage reveal. The
runtime budget breaks down as:

| Segment | Time | Notes |
| --- | --- | --- |
| get_lead / set_lead_outcome | ~0.05s | negligible |
| researcher subagent | 27s | one search + brief + receipt; healthy |
| pipeline_writer subagent | 51s | 5 sequential stage persists (the product behavior we chose) |
| **parent (foreman) inference passes** | **~24.3s** | ~5 Sonnet passes; the fat to trim |

The subagents are doing paid work. The parent's 24s is mostly *re-generating
text nobody needs*: it re-types the full research brief into the writer
message (~420 words), re-emits a ~90-word recommendedNextAction into
set_lead_outcome, and writes a ~130-word closing markdown summary that no UI
surface displays. All three are instruction-level fixes. Target: cut ~12-15s
of parent output plus a few seconds of writer output → p50 ≈ 88-92s.

Honest caveat: search time varies run to run (±10s), so ~90s is a median
target, not a guarantee per run.

## Architecture Decisions

- **Keep sequential stage persists untouched** — the 51s writer cost buys the
  per-stage output reveal we deliberately chose; not negotiable here.
- **Instruction/config edits only** — no tool, schema, or flow changes.
- **Phase 2 (model/reasoning experiment) is optional and gated** on Phase 1
  results; skip it entirely if Phase 1 lands ≈90s.

## Task List

### Phase 1: Trim parent and writer verbosity

#### Task 1: Cap the foreman → pipeline_writer handoff message

**Description:** The foreman currently re-formats the whole research brief
plus boilerplate the writer's own instructions already cover (~420 words ≈
7-9s of Sonnet generation). Instruct it to pass a compact handoff: lead line,
receipt summary verbatim, tech/title lines, enabled/disabled stages, landing
flag — under ~120 words, no restating writer protocol.

**Acceptance criteria:**
- [ ] `agent/instructions.md` stage 3 tells the foreman to keep the writer
      message under ~120 words and to pass the receipt summary verbatim
      without restating the writer's own rules.
- [ ] Writer still receives: canonical lead id, contact name/title, company +
      domain, source, receipt summary + tech signals, enabled/disabled
      stages, landing-page flag (the full required context, nothing else).

**Verification:**
- [ ] `npm run eval` — all 4 evals pass (mock parent unaffected, sanity).
- [ ] One live local run: writer receipt still `saved:true` with all 5 stages.

**Dependencies:** None
**Files likely touched:** `agent/instructions.md`
**Estimated scope:** XS

#### Task 2: Cap recommendedNextAction length in the writer

**Description:** lead_24's recommendedNextAction was ~90 words and gets
generated once by the writer, re-emitted by the foreman into
set_lead_outcome, and rendered in two UI spots. Cap it at ~30 words in
`pipeline_writer/instructions.md` (one action + one condition).

**Acceptance criteria:**
- [ ] Writer instructions require recommendedNextAction ≤ ~30 words.
- [ ] Live run produces a next action that still names the concrete step.

**Verification:**
- [ ] `npm run eval` passes.
- [ ] Live local run: lead card "Next:" line is one short sentence or two.

**Dependencies:** None
**Files likely touched:** `agent/subagents/pipeline_writer/instructions.md`
**Estimated scope:** XS

#### Task 3: Replace the foreman's closing summary with one sentence

**Description:** The final ~130-word markdown summary (~5s) is displayed
nowhere — the dashboard reads the store, not the chat transcript (the only
message consumer is the approval-request scanner). Instruct the foreman to
end with a single short sentence after set_lead_outcome.

**Acceptance criteria:**
- [ ] `agent/instructions.md` wrap-up says: after set_lead_outcome, reply
      with one sentence (outcome + lead id), nothing else.

**Verification:**
- [ ] `npm run eval` passes.
- [ ] Live local run completes and the dashboard behaves identically
      (run-complete detection is event/store-based, not text-based).

**Dependencies:** None
**Files likely touched:** `agent/instructions.md`
**Estimated scope:** XS

### Checkpoint: Phase 1 (expected ≈ 88-92s median)

- [ ] `npx tsc --noEmit`, `npx eslint agent`, `npm run eval` all clean.
- [ ] One full live local run; record wall-clock from Run click to settled.
- [ ] Push + deploy; one production run on a fresh lead; compare turn
      duration and output tokens against lead_24 (102.3s / 1,566 output).
- [ ] Human review: is ~90s reached? If yes, STOP — do not start Phase 2.

### Phase 2 (optional, only if Phase 1 falls short): parent inference cost

#### Task 4: Experiment — drop foreman reasoning from "low" to "none"

**Description:** The foreman burns thinking tokens on ~5 passes of purely
prescribed orchestration. Setting `reasoning: "none"` in `agent/agent.ts` is
a one-line change worth ~3-8s, but orchestration quality risk must be checked
on a real run (subagent prompts are composed, not templated).

**Acceptance criteria:**
- [ ] One-line change; evals pass; two consecutive live runs complete with
      correct researcher/writer handoffs and outcomes.

**Verification:**
- [ ] Two live local runs + one production run, no failed actions in logs.
- [ ] Revert immediately if any handoff degrades (wrong lead id, missing
      receipt fields).

**Dependencies:** Checkpoint Phase 1 reviewed and found short of target
**Files likely touched:** `agent/agent.ts`
**Estimated scope:** XS (config) / medium behavioral risk

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Writer handoff trimmed too hard → thinner strategy quality | Med | Receipt summary passed verbatim is the same content the writer used before; verify one live run's stage outputs side-by-side |
| Short recommendedNextAction loses detail BDRs want | Low | The full sequence plan is persisted in the Sequence Planning stage; the next action is a pointer, not the plan |
| Search-time variance masks the improvement | Low | Compare output-token counts (deterministic) alongside wall clock |
| Phase 2 reasoning change degrades orchestration | Med | Gated, single-line, revert-fast; two-run verification before keeping |

## Open Questions

- Is ~90s median acceptable, or is the target a hard per-run ceiling? (A hard
  ceiling is not achievable without cutting search or stage content.)
