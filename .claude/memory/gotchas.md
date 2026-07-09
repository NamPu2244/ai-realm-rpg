# Known gotchas & fixes — ai-realm-rpg (Storyweave)

The **learning-loop source** for `/dev`. STEP 0 reads THIS file (not the whole `long-term.md`) to seed
the "Relevant past lessons" block; the diagnose/coder/reviewer/QA agents check the current change
against it. Keep it to recurring, reusable lessons — one bullet each, in the shape
**symptom → root cause → fix → file paths**. Codebase architecture lives in
[long-term.md](long-term.md); per-run history lives in [flow-runs/](flow-runs/).

- **Extraction `game_state` schema must stay in lockstep with the store types and `applyGameResult`.**
  If `buildExtractionPrompt` (`src/app/api/chat/route.ts`) emits or renames a field, the type in
  `src/store/useGameStore.ts` and the write in `applyGameResult`
  (`src/components/game/PlayScreen.tsx`) must change with it — otherwise the field is silently dropped
  or a stale value persists. Symptom: a stat/objective/suggested-action the AI clearly produced never
  shows up. Always change all three together.
- **Persisted `storyweave-save` shape changes break existing saves + JSON import.** The Zustand store
  persists to localStorage; renaming/removing a field means old saves (and imported JSON) load with
  missing/`undefined` fields. Add new fields additively with sane defaults; if a field must change
  shape, write a migration in the persist config rather than assuming a fresh store.
