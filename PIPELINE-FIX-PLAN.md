# Pipeline overhaul (phased): faster, fewer errors, fewer tokens, no log flicker

## Context

The live GTM pipeline run (lead_09) took ~2m24s, burned ~269k input tokens, hit a `SUBAGENT_EXECUTION_FAILED` error, silently regressed a saved stage back to `pending`, and the dashboard shows a blank/flickering stage card when each stage starts. Exploration confirmed four root causes (all present at HEAD `b156cf3`; the working tree is clean):

1. **Subagent schema failure** — `agent/subagents/pipeline_writer/agent.ts:30` declares an all-required `outputSchema` (`pipelineWriterOutputSchema`, `agent/lib/pipeline-writer.ts:75-116`). The orchestrator improvised a second *partial* call, which is structurally unsatisfiable → hard fail (eve task-mode validation has no retry). Brittle constraints (exact-2 `z.tuple`s, 120-word `.refine`, `.url()`) make even full calls fragile. The run then degraded to the slow `load_skill` fallback (~17KB of skill markdown, ~30s extra).
2. **Stage status regression** — `saveStageOutput`/`markStageSkipped`/`setLeadOutcome`/`reviewSend` in `agent/lib/store.ts:302-424` are lock-free read-modify-writes of the whole lead record (`saveLead` = whole-object overwrite). Close-together saves clobber each other (lost update), reverting done stages to `pending`.
3. **UI flicker** — `StageCard` (`src/components/factory-dashboard.tsx:245`) renders nothing when `running && log.length === 0`; `shouldShowLivePipelineEvent` (`agent/lib/activity-copy.ts:226-237`) hides all events until the first real tool call; the stage-boundary event cutoff plus 1.5s polling reopens the blank window at every stage start.
4. **Tokens/latency** — the dominant cost is Sonnet re-emitting pipeline_writer's ~4KB payload as args across 5-6 tool calls (each 6-11s), plus the ~20-turn history resend and the fallback skill loads.

**User decisions after review:** phase the work — land the uncontroversial bug fixes first as standalone commits, then the pipeline_writer restructure as separate gated commits; keep `agent/skills/` on disk for now (delete only in a later cleanup once live runs prove the new path); no runtime feature flag — git revert per phase is the rollback.

Framework facts: eve@0.19.0; the `researcher` subagent already proves the target pattern (own persist tool + compact receipt `outputSchema`, `agent/subagents/researcher/agent.ts`). `run-guard.ts:45-58` (`withRunStateLock`) is the in-process lock pattern to mirror. The `disableTool()` stubs (`agent/tools/bash.ts`, the 9 stubs in `pipeline_writer/tools/`) are functional overrides of eve built-ins — keep them all.

---

## Phase 1 — Bug fixes (standalone commits, land first)

### 1.1 Per-lead write lock — `agent/lib/store.ts`
- `withLeadLock(leadId, work)`: per-lead promise-queue mirroring `withRunStateLock` (`run-guard.ts:45-58`), map entry deleted when the chain drains. In-process only — same accepted limitation as run-guard; document in a comment.
- Internal `updateLead(leadId, mutate)` = lock → `getLead` → mutate → `saveLead`. Rewrite `saveStageOutput` (:302), `markStageSkipped` (:324), `setLeadOutcome` (:342), `reviewSend` (:365) on top of it.
- New `queueSendDraft(leadId, {subject, body, cta, timezone?})`: move the draft-queueing merge currently inlined in `agent/tools/send_message.ts:35-75` (send window, `drafted` status, landing-URL injection) into the store, inside the lock — it is itself a racy RMW site today. `send_message.ts` becomes a thin wrapper (run-guard check + `queueSendDraft`).

### 1.2 Concurrency eval — new `evals/store-concurrency.eval.ts`
Lost-update repro: create a fixture lead, `Promise.all([saveStageOutput(id,"opportunity_mapping",…), saveStageOutput(id,"sequence_planning",…)])`, require both stage statuses `done`. Fails at HEAD, passes with the lock. Check `node_modules/eve/docs/evals/` for the minimal eval shape.

