# Flow Run — 2026-07-07 — qte-never-fires

- **Branch:** main
- **Tier:** T1 (bug report → diagnosis showed no code bug; fix is prompt tuning in a danger zone)
- **Requested:** "QTE ไม่ขึ้นเลย" — the Quick-Time-Event overlay never appears in play.
- **Status:** done (extraction side verified via API; narrative side needs live-play confirmation).

## Root cause (NOT a code bug)
- Plumbing is correct end-to-end: extraction emits `is_qte_active`/`qte_time_limit`/`qte_options` →
  `applyGameResult` (PlayScreen.tsx:252-254) writes them → store has fields/defaults → render gate
  `is_qte_active && !isLoading` (PlayScreen.tsx:883) → `QTEOverlay`. All verified by reading.
- scout-17b CAN trigger QTE: tested the REAL full `buildExtractionPrompt` via API — an obvious
  sudden-attack narrative → `is_qte_active: true`; a slow-menace cliffhanger (like the user's screenshot)
  → `false` (correct per the old rule).
- **Real cause:** a two-brain coordination gap. The NARRATIVE (Typhoon) writes tension/menace/decision
  cliffhangers ("a figure already moving") but never commits to an in-motion lethal strike, so the
  extraction correctly never sees a QTE. The narrative prompt's DILEMMA PRESSURE produced *decision*
  urgency (→ suggested_actions), never *reflex* urgency (→ QTE).

## Fix (both danger-zone prompts in route.ts; user-approved)
- **Narrative prompt** — added REFLEX-ATTACK BEATS rule: on a genuine ambush/split-second assault
  (blade mid-swing at the player, beast lunging, incoming arrow/trap), commit to the attack as already
  in motion and cut on the heartbeat BEFORE impact ("…พุ่งเข้าหาลำคอของเจ้าแล้ว—"), don't narrate whether
  it lands. Reserved for true physical reflex moments, not conversation/slow menace.
- **Extraction prompt** — broadened the QTE trigger to fire when the narrative ENDS ON an attack already
  in motion toward the player (impact not yet shown), while still staying `false` for tension / decision
  cliffhangers (those get suggested_actions).

## Verification
- Re-ran the full extraction prompt via API after the edit: menace cliffhanger → `false` (no false
  positive); "attack in motion, impact not shown" → `true`, limit 3, threat-fitting options. tsc +
  route.ts lint clean.
- **Pending:** live play — reach a combat/ambush beat and confirm Typhoon now writes the reflex ending
  and the QTE overlay fires. (Needs GROQ + Typhoon keys; qualitative.)

## Danger zones touched
- `/api/chat` two-brain prompts (narrative + extraction). No JSON schema / store / applyGameResult /
  render change — the plumbing was already correct.

## Reusable lesson (promote to gotchas.md?)
- Yes — "QTE not firing is usually the narrative not writing reflex-attack beats, not broken plumbing;
  the two brains must be tuned together." Promoted to `gotchas.md`.
