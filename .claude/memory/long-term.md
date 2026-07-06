# Long-Term Memory — ai-realm-rpg (Storyweave)

Durable, team-shared knowledge about this codebase. Read before non-trivial work. Keep entries concise
and cite real file paths. Promote reusable lessons here from `flow-runs/`. Convert relative dates to
absolute. Recurring **bug** lessons go in [gotchas.md](gotchas.md) (the learning-loop source), not here.

## Index
- [Project map (routes, store, API, game loop, commands)](project-map.md)
- [Architecture overview](#architecture-overview)
- [Danger zones](#danger-zones)
- [Conventions / working rules](#conventions--working-rules)
- [Agents & workflows](#agents--workflows)
- [Known gotchas & fixes](gotchas.md)

---

## Architecture overview
Text-based AI-driven RPG. A single Groq-backed `/api/chat` route drives the game via a **two-brain**
design — a "storyteller" that streams prose and a "rules engine" that emits the `game_state` JSON — plus
a dice call before the narrative on non-first turns. The client (`PlayScreen`) consumes a streamed NDJSON
stream, shows the prose live, then applies the terminal `game_state` to a single Zustand store persisted
as `storyweave-save`. Around the game sit Supabase (auth, admin, feedback, memories, world marketplace)
and Stripe. Full file catalog in [project-map.md](project-map.md).

## Danger zones
Three couplings dominate every change (the `/dev` orchestrator gates edits to them):
1. **The `/api/chat` two-brain prompts** (`buildNarrativePrompt` / `buildExtractionPrompt` + the dice
   call) in `src/app/api/chat/route.ts`. Prose-affecting rules go in the narrative prompt; state/schema
   rules go in the extraction prompt. A misplaced rule silently degrades every turn.
2. **The extraction `game_state` schema ↔ store types ↔ applyGameResult.** `buildExtractionPrompt`'s
   emitted fields must match `src/store/useGameStore.ts` types AND `applyGameResult` in
   `src/components/game/PlayScreen.tsx`. Change one → change all three, or state silently corrupts.
3. **The persisted `storyweave-save` Zustand shape.** Renaming/removing a field breaks existing
   localStorage saves and the JSON export/import. Add fields additively with defaults; migrate if forced.

## Conventions / working rules
- **Command UX:** every multi-step command (`/dev`, future ones) presents progress with the shared
  **Progress Table** and asks for confirmation with the plain-language **Approval Block** — spec in
  `.claude/conventions/progress-and-approval.md`. Never show a raw command as the "press yes" ask.
- **Language:** UI strings are primarily Thai (unless `world_config.language` says otherwise); AI-facing
  prompt text + TypeScript types are English. Talk to the user in Thai; write persisted memory in English.
- **Styling:** Tailwind utility classes only, dark/neutral RPG aesthetic. No CSS files.
- **Secrets stay server-side:** `GROQ_API_KEY`, Supabase service-role key, Stripe keys never reach the
  client. Supabase access via `src/lib/supabase/`.
- **This is NOT the Next.js you know** (`AGENTS.md`): before writing routing/config code, read the
  relevant guide in `node_modules/next/dist/docs/`. Heed deprecation notices.
- **No living automated-test suite / no configured runner.** Playwright is a dependency but there is no
  `test` script or Jest/Vitest config. QA value comes from the `ui-verifier` real-UI gate + a
  verification report. Write automated tests only for pure logic worth locking down, and only after
  confirming/adding a runnable path.
- **`.claude/` is committed (team-shared).** Unlike the humanos setup this was copied from, `.claude/`
  here is NOT gitignored — treat this tooling + memory as shared and keep it current.

## Agents & workflows
- **Single entry point: `/dev`** (`.claude/commands/dev.md`). Classifies the request into a tier and runs
  the right-sized pipeline. Talks Thai; persists memory in English. Force a tier with
  `--investigate` / `--fix` / `--screen` / `--feature`.
  - 🔵 **T0 Investigate** (question/diagnosis, no change): diagnose &/or inspect-db → answer, read-only.
  - 🔴 **T1 Fix** (bug): diagnose (+inspect-db) → implement-fix → gate → verify → review (if non-trivial).
    Trivial fast-path: obvious tiny fixes applied inline → gate → verify.
  - 🟡 **T2 Screen** (one page/component): [requirements] → implement-feature → gate → verify → review.
  - 🟢 **T3 Feature** (system, API+UI+store): requirements → architecture (+inspect-db) →
    implement-feature → gate → qa (+API check) → review → verify.
  - **Quality gate** after every implementation step = `npx tsc --noEmit` + `npm run lint` + `npm run
    build` (routing/config). Verify→Fix loop capped at 2–3 tries.
  - **Intake (STEP 0.4):** any input (issue/spec/requirement/test-case/reject/screenshot) is normalized
    to one brief (goal + input-type + source-of-truth + acceptance criteria + evidence + prior-context)
    before classifying. A provided spec/requirement/test-case is the **source of truth**. A **reject**
    re-enters via the prior `flow-runs/`+`reports/` entry and fixes only the delta.
  - **Artifact chaining** (`.claude/dev/RESULT-contract.md`): each phase writes detail to
    `runs/{RUN_SLUG}/NN-*.md` and returns only a RESULT block; the orchestrator forwards paths, not
    pasted reports.
- Project agents (`.claude/agents/`, committed + team-shared, override user-global):
  `bug-root-cause-analyst` (read-only diagnosis), `supabase-inspector` (read-only data shape),
  `senior-fullstack-coder`, `product-requirements-analyst`, `system-architect`, `qa-test-engineer`,
  `storyweave-code-reviewer`, `ui-verifier`. Files in `.claude/dev/steps/` are prompt templates fed to
  those agents, NOT agent definitions.

## Provenance
This `.claude/` system was ported (slimmed) from `humanos-irpc/.claude` on 2026-07-06 and adapted to
this stack: dropped the monorepo/C#/SQL-Server/`@cat/lib` assumptions and `/sync`; replaced the SQL
Server `db-inspector` with `supabase-inspector`; re-pointed "central code" to this app's three danger
zones; switched user-facing language to Thai. See [flow-runs/INDEX.md](flow-runs/INDEX.md) for run history.
