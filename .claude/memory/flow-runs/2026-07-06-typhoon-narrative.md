# Flow Run — 2026-07-06 — typhoon-narrative

- **Branch:** main
- **Tier:** T2 (feature — decouple the narrative endpoint; danger zone, user-approved)
- **Requested:** Fix the Thai word-garbling by routing the storyteller call to Typhoon (SCB10X,
  Thai-specialized) instead of a Groq general model.
- **Status:** integration done + API smoke-test PASS; live in-app turn confirmation pending.

## What was built / changed
- `src/app/api/chat/route.ts` — the narrative (streaming) call can now target a separate
  OpenAI-compatible endpoint via `NARRATIVE_BASE_URL` (+ `NARRATIVE_API_KEY`). Added
  `useNarrativeOverride`/`narrativeUrl`/`narrativeHeaders`; the initial fetch AND the 429-retry fetch
  use them. Extraction + dice stay on Groq (`inferenceUrl`/`requestHeaders`, untouched). Error string
  generalized "Groq API" → "Narrative API". Fully backward-compatible: unset the env → old Groq path.
- `.env.local` — `NARRATIVE_MODEL=typhoon-v2.5-30b-a3b-instruct`,
  `NARRATIVE_BASE_URL=https://api.opentyphoon.ai/v1`, `NARRATIVE_API_KEY=<Typhoon key>`. qwen kept as a
  commented fallback.

## Verification
- **API smoke-test (curl, non-streaming, Thai dungeon opening):** PASS. `finish_reason: stop`,
  `max_tokens` accepted, NO `<think>` leak, fluent coherent Thai with zero garbled tokens (vs qwen's
  "ยิคมด" / gpt-oss's "ศากาศ/ครีบไม้"). Auto paragraph-breaks even without our full prompt.
- **Pending:** a real in-app turn (dev server restart required to reload env) — checks the ~6.4K-token
  real prompt against the model's context window, streaming SSE parse, and extraction still on Groq.

## Decisions
- **Decouple only the narrative call**, not the whole pipeline: Typhoon is worth it for prose, but
  extraction (structured JSON) is fine/cheaper on Groq scout-17b. Keeps the two-brain split intact.
- `typhoon-v2.5-30b-a3b-instruct` id has no "qwen" substring → the Groq `reasoning_effort:'none'` guard
  doesn't apply; smoke-test showed no think-leak so none needed. Watch if a future Typhoon model thinks.

## Danger zones touched
- **`/api/chat` inference routing** (`route.ts`). User-approved (they opened the Typhoon account and
  supplied the key). No prompt-text, schema, store, or dice change — only which URL/key the narrative
  fetch uses. Extraction↔store contract untouched.

## Update — temperature tuning (same day)
- First real in-app turn: Typhoon wrote fluent Thai BUT disobeyed the banned-phrase / show-don't-tell
  rules ("คุณรู้สึกเหงื่อออก", "คุณรู้สึกหวาดกลัวและสับสน" — dictating feelings) and still had 2 minor
  glitches ("เอควันควัน", "30 เรื่อง" wrong classifier). Root cause: our narrative temp (0.85–0.95, tuned
  for Groq) is too hot for Typhoon (a3b MoE, its own default is 0.6).
- **Fix:** made narrative sampling endpoint-aware in `route.ts` — when `useNarrativeOverride`, temp =
  0.7 first turn / 0.6 after, plus `top_p: 0.6`. Groq path unchanged (0.95/0.85). Verified via curl at
  temp 0.6/top_p 0.6 with a firm banned-phrase system prompt: ZERO banned words, emotion shown through
  the body ("มือที่กำแน่นกับราวเหล็กสั่นไม่หยุด"), no garble. tsc + route.ts lint clean.
- Only one text/instruct model exists on this Typhoon tier (`typhoon-v2.5-30b-a3b-instruct`); the rest
  are OCR/ASR. So temperature (not a bigger model) was the available lever.

## Follow-ups / still pending
- **Live in-app turn AT THE NEW TEMP** to confirm the banned-phrase obedience holds with the full 6.4K
  prompt, that context fits (~6.4K + 1600 out), and streaming/extraction still work.
- **SECURITY:** the Typhoon API key was pasted into chat → treat as exposed; user should ROTATE it at
  opentyphoon.ai after testing. `.env.local` is gitignored (verified).
- Re-tune prompt if Typhoon needs it (e.g. banned-phrase adherence — the minimal smoke prompt let one
  "รู้สึก" through, but the real prompt bans it hard; check in live play).

## Reusable lesson (promote to gotchas.md?)
- Covered by the existing narrative-model gotcha (updated) + user memory `narrative-model-choice`.
  Key mechanic worth remembering: the narrative endpoint is now env-swappable independent of Groq via
  `NARRATIVE_BASE_URL`/`NARRATIVE_API_KEY`.
