# /dev artifact-chaining contract (shared)

> Referenced by every `steps/*.md` template and by `dev.md`. Holds the rules that are **identical
> across phases**, so each step template states only its own inputs, artifact name, and procedure.
> Read this once; templates point here instead of repeating it.

## Why this exists

`/dev` runs each phase as a **spawned sub-agent** (via the Agent tool). A sub-agent's final message
returns to the orchestrator as the tool result and **stays in the orchestrator's context**. If every
agent returns its full report inline, the orchestrator's context balloons with each phase and the
same detail gets re-pasted into the next agent's prompt.

**Artifact chaining fixes that:** each phase writes its full detail to a `.md` file on disk and
returns **only a short RESULT block** (summary + the artifact path). The orchestrator keeps just that
block, and passes the **path** to the next phase — which reads the file itself, cold.

## The run workspace

The orchestrator fixes `RUN_DIR = .claude/memory/runs/{RUN_SLUG}/` in STEP 0.4 and `mkdir -p`s it.
Every phase writes its detail artifact there, zero-padded by pipeline order:

```
RUN_DIR/
  01-diagnosis.md        (bug-root-cause-analyst — orchestrator-persisted, see exception)
  02-inspect-db.md       (supabase-inspector — orchestrator-persisted, see exception)
  03-requirements.md     (product-requirements-analyst, or the orchestrator's inline T2 spec)
  04-architecture.md     (system-architect)
  05-implementation.md   (senior-fullstack-coder — fix or feature)
  06-qa.md               (qa-test-engineer)
  07-review.md           (storyweave-code-reviewer)
  # ui-verifier writes its verdict inline; screenshots go to reports/assets/{RUN_SLUG}/
```

These are **transient working files** — the permanent record is the `flow-runs/` log + the
`reports/` verification report. The orchestrator passes each phase the exact `{{ARTIFACT_PATH}}` to
write and the `{{PRIOR_ARTIFACTS}}` paths to read. `RUN_DIR` may be left in place or cleaned up.

## The RESULT block (every phase ends with this)

The sub-agent's **final message** is ONLY this block — not the full report (that went to the file):

```
=== RESULT ===
status: success | blocked | partial
artifact: <path to the full-detail .md this phase wrote>   # or "orchestrator-persist" (read-only agents)
summary: <the essentials the orchestrator needs to route + report to the user — aim ≤ 10 lines>
next: <phase-name> | NONE
notes: <decisions, assumptions, blockers, questions for the user>
```

- Individual phases **add their own fields** (e.g. `verify:`, `changed-files:`) — see each template.
- `status: blocked`, or a question in `notes`, tells the orchestrator to **stop and surface it to
  the user** — don't guess.

## Read-by-path, don't expect a paste

When a template gives you `{{PRIOR_ARTIFACTS}}` (paths + one-line summaries), **read the files you
need yourself**. Read only the artifacts your phase actually depends on (e.g. the coder reads
`04-architecture.md`; the reviewer reads `05-implementation.md`).

## Exception — read-only agents can't write

`bug-root-cause-analyst` and `supabase-inspector` have no `Write` tool. They **return their full
report inline** with `artifact: orchestrator-persist`. The **orchestrator** then writes that report
to `RUN_DIR/01-diagnosis.md` / `02-inspect-db.md` and forwards the path to the next phase.

## Orchestrator responsibilities

1. STEP 0.4 — fix `RUN_SLUG`, set `RUN_DIR`, `mkdir -p` it.
2. Each phase — pass `{{ARTIFACT_PATH}}` (where to write) + `{{PRIOR_ARTIFACTS}}` (paths to read).
3. On a read-only phase — persist the returned report to its artifact file yourself.
4. Hold only each phase's RESULT `summary` + `artifact` path in context; forward the **path**.
5. Honor the RESULT block: `blocked`/question → stop & surface; `next` → run it; `NONE` → done.