- **Prose rules vs state rules live in DIFFERENT prompts.** Putting a "show don't tell / banned phrase"
  rule in `buildExtractionPrompt`, or a stat-math/schema rule in `buildNarrativePrompt`, makes it
  ineffective — the narrative call streams pure prose (no JSON), the extraction call does the state math
  (JSON, low temp). Route each new rule to the correct brain (see `CLAUDE.md` "When modifying game
  mechanics").
- **First-turn prose has a `[[SCENE]]` marker; only the part after it is displayed.** The opening turn's
  prose is `prologue [[SCENE]] narrative` (`SCENE_DELIM` in `gameText.ts`). Client code that renders the
  raw first-turn prose without splitting on the marker will show the prologue twice / in the wrong place.
- **The AI is a hostile input — guard `game_state`.** The extraction call can return malformed, empty,
  or partial JSON. `applyGameResult` and any consumer must not overwrite good state with empty AI output
  or crash on a missing field. Test the empty/malformed `game_state` and network/parse-failure retry path.
- **No `GROQ_API_KEY` → no turn renders.** `/api/chat` fails without a valid key in `.env.local`, so the
  game loop can't be UI-verified. `ui-verifier` should report BLOCKED (not a downgraded PASS) and name the
  missing secret. Static/menu screens (`/`, `/create`, dashboard) can still be verified without the AI.
- **Modals are hand-rolled and scattered — prefer the shared `ui/Modal`.** Symptom: two different
  modal looks/animations in one screen (e.g. store's delete used shared `ConfirmModal` but Publish was
  a bespoke `fixed inset-0` overlay with its own `popIn`/`fadeIn` keyframes). Root cause: most dialogs
  (`store` PublishModal, and all in-game ones: Inventory/Settings/Energy/Feedback/Dossier) roll their
  own overlay instead of using `src/components/ui/Modal.tsx`. Fix: `Modal` is now exported and takes
  `size?: "sm"|"md"|"lg"` (+ `framed` for header/scroll-body dialogs). **All app modals now use it**
  — store PublishModal + in-game Energy/Feedback/Settings/Inventory/CharacterDossier. For a dialog
  with a fixed header and a scrolling body, use `<Modal size framed>` and give the scroll section
  `flex-1 min-h-0 overflow-y-auto` (the panel is an unpadded ≤85vh flex-column). Note: `framed`
  migration trades a bespoke slide-in for the standard `animate-modal-pop`; keep any Escape handler
  the old modal had (the shared Modal only dismisses on backdrop click). Paths:
  `src/components/ui/Modal.tsx`, `src/app/store/page.tsx`, `src/components/game/*Modal.tsx`.
- **Menu/store chrome is intentionally the fixed amber brand; genre `--theme-*` tokens are in-game only.**
  Don't "fix" the store/menu to use `--theme-bg/accent` — those tokens (`globals.css`) drive the
  per-genre look of `/play` (PlayScreen/ActionBar) only. Menu, create, auth, and store deliberately
  share the near-black `#07050a` + amber/orange palette. Paths: `src/app/globals.css`,
  `src/components/{AuthScreen,MainMenuDashboard,WorldCreationMenu}.tsx`, `src/app/store/`.
- **The narrative renderer honors newlines but NOT markdown.** `NarrativeRenderer` renders prose in a
  `whitespace-pre-wrap` block, so `\n` / blank-line paragraph breaks from the model display correctly —
  a prompt rule telling the storyteller to break paragraphs works with zero client change. But `**bold**`
  / `*italic*` (or any markdown/HTML) render as **literal characters** — there is no inline parser. To
  add emphasis you must first add a small inline parser to `src/components/game/NarrativeRenderer.tsx`,
  THEN add the prompt rule; a prompt-only markdown rule just leaks raw asterisks to the player. Dialogue
  is already split out and styled separately via `dialogue_lines` (don't re-handle quotes in prose rules).
  Paths: `src/components/game/NarrativeRenderer.tsx`, `src/app/api/chat/route.ts`.
- **Disabling a button on async `isLoading` state does NOT prevent double-submit.** `handleSend`
  (`PlayScreen.tsx`) only reaches `setIsLoading(true)` deep inside `runTurn`, so the suggested-action
  buttons / 1-4 keyboard shortcut stay clickable until React re-renders — a fast double-click fires the
  same turn twice (two history entries + two `/api/chat` calls). Symptom: a player action bubble appears
  back-to-back. Fix: guard the async handler with a SYNCHRONOUS ref lock (`inFlightRef`) acquired at the
  top of `handleSend` and released in a `finally` in lockstep with `runTurn`'s `setIsLoading(false)` —
  state-based guards can't close this race. Path: `src/components/game/PlayScreen.tsx`.
- **Narrative model: neither Groq general model nails Thai — Typhoon is the intended fix.** A/B on
  2026-07-06: `openai/gpt-oss-120b` looked good on the short opening turn but FELL APART at length/combat
  (repeats whole words "คอยคอย"/"พายุพายุ", misspells "ศากาศ", invents nonsense "ครีบไม้", rambles until it
  hits `max_tokens` and truncates mid-word, and skips the dice bracket). `qwen/qwen3.6-27b` (current) is
  better but still garbles rare words ("ยิคมด"). Root cause: Thai fluency is a base-model limit prompts
  can't fix. Plan: route the narrative call to a Thai-specialized model (Typhoon / opentyphoon.ai,
  OpenAI-compatible) — needs a `route.ts` change to decouple the narrative endpoint from Groq + an API
  key + a context-window check (free tier is only 8K; our prompt is ~6.4K). Swap via `NARRATIVE_MODEL`
  in `.env.local`. See user memory `narrative-model-choice`.
  **UPDATE 2026-07-06: DONE.** `route.ts` now decouples the narrative endpoint via `NARRATIVE_BASE_URL`
  + `NARRATIVE_API_KEY` (unset → Groq fallback); `.env.local` points narrative at
  `typhoon-v2.5-30b-a3b-instruct` @ opentyphoon.ai, extraction/dice stay on Groq.
- **Typhoon obeys the prose rules ONLY at low temperature.** The narrative temp was tuned hot for Groq
  (0.95 first turn / 0.85 after). At that temp Typhoon (`typhoon-v2.5-30b-a3b-instruct`, a 3B-active MoE)
  IGNORES the banned-phrase / show-don't-tell rules (writes "คุณรู้สึก", dictates feelings) and garbles
  words ("เอควันควัน", wrong classifier "30 เรื่อง"). At its recommended temp 0.6 + top_p 0.6 it obeys
  perfectly (zero banned words, shows emotion through the body) and stops garbling. Fix: narrative
  sampling in `route.ts` is now endpoint-aware (`useNarrativeOverride` → temp 0.7/0.6 + top_p 0.6; Groq
  path unchanged). Lesson: per-model sampling matters — a temp tuned for one model can break another's
  instruction-following. Path: `src/app/api/chat/route.ts`.
- **QTE not firing is almost never broken plumbing — it's the narrative not writing reflex-attack beats.**
  `is_qte_active` flows correctly extraction → `applyGameResult` (PlayScreen.tsx ~252) → store → render
  gate `is_qte_active && !isLoading` (~883). scout-17b DOES set QTE for an in-motion attack (verified on
  the full extraction prompt). It never fires in play because the narrative writes tension/menace/decision
  cliffhangers, not a lethal strike already in motion — so extraction correctly finds no QTE. The two
  brains must be tuned together: the narrative prompt needs a rule to COMMIT to an in-motion attack and
  cut before impact (REFLEX-ATTACK BEATS), and the extraction QTE rule must trigger on an attack that is
  merely incoming (impact not yet shown), while staying false for decision cliffhangers (those →
  suggested_actions). Diagnose QTE/countdown/qte-option gaps by testing the REAL `buildExtractionPrompt`
  against a sample narrative via API before touching code. Path: `src/app/api/chat/route.ts`.
- **`eslint-config-next` errors on synchronous `setState` inside a `useEffect` (`set-state-in-effect`).**
  To reset local component state when a prop changes (e.g. re-hide ActionBar hints each turn when
  `suggestedActions` changes), use React's render-phase pattern —
  `const [prev,setPrev]=useState(prop); if (prop!==prev){ setPrev(prop); setState(...) }` — not an
  effect. Path: `src/components/game/ActionBar.tsx`.
- **In-game UI is Thai — keep the localization glossary consistent for any NEW string.** The whole
  `src/components/game/` chrome was localized to Thai (2026-07-07). No i18n framework — direct Thai
  strings. Reuse these terms so the UI stays uniform: STR/DEX/INT/CON/WIS/CHA → พลัง/ว่องไว/ปัญญา/อึด/
  สติ/เสน่ห์; HP→พลังชีวิต, Mana→พลังเวท, Gold→ทอง, EXP→ปสก., Level→เลเวล, Lives→ชีวิต; Vitals→ค่าชีพ,
  Attributes→ค่าพลัง, Progression→ความก้าวหน้า, Objective→เป้าหมาย, Companions→เพื่อนร่วมทาง, Factions→ฝ่าย,
  Conditions→สภาวะ, Skills→ทักษะ, Inventory→สัมภาระ, Quests→ภารกิจ, Active Threads→เรื่องค้างคา;
  modes Speak/Think/Act/Investigate/No Response → พูด/คิด/ทำ/สำรวจ/นิ่งเฉย; Send→ส่ง, Cancel→ยกเลิก,
  Save→บันทึก, Close→ปิด, Retry→ลองใหม่. Keep the STORYWEAVE brand + AI-facing signals
  (`[[SCENE]]`, `[ทอยเต๋า]`, `Begin the adventure.`) in their original form. Full list in flow-run
  `2026-07-07-thai-localization`. Out-of-game screens (login/menu/create/marketplace/loading/modals)
  were localized in `2026-07-07-thai-localization-app`. **When localizing, DO NOT translate strings that
  are (a) sent to the AI as prompt content — `GENRES[].value`, `OPENING_SEEDS`, and the `Gender:/Sexual
  orientation:/Personality traits:/Concept:` scaffolding in `WorldCreationMenu.tsx`; or (b) used as DATA
  KEYS matched against Supabase — the marketplace TROPE tags in `src/app/store/page.tsx` (translating
  breaks filtering vs. already-published worlds; migrate the DB first). Admin pages are internal — skip
  unless asked.**
- **Thai labels must NOT use wide letter-spacing.** The design used `uppercase tracking-[0.25em‥0.55em]`
  on labels — fine for Latin caps, but Thai has no word spaces and no uppercase, so wide tracking splits
  Thai words apart and hurts readability (`uppercase` is also a no-op). Rule: cap Thai labels at
  `tracking-widest` (0.1em) or tighter; keep wide tracking ONLY on the Latin brand wordmarks
  (STORYWEAVE/STORY/WEAVE/Storyweave). Fixed across menu/auth/create/loading/store/QTE/inventory/sidebar
  on 2026-07-07 (`fix/thai-label-tracking`).
- **`/store` (and `/store/[id]`) do NOT mount `usePhaseSync` — navigate with `router.push`, not
  `game_phase`.** `usePhaseSync` (which mirrors `game_phase` → URL) is only mounted on `/` (page.tsx),
  `/create`, and `/play` (PlayScreen). On the store routes, `setGameState({ game_phase })` updates state
  but does NOT change the URL, so a button relying on it does nothing. Symptom: store's "back to main
  menu" did nothing. Fix: call `router.push("/")` explicitly (keep the `game_phase: "Dashboard"` so the
  landing renders MainMenuDashboard). The play button in `store/[id]` already does this
  (`router.push("/play")`). Path: `src/app/store/page.tsx`.
