# Presentation Convention — Progress Table & Approval Block

**Every `/dev` and future multi-step command uses this exact format** so the user always knows
(a) where we are and (b) what they're being asked to approve — in plain language, not raw commands.
Talk to the user in Thai; keep the table headers/glyphs as below. Keep cells terse so the table
renders cleanly in a terminal.

---

## 1. Progress Table (render after EVERY step)

Re-print the whole table each time a step's status changes, so the latest state is always the
newest thing on screen. Lead it with a title line showing the command, the tier/mode, and
`current/total`.

```
### /dev · 🔴 T1 Fix — Step 2/6

| # | Stage      | Details                                  | Status | Remark                          |
|---|------------|------------------------------------------|--------|---------------------------------|
| 0 | Context    | Read memory + git state                  | ✅     | branch main · 1 lesson           |
| 1 | Diagnose   | Find root cause (read-only)              | ✅     | extraction schema drift          |
| 2 | Fix        | Apply the smallest change                | ⏳     | in progress…                     |
| 3 | Verify     | Confirm on the real UI                   | ⬜     | —                               |
| 4 | Review     | Code review (if non-trivial)             | ⬜     | —                               |
| 5 | Wrap-up    | Summary + update memory                  | ⬜     | —                               |
```

**Columns:** **#** step number · **Stage** short name · **Details** one plain sentence · **Status**
one glyph · **Remark** one-line result/finding once known (`—` until then).

**Status legend:** ⬜ pending · ⏳ in progress · ✅ done · ⏸️ waiting for you · ⏭️ skipped · ❌ failed/blocked

- Exactly one row is ⏳ or ⏸️ at a time.
- `Step n/N`: `N` = rows in the table for the chosen tier; `n` = the active (or just-completed) row.
- `TodoWrite` may back it, but this table is the user-facing view; always show it.

---

## 2. Approval Block (whenever you need a "yes")

When a step will change files, run a mutating command, or otherwise needs the user's go-ahead, DO
NOT paste the raw command as the ask. Show this block. Put the row's Status at ⏸️.

```
### ⏸️ ขอ OK ก่อนนะ — Step 2/6: Apply the fix

**จะทำอะไร** — เพิ่มการ trim ค่าว่างในการ์ด suggested_actions ให้ปุ่มที่ AI ส่งมาว่างไม่โผล่
**ที่ไหน** — `src/components/game/PlayScreen.tsx` · 1 ไฟล์ ~3 บรรทัด · ไม่แตะ danger zone
**ทำไม** — เป็น root cause ที่ diagnosis เจอ
**ความปลอดภัย** — ยังไม่ commit/push ย้อนกลับได้

**ตอบ:** `yes` = ทำเลย · `no` = ข้ามขั้นนี้ · `edit` = ขอแก้ก่อน
```

Rules for the block:
- Lead with **จะทำอะไร (What I'll do)** in everyday language.
- Always include **ความปลอดภัย (Safety)** — what's reversible, whether anything is pushed/committed.
- Never bury the ask inside a paragraph. The `ตอบ:` line is always last.
- If several changes are bundled, list them as short bullets under **จะทำอะไร**.
- Offer `yes` / `no` / `edit` at minimum. Add `yes to all` only when several same-kind steps queue.
- Danger-zone edits (`/api/chat` prompts, extraction schema ↔ store types, persisted store shape)
  ALWAYS get an Approval Block — never edit them silently.

---

## 3. Final Summary (end of a run)

Close with the completed Progress Table (all rows ✅/⏭️) plus a compact result block — the
one-glance "what happened + what's left for you". Render the finished table first.
