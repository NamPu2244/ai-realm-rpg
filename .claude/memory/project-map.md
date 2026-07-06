# Project Map — ai-realm-rpg (Storyweave) — verified 2026-07-06

Ground-truth layout, scanned from the actual filesystem. Read this to pick which files a task touches;
it is cheaper than re-reading `CLAUDE.md` / `AGENTS.md` in full.

## Stack
Next.js App Router + React 19 + TypeScript + Tailwind CSS 4 + Zustand. One Groq-backed `/api/chat`
route. Supabase (`@supabase/ssr`, `@supabase/supabase-js`) for auth/marketplace/feedback/memories/admin.
Stripe for payments. `@xenova/transformers` present (client-side embeddings). Scene images via
`image.pollinations.ai`.

## Commands
- `npm run dev` — dev server at http://localhost:3000
- `npm run build` — production build · `npm run start` — start prod
- `npm run lint` — ESLint (flat config `eslint.config.mjs`, extends `eslint-config-next`)
- `npm run serve` — `bash scripts/serve.sh`
- **No test runner configured** (Playwright is a dependency but there is no `test` script / config).
- Quality gate for `/dev`: `npx tsc --noEmit` (primary) + `npm run lint` + `npm run build` (for
  routing/config changes).

## Routes (`src/app`)
- `/` — `page.tsx`: landing (AuthScreen / MainMenuDashboard) + Supabase session management.
- `/create` — `create/page.tsx`: `WorldCreationMenu`; sets `world_config` + clears `history` → `/play`.
- `/play` — `play/page.tsx` → `src/components/game/PlayScreen.tsx`: the game engine + Playing UI.
- `/store` — world marketplace. `/admin` — admin dashboard.
- `game_phase` (`'Auth'|'Dashboard'|'Menu'|'Playing'`) is the intent signal; `usePhaseSync`
  (`src/lib/phaseRoute.ts`) mirrors it to a route (`Menu`→`/create`, `Playing`→`/play`, else `/`).
  `template.tsx` fades each route in.

## API routes (`src/app/api`)
- `chat/route.ts` — **the game brain**. Streams NDJSON. Two-brain: `buildNarrativePrompt` (prose,
  streamed, high temp) + `buildExtractionPrompt` (JSON `game_state`, non-streamed, low temp) + a dice
  call on non-first turns (`[DICE RESULTS]`). Models swappable via `NARRATIVE_MODEL` / `EXTRACTION_MODEL`.
- `store/worlds/route.ts` + `store/worlds/[id]/route.ts` — world marketplace (public listing).
- `feedback/route.ts`, `memories/route.ts`.
- `admin/{stats,feedback,users}/route.ts` + `admin/users/[id]/{grant,revoke}/route.ts`.
- `stripe/checkout/route.ts`, `webhooks/stripe/route.ts`.

## State (`src/store/useGameStore.ts`)
Single Zustand store, persisted to localStorage as `storyweave-save`. Holds: `game_phase`,
`world_config` (language/genre/tone/character/custom details/opening seed — set once by
WorldCreationMenu), `player_status` (hp/mana/inventory/status_effects), `history`, `story_summary`,
`current_objective`, `current_image_prompt`, `suggested_actions`, `is_dead`. The AI-driven fields are
written each turn by `applyGameResult` (in `PlayScreen.tsx`) — not computed locally.

## Game loop (`src/components/game/PlayScreen.tsx`)
1. Empty `history` on `/play` → send opening "Begin the adventure." turn.
2. `runTurn` POSTs to `/api/chat` with the new prompt, last ~10 history entries, `player_status`,
   `story_summary`, `world_config`.
3. Response = streamed NDJSON: prose chunks shown as live typing, then `{done:true, game_state:{...}}`
   → `applyGameResult` writes state + the new history entry. First turn prose = `prologue [[SCENE]]
   narrative` (`SCENE_DELIM` in `gameText.ts`); client shows only the part after the marker.
4. Parse/network failure → error UI with a "retry" that replays the same `runTurn`.
5. Save/load = JSON export/import of the relevant store fields (+ automatic localStorage persistence).

## Other dirs
`src/components/{game,ui}`, `src/hooks`, `src/lib` (+ `src/lib/supabase`), `src/utils`,
`src/app/{admin,auth,create,play,store}`.

## Danger zones (wide blast radius — `/dev` gates edits to these)
1. `src/app/api/chat/route.ts` two-brain prompts + dice — prose rules vs state/schema rules live in
   different prompts.
2. Extraction `game_state` schema ↔ `useGameStore.ts` types ↔ `applyGameResult` — keep all three in sync.
3. The persisted `storyweave-save` store shape — breaking it breaks existing saves + JSON import.

## AI dependency
Requires `GROQ_API_KEY` in `.env.local` → `https://api.groq.com/openai/v1/chat/completions`. Without a
valid key, `/api/chat` fails and no turn renders. (See user memory `narrative-model-choice` for the
current model split.)
