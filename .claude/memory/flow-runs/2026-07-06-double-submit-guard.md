# Flow Run — 2026-07-06 — double-submit-guard

- **Branch:** main
- **Tier:** T1 (bug fix — done inline, root cause obvious once traced)
- **Requested:** "UI รก / คำมั่ว" — surfaced during a narrative-model A/B; the concrete UI bug was a
  suggested-action being submitted twice ("เตรียมพร้อมการต่อสู้" appeared back-to-back).
- **Status:** done (fix landed; live-play confirmation pending with the user)

## What was built / changed
- `src/components/game/PlayScreen.tsx` — added a synchronous in-flight lock (`inFlightRef`) to
  `handleSend`: reject reentrant sends while a turn is in flight, cleared in a `finally` in lockstep
  with `runTurn`'s `setIsLoading(false)`. Wrapped the existing body in `try { … } finally { … }`.

## Root cause
- `setIsLoading(true)` lives INSIDE `runTurn` (PlayScreen.tsx ~line 390), several async steps after
  the click reaches `handleSend`. The suggested-action buttons and the 1-4 keyboard shortcut gate only
  on the `isLoading` React state, which doesn't disable the button until a re-render. A fast second
  click/keypress in that window fires `handleSend` again → two history entries + two `/api/chat` turns.
- The gpt-oss-120b rambling/truncation made it *look* worse, but the duplicate action was a real
  client race independent of the model.

## Decisions
- **Ref guard, not more `isLoading` checks.** A ref flips synchronously so it closes the race that
  state can't. Placed the acquire right after the empty-message early-return, before any state work.
- **Fast-path inline fix** (no coder agent): single-file, ~small logic change, root cause certain.
- World-event reentrancy (`applyGameResult` → `onSend`) is unaffected: those calls fire from the
  ambient `setTimeout`, i.e. after the `finally` has released the lock — never synchronous reentrancy.

## Danger zones touched
- none. (Client interaction only; no prompt/schema/store-shape change.)

## Follow-ups / still pending
- **Live confirm:** user to verify in real play that a rapid double-click on a suggested action now
  fires exactly one turn.
- Separate track: **Typhoon** narrative model (the real fix for Thai word-garbling) — not started.

## Reusable lesson (promote to gotchas.md?)
- Yes — "disabling a button on async `isLoading` state doesn't prevent double-submit; guard the async
  handler with a synchronous ref." Promoted to `gotchas.md`.
