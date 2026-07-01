@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start dev server at http://localhost:3000
- `npm run build` — production build
- `npm run start` — start production server
- `npm run lint` — run ESLint (flat config in `eslint.config.mjs`, extends `eslint-config-next`)

There is no test suite configured.

### AI dependency

The game's AI features require a `GROQ_API_KEY` in `.env.local`. Requests go to `https://api.groq.com/openai/v1/chat/completions` using the `meta-llama/llama-4-scout-17b-16e-instruct` model. Without a valid key, `/api/chat` requests will fail.

## Architecture

This is a text-based AI-driven RPG ("Storyweave") built with Next.js App Router, React 19, TypeScript, Tailwind CSS 4, and Zustand. The game talks to one API route (`/api/chat`) that proxies to the Groq LLM API. On top of the game there are also auth, an admin dashboard, feedback, memories, and Stripe payment routes.

### Routing (`src/app`)

The game is split across three top-level routes that share the Zustand store (so navigation never loses state):
- `/` ([page.tsx](src/app/page.tsx)) — landing: renders `AuthScreen` or `MainMenuDashboard`, and owns Supabase session management.
- `/create` ([create/page.tsx](src/app/create/page.tsx)) — `WorldCreationMenu`; on start it sets `world_config` + clears `history`, then routing carries the player to `/play`.
- `/play` ([play/page.tsx](src/app/play/page.tsx) → [PlayScreen.tsx](src/components/game/PlayScreen.tsx)) — the game engine + Playing UI; detects a fresh world (empty `history`) and kicks off the opening turn.

`game_phase` stays the store's source-of-truth "intent" signal; `usePhaseSync` in [phaseRoute.ts](src/lib/phaseRoute.ts) mirrors it to a URL (`Menu`→`/create`, `Playing`→`/play`, else `/`), so setting `game_phase` from anywhere (store actions, dashboard, auth) navigates. [template.tsx](src/app/template.tsx) fades each route in on navigation.

### State management (`src/store/useGameStore.ts`)

A single Zustand store (persisted to localStorage as `storyweave-save`) holds all game state:
- `game_phase`: `'Auth' | 'Dashboard' | 'Menu' | 'Playing'` — intent signal mirrored to a route by `usePhaseSync` (see Routing above)
- `world_config`: language, genre, tone, character, custom world details, opening seed — set once at game creation by `WorldCreationMenu`
- `player_status`: hp/mana/inventory/status_effects — fully owned and updated by the AI's JSON responses, not computed locally
- `history`: chat log of player/GM turns
- `story_summary`, `current_objective`, `current_image_prompt`, `suggested_actions`: also driven entirely by AI responses each turn

### Game loop (`src/components/game/PlayScreen.tsx`)

1. `WorldCreationMenu` (on `/create`) collects `WorldConfig` and calls `handleStartGame`, which sets `world_config` + `game_phase: 'Playing'` with an empty `history`; the player is routed to `/play`, where `PlayScreen` detects the empty history and sends the initial "Begin the adventure." turn.
2. Every player action goes through `runTurn`, which POSTs to `/api/chat` with: the new prompt, last 10 history entries, current `player_status`, `story_summary`, and `world_config`.
3. The response is a streamed NDJSON stream (Groq SSE converted server-side). Each `{response}` chunk is now **pure narrative prose** (no JSON wrapper) and is shown directly as live "typing". When the prose stream finishes, the server runs a second "extraction" call and delivers the structured game state once at the end as `{done:true, game_state:{...}}`; the client reads `game_state` (with `narrative`/`prologue` merged in by the server) and writes `player_status`, `story_summary`, `current_objective`, `is_dead`, `current_image_prompt`, `suggested_actions`, and the new history entry back into the store. On the first turn the prose is `prologue [[SCENE]] narrative` (`SCENE_DELIM` in `gameText.ts`); the client only displays the part after the marker.
4. On parse/network failure, the UI shows an error with a "retry" action that replays the same `runTurn` call.
5. Save/load is supported via JSON export/import of the relevant store fields, in addition to automatic localStorage persistence.

### AI integration (`src/app/api/chat/route.ts`)

- **Two-brain architecture** — each turn runs two specialized LLM calls so neither competes for the model's attention:
  - `buildNarrativePrompt(worldConfig)` — "the storyteller". Encodes world/genre, `TONE_RULES`, language, D20-in-prose, continuity, and all the narrative-craft rules (show-don't-tell, banned phrases, hooks, NPC grit, few-shot ❌/✅ examples). It streams **pure prose only** — no JSON, no stat math. Temperature is high (0.85–0.95). Swap its model via `NARRATIVE_MODEL` env.
  - `buildExtractionPrompt(worldConfig)` — "the rules engine". Receives the finished prose in a `[NARRATIVE JUST WRITTEN]` block and emits the structured `game_state` JSON (player_status, quests, factions, companions, qte, countdown, suggested_actions, etc.). Non-streaming, low temp (0.2), `response_format: json_object`, parsed server-side by `parseJsonObject`. Swap its model via `EXTRACTION_MODEL` env.
- There is also a **Phase 1 dice call** (`buildDiceSystemPrompt`, function-calling) before the narrative on non-first turns; its results are injected into both later prompts as `[DICE RESULTS]`.
- **When modifying game mechanics**: prose-affecting rules go in `buildNarrativePrompt`; state/schema rules go in `buildExtractionPrompt`. Keep the extraction JSON schema in sync with the types in `useGameStore.ts` and `applyGameResult` in `PlayScreen.tsx`.

### Scene images

When the AI sets a non-empty `scene_image_prompt`, `PlayScreen.tsx` renders an image via `https://image.pollinations.ai/prompt/...` using that prompt (appended with a fixed style suffix). This is an external, unauthenticated image generation service called directly from the client.

## Conventions

- UI strings are primarily in Thai; AI-facing prompt text and types are in English. New player-facing UI text should generally follow the existing Thai conventions unless `world_config.language` dictates otherwise.
- Styling uses Tailwind utility classes only, with a dark/neutral RPG aesthetic (`neutral-9xx` backgrounds, accent colors for HP/mana/status).
