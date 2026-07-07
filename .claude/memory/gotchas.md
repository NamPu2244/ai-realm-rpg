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