### 1.3 UI flicker — `src/components/factory-dashboard.tsx`
StageCard: render the progress body whenever `running`; when `log.length === 0` show a muted placeholder line — `Starting {STAGE_LABELS[stage].toLowerCase()}…` using existing `text-[var(--geist-muted)]` classes (Geist tokens only, no new colors).

### Phase 1 verification
`npx tsc --noEmit`, `npm run lint`, `npm run eval` (all existing evals + new concurrency eval green), quick `npm run dev` drive to confirm stage cards never render blank while running and Inbox approve/deny still works (`reviewSend` refactor).

---

## Phase 2 — pipeline_writer restructure (separate commits; gated on green evals + a verified live run)

Goal: the subagent persists everything itself via one tool and returns a tiny receipt, so the parent stops re-emitting the ~4KB payload 5-6 times (~20 turns → ~6), and schema validation becomes a retryable tool result instead of a task-mode hard fail.

### 2.1 Shared stage schemas + normalizers — new `agent/lib/stage-schemas.ts`
Consolidate the per-stage zod schemas duplicated between `agent/lib/pipeline-writer.ts` and `agent/tools/save_stage_output.ts`, with relaxations: `z.tuple([x, x])` → `z.array(x).min(2).max(4)` + code coercion to first 2 (`coerceTwo`) with `priority` assigned by index; drop the 120-word `.refine` (guidance only, never reject); `.url()` → trimmed `z.string()`. Move here the existing normalizers from `save_stage_output.ts` (`normalizeContentOutput`, `normalizeSequenceOutput`, `normalizeMessagingStrategy`, objection-response coercion) and the `emailBodyWithLandingPage` helper (currently copied in `save_stage_output.ts` and `send_message.ts`). `pipelineWriterOutputSchema` recomposes from these; it is no longer the subagent's `outputSchema`.

### 2.2 Landing-page lib — new `agent/lib/landing-page.ts`
Extract `baseUrl()`, `slugify()`, and `createLandingPageForLead(lead, input)` from `agent/tools/create_landing_page.ts` (config check, page build, `saveLandingPage`). Keep `create_landing_page.ts` as a thin wrapper for manual repair (deletion deferred to Phase 3).

### 2.3 New subagent tool — `agent/subagents/pipeline_writer/tools/persist_pipeline_payload.ts`
Modeled on `researcher/tools/save_research_brief.ts` (run-guard via `assertRunIsCurrent(rootSessionIdOf(...))`, `resolveLeadReference`, accepts stringified JSON):
- Input: `{ leadId: z.string().min(1), payload: z.unknown() }` — tiny advertised schema; validate in code against the relaxed schema and return **short, path-prefixed `ok:false` errors** (never raw zod dumps) so Haiku can self-repair in-session.
- Persist in order: qualification → hypothesis → opportunity_mapping → sequence_planning (disabled stage → `markStageSkipped`; each save atomic under the Phase 1 lead lock).
- Disqualified verdict: save qualification only, return `{ok:true, verdict:"disqualified", savedStages:["qualification"]}` — parent sets outcome and stops.
- Content (if enabled): `createLandingPageForLead` when `landingPages` on; inject URL via `emailBodyWithLandingPage` (strip the placeholder sentence when off); save `content_generation`; then `queueSendDraft` with `subjectLines[0]`.
- Return compact receipt: `{ok, leadId, verdict, savedStages, skippedStages, landingPageUrl?, draftQueued, recommendedNextAction}`.

