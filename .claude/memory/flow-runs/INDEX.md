# Flow-runs index

One line per `/dev` run — the orchestrator greps THIS during STEP 0 instead of skimming full logs.
Open a full `YYYY-MM-DD-slug.md` only when a line below clearly matches the current task.
**When you write a new flow-run log, add its line here too** (newest at top).

| Date | Slug | Tier | Hook (what it was + status) |
|------|------|------|------|
| 2026-07-07 | inline-markdown-emphasis | T2 | Deferred "step 2": `renderInline` in NarrativeRenderer for **bold**/*italic* + sparing EMPHASIS prompt rule. Fixes raw `*คราง*`. Regex + live verified. |
| 2026-07-07 | qte-never-fires | T1 | "QTE ไม่ขึ้น" — NOT a code bug (plumbing correct, scout can trigger). Cause: narrative writes menace not reflex-attacks. Fixed both prompts (narrative REFLEX-ATTACK BEATS + broadened extraction trigger). API-verified. Live-play pending. |
| 2026-07-06 | typhoon-narrative | T2 | Routed narrative call to Typhoon (Thai-specialized) via new `NARRATIVE_BASE_URL`/`NARRATIVE_API_KEY` decouple in `route.ts`; extraction stays Groq. API smoke-test PASS (fluent Thai, no garble). tsc clean. Live in-app turn pending. |
| 2026-07-06 | double-submit-guard | T1 | Fixed suggested-action double-submit (async `isLoading` race) with a synchronous `inFlightRef` lock in `handleSend`. tsc+lint clean. Live-confirm pending. Also: gpt-oss-120b narrative A/B FAILED → reverted to qwen. |
| 2026-07-06 | narrative-pacing-actions | T2 | Prompt-craft: added VISUAL PACING (break wall-of-text into short paras) + evocative suggested_actions in `route.ts`. tsc clean. Step 2 (bold/italic renderer) deferred. |
| 2026-07-06 | market-ui-polish | T2 | UI audit → fixed store search(dead input)/detail-parity/PublishModal→shared Modal. tsc+lint clean, ui-verifier PASS. |
| — | (no runs yet) | — | The `/dev` system was set up 2026-07-06; first run pending. |
