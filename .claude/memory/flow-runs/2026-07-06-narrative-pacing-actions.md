# Flow Run — 2026-07-06 — narrative-pacing-actions

- **Branch:** main
- **Tier:** T2 (prompt-craft refinement in a danger zone — done inline, no coder agent)
- **Requested:** Make the Phase-1 experience feel less like "chatting with a generic AI" — attack the
  wall-of-text problem and the bland action buttons (from a strategy discussion with the user about
  why the game didn't feel "wow" yet).
- **Status:** done (step 1 of 2)

## What was built / changed
- `src/app/api/chat/route.ts` — `buildNarrativePrompt`: added a **VISUAL PACING** rule to the
  NARRATIVE CRAFT block — mandates breaking prose into short 1-3 sentence paragraphs separated by a
  blank line (light-novel/web-novel layout), with high-impact beats on their own line. Prose-affecting
  rule → correctly placed in the narrative brain.
- `src/app/api/chat/route.ts` — `buildExtractionPrompt`: rewrote the **SUGGESTED ACTIONS** instruction
  from "plausible actions" to scene-specific, intent/stake-charged, evocative choices with a
  concrete ❌/✅ contrast. Field-wording only — no schema change.

## Decisions
- **Prompt-only for step 1, no renderer change.** `NarrativeRenderer` already uses `whitespace-pre-wrap`,
  so `\n`/blank lines from the model render immediately — the pacing win needs zero client change.
- **Deferred bold/italic (step 2).** Markdown `**`/`*` would render as literal asterisks (renderer has
  no markdown parser). Emphasis requires a small inline parser in `NarrativeRenderer` + a prompt rule —
  scoped as a separate follow-up so A+B can be verified in live play first.
- **In-medias-res / opening was NOT touched** — `buildNarrativePrompt` already has strong OPENING SCENE
  rules (forbidden tropes, no waking-up-in-a-cave, mid-motion arrival). No delta needed there.
- Did the change inline (fast-path) rather than spawning senior-fullstack-coder: it's a few lines of
  prose-rule wording, subjective by nature, and blast radius is contained to prompt text.

## Problems hit & how they were solved
- none (tsc clean; lint's 79 problems are all pre-existing in other files, none in route.ts).

## Danger zones touched
- **`/api/chat` two-brain prompts** (`route.ts` `buildNarrativePrompt` + `buildExtractionPrompt`).
  Confirmed with the user before editing. No JSON schema / store types / `applyGameResult` / dice
  touched — only prose rules and one field's wording, so the schema↔store↔applyGameResult contract is
  untouched.

## Follow-ups / still pending
- **Step 2 (proposed, not yet approved):** inline `**bold**` (names/items) + `*italic*` (sound effects)
  support — add a lightweight inline parser to `src/components/game/NarrativeRenderer.tsx`, then a
  prompt rule telling the storyteller to emphasize accordingly.
- **Live verification pending:** requires `GROQ_API_KEY` + the user playing a real turn to judge the
  prose-formatting/action-button improvement (a soft/qualitative outcome, not deterministic UI).

## Reusable lesson (promote to gotchas.md?)
- The narrative renderer supports newline pacing but NOT markdown — a genuinely reusable gotcha.
  Promoted to `gotchas.md`.