- **Never render `world_config.genre` or `.tone` raw in the UI — they're AI-facing values.** `genre`
  holds the long English description sent to the model and `tone` holds the raw id (`balanced` etc.).
  They were leaking into the sidebar, mobile stats, journal, and header (e.g. "แนว: High fantasy…",
  "โทน: balanced", "BALANCED"). Use `genreLabelTH()` / `toneLabelTH()` from `src/lib/gameText.ts` at
  every DISPLAY site (custom Pro genres fall through and show as typed). Verified via a screenshot pass.
- **Cinematic FX vocabulary is a closed set in `src/lib/fx.ts` — keep 4 places in sync.** The extraction
  model emits `environment_fx` (rain/snow/fog/embers), `player_condition` (dizzy/poisoned/drunk), and
  `impact_fx` (shake/flash). Adding/renaming an effect means updating ALL of: (1) the lists+sanitizers in
  `@/lib/fx`, (2) the CINEMATIC FX rule + schema in `buildExtractionPrompt` (`route.ts`), (3) the CSS
  classes/keyframes in `globals.css`, (4) the render switch in `FXManager.tsx` (and `sceneConditionClass`
  for condition transforms). environment_fx/player_condition persist; impact_fx is forced to `[]` in the
  store's partialize (one-shot, must not re-fire on reload). This is part of the extraction↔store↔
  applyGameResult danger-zone contract. See flow-run `2026-07-07-cinematic-fx`.
  **Sound (v2):** each FX also has synthesized Web Audio in `src/lib/sounds.ts` (no files) —
  `playBoom`/`playThunder` one-shots + `setAmbientLoops`/`stopAllAmbient` looping weather (`LOOP_SPECS`).
  FXManager fires them; muting stops loops. So a new effect means updating `sounds.ts` too (5th sync place).
  **environment_fx expanded to 12 ambiences (2026-07-07)**: rain/snow/fog/embers (visual + sound) +
  sound-only wind/water/ocean/underwater/cave/crowd/machinery/magic. The `AMBIENTS` registry in
  `sounds.ts` (per-effect synth builders) must have a key for every ENVIRONMENT_FX value; the 8 sound-only
  ones deliberately have NO CSS/visual (FXManager only renders overlays for rain/snow/fog/embers).
