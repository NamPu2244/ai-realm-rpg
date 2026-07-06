# Step Prompt — senior-fullstack-coder (surgical fix)

> Use this file's body as the prompt for the **senior-fullstack-coder** agent.
> This is the SURGICAL variant (Tier 1 — Fix).
> **Artifact chaining:** read the diagnosis by path, write your change-log to `{{ARTIFACT_PATH}}`
> (= `RUN_DIR/05-implementation.md`), return only a RESULT block — `.claude/dev/RESULT-contract.md`.

---

You are applying a bug fix in Storyweave. Apply the **smallest** change that fixes the root cause —
nothing speculative, no adjacent "improvements".

## Bug report
{{ARGUMENTS}}

## Root-cause diagnosis — read it by path
{{PRIOR_ARTIFACTS}}   <!-- RUN_DIR/01-diagnosis.md (+ 02-inspect-db.md if data was checked); read it before editing -->
Read the diagnosis file(s) above — they carry the proposed fix location and blast radius.

## Relevant past lessons
{{PAST_LESSONS}}

## Rules
- Implement exactly the proposed fix from the diagnosis (or better if you spot an issue — but
  explain why). Keep it surgical: every changed line must trace to this bug.
- **Danger zones need explicit approval** — do NOT edit these unless the diagnosis says it's
  unavoidable AND the orchestrator confirmed the user approved: (1) the `/api/chat` two-brain
  prompt builders (`buildNarrativePrompt` / `buildExtractionPrompt` / dice) in
  `src/app/api/chat/route.ts`; (2) the extraction `game_state` JSON schema — if you change it you
  MUST keep `src/store/useGameStore.ts` types and `applyGameResult` in
  `src/components/game/PlayScreen.tsx` in sync; (3) the persisted `storyweave-save` store shape.
- Follow project conventions: Tailwind utility classes only (dark/neutral RPG aesthetic); player-facing
  UI strings in Thai (unless `world_config.language` dictates otherwise); AI-facing prompt text/types
  in English; Zustand store is the single source of truth for game state.
- After editing, run `npx tsc --noEmit` and `npm run lint`; fix anything your change introduced.
  Report pre-existing warnings separately.

## Deliver — write the change-log to the artifact, return only the RESULT block
Write to `{{ARTIFACT_PATH}}` (`RUN_DIR/05-implementation.md`): the files + line ranges changed, a
one-line rationale per file, and the tsc/lint result.

Then end with the RESULT block (schema: `.claude/dev/RESULT-contract.md`): `artifact: {{ARTIFACT_PATH}}`,
a `changed-files:` list, a runnable `verify:` field (the commands + the steps to observe + expected
result — the orchestrator runs it as the verify gate), a `summary:` of what changed, `next: verify`,
`notes:` for anything pre-existing or risky. Do not commit or push.
