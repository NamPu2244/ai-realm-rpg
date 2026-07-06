# Agents — ai-realm-rpg (Storyweave)

Sub-agents used by the `/dev` orchestrator, one markdown file per agent. Project agents (here) take
precedence over user-global agents (`~/.claude/agents/`) with the same name, so this folder is the
single source of truth for this repo. Unlike some setups, `.claude/` here is **NOT gitignored** — these
are committed and team-shared. Adapt the copy *here* for this project.

## Agents by workflow

### Feature pipeline — used by `/dev` T2/T3
| Agent | Role |
|-------|------|
| `product-requirements-analyst` | Turns an idea into a PRD / user stories (Thai) |
| `system-architect` | Blueprint: layers, state/schema plan, Supabase model, file list (Thai) |
| `senior-fullstack-coder` | Implements client / store / API / prompt code (all tools) |
| `qa-test-engineer` | Verification matrix + opt-in pure-logic tests (no runner in repo) |
| `storyweave-code-reviewer` | Reviews recently changed code; does not rewrite (Thai) |

### Bug fix — used by `/dev` T0/T1
| Agent | Role | Tools |
|-------|------|-------|
| `bug-root-cause-analyst` | **Read-only** root-cause diagnosis across the game loop / prompts / API routes | Read/Grep/Glob/Bash |
| `supabase-inspector` | **Read-only** Supabase (Postgres) inspection to confirm data shape | Read/Grep/Glob/Bash |
| `senior-fullstack-coder` | Applies the surgical fix (shared with the pipeline) | all |
| `ui-verifier` | Launches the app (:3000), reproduces steps via Playwright, PASS/FAIL + screenshots | all |

## Danger zones (why several agents keep repeating this)
This app couples the AI to game state tightly. Three areas have wide blast radius and every agent is
told to flag / gate them:
1. The `/api/chat` two-brain prompts (`buildNarrativePrompt` / `buildExtractionPrompt` + dice).
2. The extraction `game_state` JSON schema ↔ `src/store/useGameStore.ts` types ↔ `applyGameResult` in
   `src/components/game/PlayScreen.tsx` — these three must stay in lockstep.
3. The persisted `storyweave-save` Zustand shape (breaking it breaks existing saves + JSON import).

## Not agents
- `.claude/dev/steps/*.md` are **prompt templates** the orchestrator feeds to the agents above.
- `.claude/commands/dev.md` is the **orchestrator** (the `/dev` skill).

## Language
The user is a Thai speaker: agents reply in Thai (code/identifiers stay English). All **persisted
memory** (`.claude/memory/`) is written in **English** — portable and greppable.
