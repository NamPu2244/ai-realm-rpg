# Flow Run — 2026-07-07 — thai-localization

- **Branch:** feat/thai-localization (merged to main)
- **Tier:** T2 (UI sweep — no danger zone, text-only)
- **Requested:** The game is Thai-first but the in-game UI chrome was English, breaking immersion.
  Localize the player-facing UI to Thai. User chose FULL scope + translate stat abbreviations too.
- **Status:** done. tsc clean; lint findings in touched files are all pre-existing (img/nested-ternary/
  set-state-in-effect), none from the text swaps.

## What was changed (14 components, text-only)
CharacterSidebar, MobileStatsDrawer, ActionBar, GameHeader, JournalModal, InventoryModal,
CharacterDossierModal, ChatHistory, QTEOverlay, EnergyModal, FeedbackModal, SettingsModal, SceneBanner,
PlayScreen (error/confirm/alert/aria copy). Removed now-pointless `uppercase` on Thai-only labels.

## Decisions
- **No i18n framework.** Single-language (Thai) launch → direct Thai strings, not a dictionary. Revisit
  only if `world_config.language` ever needs to drive the UI (multi-language ship). Flagged to user.
- **Stat abbreviations translated** (user overrode the "keep STR/DEX" suggestion) — chose SHORT Thai to
  fit the tight 3-col attribute grid.
- Left English on: the **STORYWEAVE** brand, the `[[SCENE]]`/`[ทอยเต๋า]`/`Begin the adventure.` AI-facing
  signals, technical error `detail` strings, `gsk_...` placeholder, and dead `ACTION_STYLES.label`
  (Combat/Explore/…) which is not rendered anywhere.

## Glossary (KEEP CONSISTENT for any new in-game UI string)
- Stats: STR→พลัง · DEX→ว่องไว · INT→ปัญญา · CON→อึด · WIS→สติ · CHA→เสน่ห์
- HP→พลังชีวิต · Mana→พลังเวท · Gold→ทอง · EXP→ปสก. · Level→เลเวล · Lives→ชีวิต
- Vitals→ค่าชีพ · Attributes→ค่าพลัง · Progression→ความก้าวหน้า · Objective→เป้าหมาย
- Companions→เพื่อนร่วมทาง · Factions→ฝ่าย · Conditions→สภาวะ · Skills→ทักษะ · Inventory→สัมภาระ
- Quests→ภารกิจ · Active Threads→เรื่องค้างคา · urgency low/med/high/critical→ต่ำ/ปานกลาง/สูง/วิกฤต
- Modes: Speak→พูด · Think→คิด · Act→ทำ · Investigate→สำรวจ · No Response→นิ่งเฉย
- Send→ส่ง · Cancel→ยกเลิก · Save→บันทึก · Close→ปิด · Retry→ลองใหม่ · new→ใหม่ · permadeath→ตายถาวร

## Reusable lesson
- Glossary above is promoted to gotchas.md so future strings stay consistent.
