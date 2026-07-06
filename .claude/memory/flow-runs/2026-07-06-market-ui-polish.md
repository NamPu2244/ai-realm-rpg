# 2026-07-06 — market-ui-polish

- **Tier:** T2 Screen (started as T0 UI-consistency audit → escalated on user request).
- **Branch:** `fix/all-ui-theme`.
- **Request (Thai):** "check all UI ว่ามันไปในทางเดียวกันไหม … market ยังไม่สมบูรณ์ในด้าน ui".

## Audit finding (the "same direction?" answer)
All menu/chrome screens (Auth, MainMenu, WorldCreation, store list, store detail) already share
one palette — near-black `#07050a`/`neutral-950` + amber/orange accents + radial-gradient
atmosphere. That part is consistent (the `fix/all-ui-theme` branch's win). The genre `--theme-*`
token system in `globals.css` is intentionally **in-game only** (PlayScreen/ActionBar); menu+store
are deliberately the fixed amber brand — not a bug.

The Market felt "unfinished" for concrete reasons, top 3 fixed:
- **A.** Store header search box was a dead decorative input (no state/onChange).
- **B.** `/store/[id]` detail was far barer than the list (no top bar/energy/brand, single-layer bg).
- **C.** `PublishModal` was a hand-rolled `fixed inset-0` overlay with its own `popIn/fadeIn`
  keyframes, while the delete dialog used the shared `ui/Modal` — two modal standards in one page.

## What was done
- `src/components/ui/Modal.tsx`: exported the base `Modal` + added `size?: "sm"|"lg"` (lg = max-w-lg,
  p-7, no forced `space-y`; sm unchanged so existing Alert/Confirm are byte-identical).
- `src/app/store/page.tsx`: added `query` state + `useMemo` client filter (title + trope tags,
  case-insensitive); wired the header input + an X clear button; hero suppressed while querying;
  search-aware empty hint. Migrated `PublishModal` onto `<Modal size="lg">` and removed the now-orphan
  `fadeIn`/`popIn` keyframes from the page `<style>` (kept `floatGlow`).
- `src/app/store/[id]/page.tsx`: added the list page's two animated `floatGlow` blobs + a top bar
  (Back to Store · STORYWEAVE/World Store brand · energy pill).

## Gate + verify
- `tsc --noEmit` clean; lint clean on all 3 edited files (repo's 4 pre-existing errors + 75 warnings
  are in untouched files: SettingsModal, phaseRoute, embeddings).
- ui-verifier: **PASS** on A/B/C against real data (Supabase returned 7 worlds, guest session).
  Screenshots under `reports/assets/2026-07-06-market-ui-polish/`.

## Out of scope (left for later)
Coins-balance display / premium-vs-coins reconciliation (economy half-surfaced); migrating in-game
modals (Inventory/Settings/Energy/Feedback/Dossier) to shared Modal; Eye-vs-players metric wording.

## Lesson promoted
gotchas.md: hand-rolled modals are scattered — prefer the shared `ui/Modal` (now supports `size`).

## Follow-up pass (same day) — commits 034a2ec + 5fe33f1
User asked to commit and continue the 3 "out of scope" items:
- **Modal unification (now COMPLETE — commit 6980cc9):** added `size="md"` then a `framed` variant
  (unpadded ≤85vh flex-column for header + scroll body) to `ui/Modal`. Migrated ALL app modals off
  bespoke overlays: store PublishModal + in-game Energy/Feedback/Settings/Inventory/CharacterDossier.
  Inventory kept its Escape handler; it traded a bespoke slide-in for the standard `animate-modal-pop`.
  Every dialog in the app now shares one backdrop + pop animation + amber panel.
- **Metric wording:** store `player_count` icon `Eye`→`Users` (list + detail) so it reads "players".
- **Coins (BLOCKED — needs product decision):** the store prices worlds in "coins" (`price_coins`,
  Coins badge) but the data model has **no coins wallet** — `useGameStore` only tracks `energy`
  (`energy_balance` in Supabase). So there's no balance to display and premium-vs-coins can't be
  reconciled until the currency exists. Options surfaced to user: (a) reuse `energy` as the spend
  currency, (b) build a real `coins` balance (store field + Supabase column + top-up), or
  (c) hide coin pricing until the economy ships. **User chose (c)** → commit b27258c: dropped the
  Coins price badge (list + detail) and swapped the Publish coin-price input for a "Mark as Premium"
  toggle; marketplace pricing is now Free/Premium only. `price_coins` column + POST field retained
  (sent as 0) so re-enabling coins later needs no schema change. tsc + store-file lint clean.
- Gate: tsc clean; lint — only pre-existing errors remain (SettingsModal `set-state-in-effect`
  confirmed present on HEAD before the change; the 4 repo errors + warnings are all in untouched
  logic). In-game modal migration verified via tsc/lint + parity with the already-browser-verified
  PublishModal pattern (a live /play session is Groq-gated, so not re-run through ui-verifier).
