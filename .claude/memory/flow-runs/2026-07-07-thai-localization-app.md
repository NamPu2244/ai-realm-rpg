# Flow Run — 2026-07-07 — thai-localization-app

- **Branch:** feat/thai-localization-app (merged to main)
- **Tier:** T2 (UI sweep, part 2 — out-of-game screens; text-only)
- **Requested:** After the in-game sweep, the user noted login/main-menu/create-world/market/loading were
  still English. Localize the rest of the player-facing app to Thai.
- **Status:** done. tsc clean; no new lint errors.

## What was changed (9 files, text-only)
AuthScreen (login), MainMenuDashboard (main menu + settings + confirms), WorldCreationMenu (genres/tones/
genders/orientations/traits labels + all form UI + Pro upsell modal), store/page.tsx + store/[id]/page.tsx
(marketplace list + detail + publish modal), WorldLoadingScreen, ui/Modal.tsx (Alert/Confirm defaults),
create/page.tsx, app/page.tsx.

## Deliberately LEFT in English (not a miss)
- **AI-facing prompt data:** `GENRES[].value`, `OPENING_SEEDS`, and the character-prompt scaffolding
  (`Gender:`/`Sexual orientation:`/`Personality traits:`/`Concept/background:` + the default "Let the GM
  invent…") in WorldCreationMenu — these are sent to the model, not shown as UI.
- **Marketplace TROPE tags** (`Isekai/System/Regression/Villainess/Cultivation/OP MC/Survival` in
  store/page.tsx) — they are DATA KEYS stored on published worlds in Supabase and matched by the filter;
  translating would break matching against already-published worlds. (Also genre-jargon Thai readers use
  as loanwords.) Change them only via a coordinated DB migration.
- Brand "STORYWEAVE"/"Storyweave", `you@example.com` email placeholder, `gsk_...` placeholder.

## Decisions
- Genre/tone labels translated in BOTH WorldCreationMenu and WorldLoadingScreen's `toGenreLabel` for
  consistency (kept `value` English).
- Sort keys shown via a Thai ternary (`popular→ยอดนิยม`, `newest→ใหม่ล่าสุด`) instead of raw `{key}`.
- Skipped **admin** pages (internal, not player-facing) — flagged to user.

## Reusable lesson
- Added to the localization gotcha: when localizing, DON'T translate strings that are (a) sent to the AI
  as prompt content, or (b) used as data keys matched against the DB (marketplace tropes). Glossary in
  `2026-07-07-thai-localization`.
