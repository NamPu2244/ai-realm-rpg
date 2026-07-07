# Flow Run — 2026-07-07 — cinematic-fx

- **Branch:** feat/cinematic-fx (merged to main)
- **Tier:** T3 (new system — extraction schema + store + component + CSS; danger zone, user-approved)
- **Requested:** Build the "Phase 2 cinematic FX" the user discussed with Gemini — the FXManager idea
  where the extraction model emits fx tags and the frontend plays weather/screen effects.
- **Status:** done. Each effect verified via seeded screenshots. Pure CSS — no new deps/assets.

## Architecture (extraction → store → FXManager)
- **Fixed vocabulary** in `src/lib/fx.ts` (single source of truth) + sanitizers (AI is hostile input):
  - `environment_fx` ⊂ {rain, snow, fog, embers} — ambient, PERSISTENT
  - `player_condition` ∈ {dizzy, poisoned, drunk, ''} — screen distortion, PERSISTENT
  - `impact_fx` ⊂ {shake, flash} — one-shot, fires THIS turn only
- **buildExtractionPrompt** (`route.ts`): a CINEMATIC FX rule (detect from narrative, fixed vocab) +
  3 schema fields.
- **applyGameResult** (`PlayScreen.tsx`): writes the 3 fields via the `@/lib/fx` sanitizers. On
  ambient/world-event turns it PRESERVES environment_fx/player_condition (freshState) so weather doesn't
  flicker off; impact_fx is set from data every turn.
- **Store** (`useGameStore.ts`): 3 new fields. environment_fx/player_condition persist; impact_fx is
  persisted as `[]` in partialize (never re-fire a stale one-shot on reload). Persist `version` 5→6 so
  old saves migrate the new fields.
- **Render**: `<FXManager/>` renders fixed non-interactive overlays (rain/snow/fog/embers/poison-vignette
  /white-flash) at z-30 (below modals). `sceneConditionClass()` + `useNarrativeShake()` put the
  dizzy/drunk sway+blur and the one-shot shake as a class on the in-game CONTENT WRAPPER (the
  `relative z-10 flex flex-1` div) — so distortion never blurs modals/overlays. CSS keyframes in
  `globals.css` (the existing prefers-reduced-motion block already freezes them).

## Notes / decisions
- Separate from the EXISTING HP-based effects (`useGameEffects`: isShaking/isDamageFlash on HP drop,
  applied to the root). The new system is NARRATIVE-driven and additive; both coexist.
- CSS-only for v1 (rain/snow via animated gradients, dizzy via filter+transform, flash/shake via
  keyframes). Deferred to v2: sound (howler.js — `sounds.ts` exists for QTE, extend it) + Lottie explosions.
- Verified via Playwright seeded screenshots: rain streaks, embers motes, green poison vignette, dizzy
  blur+sway, white flash all render correctly over the scene, modals unaffected.

## Danger zones touched
- Extraction `game_state` schema ↔ store types ↔ applyGameResult — all three updated in lockstep for the
  3 FX fields. No change to existing fields.

## Reusable lesson (promote to gotchas.md)
- The FX vocabulary is a closed set in `@/lib/fx`; the extraction prompt, the CSS classes in globals.css,
  and FXManager must stay in sync with it. Promoted to gotchas.
