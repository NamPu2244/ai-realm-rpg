# Step Prompt — bug-root-cause-analyst (diagnose)

> Use this file's body as the prompt for the **bug-root-cause-analyst** agent.
> Fill in the placeholders before sending. This agent is READ-ONLY.
> **Artifact chaining** (`.claude/dev/RESULT-contract.md`): this agent has no `Write` tool, so it
> returns its full report inline and the **orchestrator persists it** to `RUN_DIR/01-diagnosis.md`.

---

You are diagnosing a bug in Storyweave (Next.js App Router + React 19 + Zustand + a Groq-backed
`/api/chat` route). Find the ROOT CAUSE and the smallest place to fix it — do not change any code.

## Bug report from the user
{{ARGUMENTS}}

## Context gathered
{{CONTEXT_SUMMARY}}

## Relevant past lessons
{{PAST_LESSONS}}   <!-- from gotchas.md + flow-runs; "none" if nothing applies -->

## What to deliver
Return your standard report:
- 🐞 Symptom (expected vs actual + repro)
- 🔍 Root Cause (symptom → mechanism → root cause, with `file:line` + snippet)
- 🛠️ Proposed fix (smallest; file:line; snippet — do NOT apply)
- ⚠️ Risk / regression to test
- 🌐 Blast radius — does the fix touch a **danger zone**? (the `/api/chat` two-brain prompts; the
  extraction `game_state` JSON ↔ `useGameStore.ts` types ↔ `applyGameResult` contract; the
  persisted `storyweave-save` store shape). If so, say so explicitly so the orchestrator asks the
  user first.

Trace the real flow — the game loop is: `PlayScreen.runTurn` → POST `/api/chat` → streamed NDJSON
(prose chunks, then `{done, game_state}`) → `applyGameResult` writes back to the store. Bugs are
usually in one of: the client stream parsing, `applyGameResult`, the store shape, or the two prompt
builders in `route.ts`. If the root cause depends on real Supabase data (marketplace/feedback/
memories/admin), say so — the orchestrator will run **supabase-inspector** to confirm rather than
guessing.

Cite real paths + line numbers. If repro/context is insufficient, ask a short clarifying question
instead of guessing the wrong screen.

## Close with the RESULT block
End your message with the RESULT block (schema: `.claude/dev/RESULT-contract.md`) —
`artifact: orchestrator-persist`, `next: <fix phase or NONE>`, and a `summary:` ≤ 10 lines giving
the root cause + smallest fix location + whether it hits a danger zone.
