# Project Memory — ai-realm-rpg (Storyweave)

Project-scoped memory for Claude Code, living alongside this repo. **Note: `.claude/` here is NOT
gitignored**, so this memory is committed and **team-shared** — write it as durable knowledge for
whoever works on this repo, in **English**.

## Structure

| Path | What it holds | When to write |
|------|---------------|---------------|
| `gotchas.md` | **The `/dev` learning-loop source** — recurring bugs/pitfalls as symptom → root cause → fix → paths. STEP 0 reads THIS to seed "Relevant past lessons". | When a problem could recur across future work. |
| `project-map.md` | Filesystem-verified layout: routes, store, API routes, the game loop, danger zones, commands. Cheap ground-truth orientation. | When the layout changes; keep the "verified" date current. |
| `long-term.md` | Durable architecture & conventions knowledge (NOT gotchas). | When a durable architecture/convention fact is worth pinning. |
| `flow-runs/` | One dated file per `/dev` run — a changelog of what was built/fixed, decisions, and problems hit + how solved. | At the end of every `/dev` run (Update-memory step). |
| `flow-runs/INDEX.md` | One grep-able line per run (date · slug · tier · hook). STEP 0 greps this instead of skimming full logs. | Add a row whenever a new run log is written. |
| `flow-runs/TEMPLATE.md` | The template each run file follows. | — |
| `reports/` | Verification reports (QA matrix + `ui-verifier` verdict) for non-trivial runs; `reports/assets/<slug>/` holds screenshots. | Non-trivial runs, during Verify + Update-memory. |
| `runs/` | Transient per-run artifact workspace (`{RUN_SLUG}/01-diagnosis.md` … `07-review.md`). Working files, not the permanent record. | Created by `/dev` STEP 0.4; optional to clean up. |

## How to use it (read order)
1. Read `gotchas.md` (+ `git status`) at the start of any task; add `project-map.md` + `long-term.md`
   for a build (T2/T3). Grep `flow-runs/INDEX.md`; open a full run log only if a hook matches.
2. When you solve a problem that could recur, **promote the lesson to `gotchas.md`** (don't leave it
   buried only in a run log).

## Relationship to user memory
- **User memory** (`~/.claude/projects/-Users-nampu-ai-realm-rpg/memory/`) = personal prefs, the
  narrative/extraction model choice, per-user notes.
- **Project memory** (this folder) = knowledge tied to THIS codebase, committed + team-shared.
- Codebase-fact → here. Individual-user/workflow fact → user memory. Cross-reference when useful.