### 2.4 pipeline_writer agent + instructions
- `agent.ts`: replace `outputSchema` with a small receipt schema (all-optional except `saved`/`leadId`, like researcher's). Eval mock → researcher-style two-step: first respond with a `persist_pipeline_payload` call (`{leadId: "lead_eval_full", payload: PIPELINE_WRITER_MOCK_OUTPUT}`), then `final_output` receipt. Keep model (`claude-haiku-4.5`), `reasoning: "none"`, limits.
- `instructions.md`: rewrite — compose the payload, call `persist_pipeline_payload` exactly once with the canonical lead id, fix and retry once on `ok:false`, return the receipt. Fold in a ~10-line qualification rubric (from `agent/skills/qualification.md`) and the 4 proof points **with their real story URLs** (from `agent/skills/opportunity-mapping/references/customer-stories.md` — fixes Haiku guessing `stories[].url`).
- Add `hooks/activity.ts` (copy of `researcher/hooks/activity.ts`) so the persist step shows in the live log — without it the whole strategy phase would be invisible in the UI.
- Keep all nine `disableTool()` stubs.

### 2.5 Root agent slim-down
- `agent/instructions.md`: rewrite to intake → research → pipeline_writer (persists everything, returns receipt; message only, never pass `outputSchema`, **never call it for a subset of stages**) → wrap-up (`set_lead_outcome` from receipt). Failure rule: retry pipeline_writer once with the complete repair message; if that fails, save remaining stages as `failed` with a note and stop with a clear operator message — **remove the skill-fallback section and never call `load_skill`** (the skill files stay on disk but leave the live path). Delete the persistence choreography, the proof points (moved to subagent), and the now code-enforced exactly-2 rules.
- `agent/agent.ts` FULL_PIPELINE mock branch: reduce to create_lead/get_lead → researcher → pipeline_writer → set_lead_outcome → done (delete `fullEvalContentOutput` and the save/landing-page/send steps). Smoke/safety branches unchanged.
- `agent/tools/save_stage_output.ts`: keep the tool (smoke eval + manual repair) but import everything from `stage-schemas.ts`; drop local duplicates and hard 120-word rejections.
- `agent/lib/activity-copy.ts`: add `persist_pipeline_payload` progress/done copy ("Saving the strategy, page, and draft" / "Strategy, page, and draft saved"). Keep the `load_skill` branches (skills still exist).

### 2.6 Eval updates
`evals/full-pipeline.eval.ts`: keep `calledSubagent("pipeline_writer", {count: 1})`, the no-outputSchema events check, `notCalledTool("load_skill")`, duration gate, and all persisted-lead-state `require`s (still valid — the persist tool creates the real page, injects the URL, queues the draft). Replace `calledTool("create_landing_page")`/`calledTool("send_message")` with `notCalledTool("save_stage_output")`, `notCalledTool("create_landing_page")` (proves the parent never re-emits payloads).

### Phase 2 gate (before relying on it / before Phase 3)
1. `npx tsc --noEmit`, `npm run lint`.
2. `npm run eve:build` && `npm run eve:info` — agent, subagents, and the new tool register.
3. `npm run eval` — smoke, safety, full-pipeline, store-concurrency all green.
4. Live run: `npm run dev`, drive a lead end-to-end from the dashboard. Confirm: exactly one pipeline_writer call; live log shows the persist step; no stage flips done→pending; stage cards show "Starting …" immediately; email body contains the `/for/<slug>` URL; draft appears in the Inbox as `drafted`; a mid-run Reset still kills the run (persist tool calls `assertRunIsCurrent`).

Rollback: revert the Phase 2 commits — Phase 1 fixes stand on their own.

---

## Phase 3 — Deferred cleanup (NOT in this change; only after several clean live runs)
- Delete `agent/skills/` (all five skills + references) and drop the `load_skill` branches in `activity-copy.ts`.
- Optionally delete the `create_landing_page` thin-wrapper tool.

---

## Risks
- Mock/eval coupling: the scripted mocks in `agent/agent.ts` and `pipeline_writer/agent.ts` must match the new flow exactly or evals loop to the 60s timeout — land 2.4, 2.5, 2.6 together.
- `reviewSend` refactor must preserve approve/deny/edit semantics (Inbox API routes depend on it) — covered by the Phase 1 manual Inbox check.
- Do not delete `send_message` (safety eval) or any `disableTool()` stub.
- Lock is per-process: fine for local fs storage and the single-active-run rule; Redis multi-instance stays best-effort (same caveat as run-guard).

Expected impact: Phase 1 alone eliminates the pending-regression bug and the blank stage cards. Phase 2 drops the run from ~20 orchestrator turns to ~6, cuts input tokens several-fold, and eliminates the `SUBAGENT_EXECUTION_FAILED` failure mode.
