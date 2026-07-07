# Flow Run — 2026-07-07 — inline-markdown-emphasis

- **Branch:** feat/typhoon-narrative-qte-fixes (merged to main)
- **Tier:** T2 (the deferred "step 2" from the narrative-pacing run)
- **Requested:** Render **bold** / *italic* emphasis instead of leaking raw asterisks ("*คราง*") to the
  player.
- **Status:** done + live-verified.

## What was built / changed
- `src/components/game/NarrativeRenderer.tsx` — added `renderInline()`: a tiny inline parser for
  `**bold**` (→ `<strong>`, key names/items) and `*italic*` (→ `<em>`, sound effects/emphasis). Bold is
  matched before italic; unmatched asterisks (e.g. "3 * 4") pass through literally; newlines preserved by
  the parent `whitespace-pre-wrap`. Applied to both non-streaming text paths; the STREAMING path stays
  raw to avoid partial-marker flicker. Dialogue speech left untouched.
- `src/app/api/chat/route.ts` — added an EMPHASIS FORMATTING rule to `buildNarrativePrompt`: use the same
  markdown subset SPARINGLY (italic sound effects, bold a key name on first appearance only), never
  inside quoted dialogue.

## Verification
- Regex unit-tested on edge cases (lone asterisk, multiplication, adjacent bold+italic) — all correct.
- Live turn (the same QTE E2E test) produced `*ครืด*` in the narration → renders italic.

## Danger zones touched
- `/api/chat` narrative prompt (emphasis rule). No schema/state change.

## Reusable lesson
- Covered by the existing gotcha "renderer honors newlines but not markdown" — now the renderer DOES
  handle a bold/italic subset via `renderInline` (streaming still raw). Update that mental model.
