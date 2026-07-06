---
description: Unified dev orchestrator for Storyweave — classifies the request (investigate / bug / screen / feature) and runs the right-sized multi-agent pipeline
argument-hint: <a question, a bug, a screen, or a feature>  (force a tier with --investigate | --fix | --screen | --feature)
---

# /dev — Unified Dev Orchestrator (Storyweave / ai-realm-rpg)

One command for all development work. You (the orchestrator) **classify** the incoming
request into the right tier, then run the **right-sized** multi-agent pipeline — so a small
issue is never dragged through a heavy feature pipeline and resolved slower than it should be.

**Language:** talk to the user in **Thai** (they are a Thai speaker), keep code/identifiers/technical
terms in English. Write **all persisted memory in English** (portable, greppable). The product's own
player-facing UI is Thai and its AI prompts are English — that is the app's own concern, unrelated to
how we communicate here.

**Request:** $ARGUMENTS

> If `$ARGUMENTS` is empty, ask what to do — a question to investigate, a bug (with repro), a
> screen to build, or a feature — before starting.

## Tiers

| Tier | When it applies | Pipeline |
|------|-----------------|----------|
| 🔵 **T0 Investigate** | A question / "why does X happen?" / diagnosis with **no change wanted** | Context → Investigate (read-only) → Answer. **No code changes.** |
| 🔴 **T1 Fix** | A bug / defect — existing behavior is wrong | Diagnose → Fix → Verify → (Review if non-trivial) |
| 🟡 **T2 Screen** | One new/changed page or component; little or no new API work | (Brief spec) → Implement → Gate → Verify → Review |
| 🟢 **T3 Feature** | A new system / multi-screen / API route + UI + store work | Requirements → Architecture → Implement → Gate → QA → Review → Verify |

T1–T3 end with **Summarize** + **Update project memory**. T0 ends with an answer (memory
optional — only if it uncovered a durable lesson).

**Trivial fast-path (T1-lite):** if the fix is obvious AND tiny (≈ ≤ a few lines, root cause
already clear), do NOT spin up the diagnose/coder agents. Apply it inline yourself, run the
quality gate, and still run `ui-verifier` (or a manual check). State that you took the fast-path.
This is the main defense against "a small problem took too long".

## Global rules

- Invoke each agent via the **Agent tool**, one at a time, in order.
- Each step's prompt lives in `.claude/dev/steps/` — read it, fill the placeholders, and use its
  body as the agent's prompt.
- **Artifact chaining (read `.claude/dev/RESULT-contract.md` once at the start of any T1–T3 run).**
  Each phase writes its full detail to a `.md` in `RUN_DIR` and returns only a **RESULT block**
  (summary + artifact path). Hold just that block in your context and forward the **path** — not
  the pasted report — to the next phase. Pass every phase its `{{ARTIFACT_PATH}}` (where to write)
  and `{{PRIOR_ARTIFACTS}}` (paths to read). **Exception:** the two read-only agents
  (`bug-root-cause-analyst`, `supabase-inspector`) can't write — they return their report inline
  and YOU persist it to `RUN_DIR/01-diagnosis.md` / `02-inspect-db.md`, then forward that path.
- **Learning loop:** prepend a short **"Relevant past lessons"** block to every agent prompt,
  drawn from `.claude/memory/gotchas.md` + any matching `.claude/memory/flow-runs/` entries.
  Write "none" if nothing applies.
