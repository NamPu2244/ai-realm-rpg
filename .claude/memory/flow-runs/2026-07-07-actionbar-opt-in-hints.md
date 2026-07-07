# Flow Run — 2026-07-07 — actionbar-opt-in-hints

- **Branch:** feat/actionbar-opt-in-hints (merged to main)
- **Tier:** T2 (ActionBar UX — not a danger zone)
- **Requested:** (1) Suggested actions shouldn't always show — make them an opt-in "hint" the player
  reveals when stuck. (2) The free-text input must be disabled until the player picks an action mode.
- **Status:** done + user-tested OK.

## What was built / changed
- `src/components/game/ActionBar.tsx`
  - Suggested actions hidden by default behind a "นึกไม่ออก? ดูคำใบ้" toggle; revealed list has a "ซ่อน"
    button. Re-hidden each new turn via a render-phase reset (`prevSuggestions` compare), NOT a
    setState-in-effect (which the lint rule flags).
  - Free-text input `disabled` until a mode (Speak/Think/Act/Investigate) is chosen; placeholder tells
    the player to pick a mode; Send + handleSubmit also guard on `selectedType`. Hint buttons and
    No Response still work without a mode (escape hatches).
  - Took ownership of the 1-N number-key shortcut (moved from PlayScreen), gated on `showHints` so it
    only fires while hints are visible.
- `src/components/game/PlayScreen.tsx` — removed the old 1-4 keydown effect (now in ActionBar).

## Decisions
- **Render-phase reset over useEffect** for re-hiding hints per turn — `eslint-config-next` errors on
  synchronous setState inside an effect; React's "adjust state when a prop changes" pattern is clean.
- **Shortcut belongs with the hint state** (ActionBar), not PlayScreen — keeps keys consistent with
  what's on screen and sidesteps the QTE-key collision (a QTE turn empties suggestions / re-hides hints).
- Kept the component's existing English labels; new hint/placeholder strings are Thai (player-facing).
  Flagged to the user that the mode labels could be localized to Thai if wanted.

## Danger zones touched
- none (client interaction only).

## Reusable lesson
- `eslint-config-next` rejects synchronous `setState` in a `useEffect` (`set-state-in-effect`). To reset
  local state when a prop changes, use the render-phase compare pattern
  (`if (prop !== prev) { setPrev(prop); setState(...) }`), not an effect. Path:
  `src/components/game/ActionBar.tsx`.