- **Typhoon narrative slips banned phrases via un-listed variants (2026-07-08).** Symptom: prose still
  writes รู้สึก/ดูเหมือน despite the ban. Root cause: the THAI BANNED PHRASES list enumerated exact
  strings (คุณรู้สึก/รู้สึกว่า, ดูเหมือน) so the model reached for near-variants (bare รู้สึกว่า, รู้สึกคุ้น,
  รู้สึกถึง, ก็รู้สึก, คล้ายจะ). Fix: `buildNarrativePrompt` now bans the VERB รู้สึก in EVERY form + ดูเหมือน/
  คล้ายจะ as fact-hedges, each with ❌→✅ rewrites, while explicitly PRESERVING the poetic ราวกับ simile
  (don't ban that — the good prose leans on it). Reduced ~7→0 on one full battery, ~4 residual on another.
  **Ceiling reality:** at temp 0.6/top_p 0.6 prompt rules REDUCE but can't GUARANTEE zero — residual slips
  cluster on introspective/supernatural beats (god-mode backlash, eerie exploration) and on genuine
  physical-sensation uses (น้ำเย็นจนรู้สึก…). Chasing 0 needs a rewrite-pass backstop, not more prompt text.
- **suggested_actions is now generated by the STORYTELLER, not extraction (2026-07-08).** Symptom being
  fixed: choices shown to the player were flat generic verbs ("สำรวจห้อง", "เตรียมตัว", "หาของมีค่า") →
  "…so what do I do now?" (แล้วยังไงต่อ). Root cause: suggested_actions was a side-field of the EXTRACTION
  call (scout-17b, a weak bookkeeping model) — but writing tempting scene-specific choices is a CRAFT task.
  Fix: `buildChoicesPrompt` + a dedicated call to the NARRATIVE model (Typhoon) inside `finishTurn`, fired
  in PARALLEL with extraction (Promise-style, no added wall-time), fed the finished prose; it OVERRIDES
  `gameState.suggested_actions` when it returns ≥2 valid strings, else falls back to extraction's list.
  So there are now effectively 4 LLM calls/turn (dice, narrative, extraction, choices). If you're debugging
  "why is suggested_actions X", it comes from the choices call, NOT the extraction schema.
  **Now GROUPED BY MODE (2026-07-09):** the choices call returns `{speak,think,act,investigate}` →
  `suggested_actions_by_mode` (store field, persist v7, `normalizeActionsByMode` guard); the flat
  `suggested_actions` is a derived compat mirror. ActionBar is mode-first: pick a mode → see that mode's
  choices → click sends `[mode]: choice`. **Gotcha:** the grouped JSON is much bigger than a flat list —
  the choices call needs `max_tokens ≥ 500` + `response_format:json_object` or it truncates mid-JSON and
  ~half the turns silently fall back to the flat list. If a turn's grouped result is thin, route.ts seeds
  the 'act' mode from the flat list, and ActionBar auto-jumps to a populated mode, so the player never
  sees a blank choice set. The design intent is "fake freedom within bounds" (constraint > empty sandbox).
- **Vivid few-shot ✅ examples get parroted into the story (2026-07-08).** (Recurred in `buildChoicesPrompt`:
  concrete Thai ✅ examples like "ฟันโซ่ที่ล่ามประตู"/"จ่อมีดถามชื่อมันตรงๆ" got copied verbatim into scenes
  that loosely matched. Same fix: replace liftable example sentences with an abstract FORMULA + "never copy
  wording from this instruction". Lesson holds for EVERY prompt: examples teach shape, never payload.) After adding a ❌→✅ rewrite
  with a memorable concrete image ("รูปทรงเดียวกับที่สลักอยู่เหนือประตูบ้านเกิด") Typhoon copied that exact
  image into unrelated scenes (a crow's burn mark, a god-mode backlash). Root cause: concrete nouns in
  examples are liftable. Fix: examples must teach the TECHNIQUE with generic/placeholder payload (show the
  move via a body reaction, no unique noun) + an inline "examples illustrate technique only, don't reuse
  their imagery" note. Applies to every ❌/✅ pair in `buildNarrativePrompt` — keep them schematic.
- **The Thai-only decision (2026-07-08).** Language picker removed from `WorldCreationMenu`
  (`language` hardcoded 'ไทย'); the whole craft stack (Typhoon model + banned-phrase/particle rules) is
  Thai-tuned and can't be QA'd per-language. `WorldConfig.language` + the prompt's `${language}` plumbing
  intentionally KEPT (default ไทย) so pre-existing non-Thai localStorage saves don't force-switch. If
  re-adding a language, it needs a model suited to it AND its own banned-phrase list — don't just expose
  the picker again.
- **`[[SCENE]]` marker is variance-flaky, both directions (2026-07-08).** It leaked onto continuation turns
  (client strips it via the defensive split in the stream's `finishTurn`, so harmless) AND was occasionally
  omitted on first turns (~1/9, different opening each run → prologue shows inline). Fix: made the OUTPUT
  FORMAT rule symmetric — STRICTLY FORBIDDEN on any turn with [RECENT EVENTS], REQUIRED on the first turn.
  Continuation leaks gone; first-turn omission stays a low-rate variance the server tolerates.
- **How to battery-test narrative without the UI:** POST real turns straight to a running dev server's
  `/api/chat` (no auth → skips energy, still counts vs MAX_DAILY_TURNS=50) and read the NDJSON `response`
  chunks. Harness pattern used: scratchpad `narrative-battery.mjs` (worldConfig per genre + seeded history
  for non-first turns). Grep outputs for รู้สึก/ดูเหมือน, stray `[A-Za-z]`, and `[[SCENE]]` on turns 04+.
- (Add recurring problems + their fixes here as they're discovered, so future runs resolve them faster.
  Include: symptom → root cause → fix → file paths.)

---

## `/dev` system maintenance rules (process — NOT code gotchas)

> These govern the `/dev` tooling itself, not the product code. Diagnose/coder agents scanning for a
> code bug can ignore this section.

- **This system was ported from humanos-irpc and NOT yet exercised by a real run.** The tier pipeline,
  artifact-chaining (RESULT blocks + `runs/{slug}/NN-*.md`), and the agent prompts were written at
  design time on 2026-07-06; no live `/dev` run has exercised them here yet. On the **next real T1–T3
  run**, confirm: (1) each spawned agent ends with a proper `=== RESULT ===` block, (2) it wrote detail
  to `runs/{RUN_SLUG}/NN-*.md` (or the orchestrator persisted `01`/`02` for the read-only agents), and
  (3) downstream phases read prior work **by path**, not re-pasted. If an agent ignores the format,
  tighten the offending `steps/*.md` template. Remove this note once one full run confirms the flow.
- **Keep `project-map.md` and the danger-zone list current.** If routes/store/API move, or a new coupling
  as tight as the three danger zones appears, update `project-map.md` (+ its "verified" date) and the
  danger-zone lists in `long-term.md`, `dev.md`, and `agents/README.md` in the same change.