- **Danger-zone rule (this project's "central code"):** three areas have wide blast radius — treat
  a change to any of them as non-trivial and confirm with the user before editing:
  1. **The `/api/chat` prompt architecture** (`src/app/api/chat/route.ts`) — the two-brain
     `buildNarrativePrompt` / `buildExtractionPrompt` and the dice call. Prose rules vs. state/schema
     rules live in different prompts (see `CLAUDE.md`). A wrong edit silently degrades every turn.
  2. **The extraction JSON schema ↔ store/types contract** — `buildExtractionPrompt`'s emitted
     `game_state` must stay in sync with the types in `src/store/useGameStore.ts` and
     `applyGameResult` in `src/components/game/PlayScreen.tsx`. Change one → change all three.
  3. **The Zustand persisted store shape** (`storyweave-save`) — renaming/removing fields breaks
     existing localStorage saves and the JSON export/import.
- **Data questions → `supabase-inspector`:** when a diagnosis or design depends on the real data
  shape in Supabase (what columns a table has, what a marketplace/feedback/memories row actually
  contains), invoke **supabase-inspector** (read-only) instead of guessing. Skip it for the pure
  game-loop work, which is stateless client + Groq.
- Never commit or push unless the user explicitly asks. Work on the current branch — but for a
  **T3** feature, if you are on the default branch (`main`), create a feature branch first.

## Quality gate (after every implementation step, before Verify)

Run in the repo and fix anything your change introduced:
1. **Typecheck (primary signal)** — `npx tsc --noEmit`. Cheapest, earliest, catches type errors
   lint never will.
2. **Lint** — `npm run lint` (ESLint flat config, extends `eslint-config-next`).
3. **Build (for non-trivial or routing/config changes)** — `npm run build`.

Report pre-existing warnings separately from ones your change caused.

## Robustness & stopping conditions

- **Verify→Fix loop cap:** retry at most **2–3 times**. If still failing, STOP and report
  observed-vs-expected + your best hypothesis — do not loop indefinitely.
- **Agent asks a question:** if any sub-agent returns a clarifying question, PAUSE and relay it to
  the user; do not invent an answer.
- **Danger-zone root cause / gate can't pass:** STOP and report; let the user decide.
- **"Non-trivial"** = more than a few lines, touches logic/data flow/prompts/schema, or you are not
  100% certain of the blast radius. When in doubt, treat it as non-trivial.

## Progress reporting (required)

Use `.claude/conventions/progress-and-approval.md` — read it once at the start and follow it exactly:
- After **every** step, render the **Progress Table** (`# | Stage | Details | Status | Remark`)
  with a `Step n/N` title.
- Whenever a step needs a "yes" (applying a fix, touching a danger zone, escalating a tier), show
  the **Approval Block** — plain language, never a raw command as the ask.

---

## STEP 0 — Context / Memory (all tiers, do not skip)

Read only what this run needs — the sub-agents cold-read what they need themselves. Scale the read
to the tier.

**Minimum set (every tier, always):**
1. `.claude/memory/gotchas.md` (seeds the learning loop).
2. `git status` + current branch.
3. `.claude/memory/flow-runs/INDEX.md` (one-line hooks) — open a full run log ONLY if this task
   clearly resembles it.

**Add for T2 / T3 only:**
4. `.claude/memory/project-map.md` — the cheap ground-truth orientation (routes, store, API, the
   game loop). Read THIS to pick the files; it is far cheaper than re-reading `CLAUDE.md` in full.
5. The one section of `CLAUDE.md` / `.claude/memory/long-term.md` relevant to this surface.

If a user-level memory index exists (`~/.claude/projects/-Users-nampu-ai-realm-rpg/memory/MEMORY.md`),
read it too; skip silently if absent.

Give the user a short Thai summary of context + any relevant past lesson, then continue.

## STEP 0.4 — Intake & Normalize (all tiers, before classifying)

Turn whatever the user gave you into ONE canonical brief. Read the input fully, including any Thai
text or screenshot.

Produce this brief:
- **Goal** — one sentence: the outcome the user wants.
- **Input type** — `issue | spec | requirement | test-case | reject | question | mixed`.
- **Source of truth** — if the user provided a spec / requirement / test case, THAT artifact is the
  source of truth: extract from it, do not regenerate.
- **Acceptance criteria** — the concrete pass/fail checks as a numbered list. This list is the spine
  of the run: `ui-verifier`/`qa` verify against it and the report signs off against it.
- **Evidence** — screenshots, repro steps, error text, affected route/screen.
- **Prior context** — is this a re-work of an earlier run?

Fix the **run slug now** and reuse it everywhere: `RUN_SLUG = {today YYYY-MM-DD}-{short-kebab-goal}`.
For any tier that spawns agents (T1–T3), set `RUN_DIR = .claude/memory/runs/{RUN_SLUG}/` and
`mkdir -p` it now — the artifact workspace each phase writes into.

Then **echo the brief back in 4–6 lines** (Thai), and if anything is ambiguous or thin, ask ONE
clarifying question before spending any agent.

### Reject / re-work (input is a QA bounce)

If the input rejects something already built:
1. **Find the prior run** in `.claude/memory/reports/` and `flow-runs/`; check `git log`.
2. **Scope = the delta:** what was asked vs. built vs. now-wrong. The reject reasons become new
   acceptance criteria.
3. **Do NOT restart from a blank diagnosis.** Re-enter at the smallest tier that covers the delta.
4. Append a dated "re-work" section to the SAME flow-run log.

## STEP 0.5 — Classify (all tiers)

- **Flag override:** if the request starts with `--investigate`, `--fix`, `--screen`, or
  `--feature`, use that tier directly (strip the flag from `$ARGUMENTS`).
- **Otherwise classify** using the signals below. State the tier, a one-line reason, and confidence.
- **If confidence is low or the request straddles tiers**, ask ONE quick question first.
- If work reveals the tier was wrong, say so and escalate.

**Signal table:**
- **T0 Investigate** — "why does…", "how does…", "explain…", "is it possible…" — no change wanted.
- **T1 Fix** — "bug", "error", "doesn't work", "should X but does Y", broken existing behavior.
- **T2 Screen** — "add a page/screen", "new component", one UI surface, cosmetic/behavioral UI
  change, little or no API/store work.
- **T3 Feature** — "new system", multiple screens, new API routes/Supabase tables, prompt-architecture
  work, UI + store + API together.

**Input-type → tier:** `issue` → T1 · `test-case` → usually T1 · `spec`/`requirement` → T2 or T3 by
size · `reject` → re-work re-entry · `question` → T0.

---

## Tier 🔵 T0 — Investigate (read-only)

1. **Investigate** 🔍 — `steps/diagnose.md` → **bug-root-cause-analyst** (read-only), and/or
   `steps/inspect-db.md` → **supabase-inspector** if the question is about real Supabase data.
2. **Answer** — report the finding (symptom → mechanism → root cause) with `file:line` evidence.
   NO code changes. If the user then wants it fixed, re-run as T1.

## Tier 🔴 T1 — Fix

1. **Diagnose** 🔍 — `steps/diagnose.md` → **bug-root-cause-analyst** (read-only). If the cause
   depends on real Supabase data, also run `steps/inspect-db.md` → **supabase-inspector**.
   Confirm with the user if the fix touches a danger zone.
2. **Fix** 💻 — `steps/implement-fix.md` → **senior-fullstack-coder** (smallest change). Then run
   the **quality gate**. *(Trivial fast-path: skip agents 1–2 and fix inline.)*
3. **Verify** ✅ — `steps/verify.md` → **ui-verifier** (PASS/FAIL + evidence). On FAIL, loop back to
   step 2 (loop cap 2–3).
4. **Review** 🧑‍⚖️ (only if non-trivial) — `steps/review.md` → **storyweave-code-reviewer**.

> **Artifacts:** diagnose → `01-diagnosis.md` (you persist it), inspect-db → `02-inspect-db.md`
> (you persist it), fix → `05-implementation.md`, review → `07-review.md`; verify's verdict is
> inline + screenshots.

## Tier 🟡 T2 — Screen

1. **Spec** 📋 — write a short **inline** spec yourself (acceptance criteria, scope, edge cases).
   Escalate to `steps/requirements.md` → **product-requirements-analyst** only if non-trivial or
   ambiguous. Write your inline spec to `RUN_DIR/03-requirements.md`.
2. **Implement** 💻 — `steps/implement-feature.md` → **senior-fullstack-coder**. Then the **gate**.
3. **Verify** ✅ — `steps/verify.md` → **ui-verifier**.
4. **Review** 🧑‍⚖️ — `steps/review.md` → **storyweave-code-reviewer**; fix reasonable findings.

> If the screen turns out to need a new API route / Supabase table / prompt change, escalate to T3.

## Tier 🟢 T3 — Feature

1. **Requirements** 📋 — `steps/requirements.md` → **product-requirements-analyst**. Confirm the PRD
   with the user before implementation.
2. **Architecture** 🏗️ — `steps/architecture.md` → **system-architect** (feed in the PRD). If the
   design depends on existing Supabase tables/columns, run `steps/inspect-db.md` → **supabase-inspector**
   first.
3. **Implement** 💻 — `steps/implement-feature.md` → **senior-fullstack-coder** (PRD + architecture).
   Then the **gate**.
4. **QA** 🧪 — `steps/qa.md` → **qa-test-engineer**. Produces a verification matrix; writes automated
   tests only for pure logic (this repo has no living test suite — Playwright is installed but there
   is no configured runner). For a new/changed API route, exercise at least the happy path + one
   error path. Fix bugs found before review.
5. **Review** ✅ — `steps/review.md` → **storyweave-code-reviewer**; fix reasonable findings.
6. **Verify** ✅ — `steps/verify.md` → **ui-verifier** (final real-UI gate).

---

## Summarize (T1–T3, Thai)

Report: the chosen tier + why; for T1 the root cause + fix; for T2/T3 what was built (files with
clickable links); quality-gate result (tsc + lint + build); QA / UI-verify verdict; review findings
fixed; anything still pending or needing a user decision. Never commit/push unless asked.

## Update project memory (T1–T3, do not skip) — write in English

1. **Run log:** create `.claude/memory/flow-runs/{YYYY-MM-DD}-{slug}.md` from
   `flow-runs/TEMPLATE.md`. **Then add a one-line row to `flow-runs/INDEX.md` (newest at top):**
   `| {date} | {slug} | {tier} | {hook — what it was + status} |` — this index is what STEP 0
   greps, so a run without an index line is invisible to future runs.
2. **Verification report (non-trivial runs):** create `.claude/memory/reports/{RUN_SLUG}.md` from
   `reports/TEMPLATE.md`, consolidating the QA matrix + `ui-verifier` verdict. Link the screenshots
   `ui-verifier` saved under `reports/assets/{RUN_SLUG}/`.
3. **Promote CODE lessons:** if a problem could recur, add it to `gotchas.md` as
   symptom → root cause → fix → paths.
4. **Promote PROCESS lessons:** if the pipeline itself could improve, refine the relevant
   `steps/*.md` template or add a convention to `long-term.md`.
5. Do NOT commit. Tell the user which memory files you wrote.

---

## Pipelines

```
                         STEP 0  Context/Memory
                                 ↓
                         STEP 0.4 Intake & Normalize
                                 ↓
                         STEP 0.5 Classify  ──► T0 / T1 / T2 / T3
                                 ↓
 T0 Investigate  diagnose | inspect-db ─► answer (no code changes)
 T1 Fix          diagnose (+inspect-db) ─► implement-fix ─► [gate] ─► verify ─► [review]
                   └─ trivial fast-path: inline fix ─► gate ─► verify
 T2 Screen        [requirements] ─► implement-feature ─► gate ─► verify ─► review
 T3 Feature       requirements ─► architecture (+inspect-db) ─► implement-feature ─► gate
                     ─► qa (+API check) ─► review ─► verify
                                 ↓
                         Summarize (Thai)
                                 ↓
                         Update project memory (flow-runs log + report + promote lessons)
```
