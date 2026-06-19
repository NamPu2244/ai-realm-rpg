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

This is a text-based AI-driven RPG ("AI Realm") built with Next.js App Router, React 19, TypeScript, Tailwind CSS 4, and Zustand. The entire game runs as a single-page client app talking to one API route that proxies to the Groq LLM API.

### State management (`src/store/useGameStore.ts`)

A single Zustand store (persisted to localStorage as `ai-realm-save`) holds all game state:
- `game_phase`: `'Menu' | 'Playing'` — drives top-level UI in `page.tsx`
- `world_config`: language, genre, tone, character, custom world details, opening seed — set once at game creation by `WorldCreationMenu`
- `player_status`: hp/mana/inventory/status_effects — fully owned and updated by the AI's JSON responses, not computed locally
- `history`: chat log of player/GM turns
- `story_summary`, `current_objective`, `current_image_prompt`, `suggested_actions`: also driven entirely by AI responses each turn

### Game loop (`src/app/page.tsx`)

1. `WorldCreationMenu` collects `WorldConfig` and calls `handleStartGame`, which sets `game_phase: 'Playing'` and sends an initial "Begin the adventure." turn.
2. Every player action goes through `runTurn`, which POSTs to `/api/chat` with: the new prompt, last 10 history entries, current `player_status`, `story_summary`, and `world_config`.
3. The response is a streamed NDJSON stream (Groq SSE converted server-side to Ollama-compatible format); the client incrementally extracts the `narrative` field via regex for live "typing" display, then on stream completion parses the full JSON object (`extractAndParseJSON`) and writes `player_status`, `story_summary`, `current_objective`, `is_dead`, `current_image_prompt`, `suggested_actions`, and the new history entry back into the store.
4. On parse/network failure, the UI shows an error with a "retry" action that replays the same `runTurn` call.
5. Save/load is supported via JSON export/import of the relevant store fields, in addition to automatic localStorage persistence.

### AI integration (`src/app/api/chat/route.ts`)

- `buildSystemPrompt(worldConfig)` constructs a large system prompt that encodes: world setting/genre, tone-specific rules (`TONE_RULES` for hardcore/balanced/story/sandbox), language requirements, a D20 mechanic, and strict rules for keeping `player_status`, `story_summary`, and `current_objective` consistent with the narrative each turn.
- The full prompt (system prompt + story summary + recent history + current player status + new player action) is sent to Groq's `/openai/v1/chat/completions` endpoint with `stream: true`. The server-side handler transforms Groq's SSE format into Ollama-compatible NDJSON before piping to the client.
- **The AI must respond with a single JSON object matching a fixed schema** (`narrative`, `player_status`, `story_summary`, `current_objective`, `scene_image_prompt`, `is_dead`, `suggested_actions`). When modifying game mechanics, update this schema/prompt in `route.ts` and the corresponding types in `useGameStore.ts` and parsing logic in `page.tsx` together.

### Scene images

When the AI sets a non-empty `scene_image_prompt`, `page.tsx` renders an image via `https://image.pollinations.ai/prompt/...` using that prompt (appended with a fixed style suffix). This is an external, unauthenticated image generation service called directly from the client.

## Conventions

- UI strings are primarily in Thai; AI-facing prompt text and types are in English. New player-facing UI text should generally follow the existing Thai conventions unless `world_config.language` dictates otherwise.
- Styling uses Tailwind utility classes only, with a dark/neutral RPG aesthetic (`neutral-9xx` backgrounds, accent colors for HP/mana/status).
