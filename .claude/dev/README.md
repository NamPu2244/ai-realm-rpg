# `.claude/dev/` — prompt templates for the `/dev` orchestrator

The `/dev` orchestrator (`.claude/commands/dev.md`) is the **single entry point** for all
development work on Storyweave. It classifies each request into a tier and runs the right-sized
pipeline:

| Tier | Trigger | Steps used (from `steps/`) |
|------|---------|----------------------------|
| 🔵 T0 Investigate | a question / diagnosis, no change wanted | `diagnose` and/or `inspect-db` → answer (read-only) |
| 🔴 T1 Fix | bug / defect | `diagnose` (+`inspect-db`†) → `implement-fix` → `verify` → `review`* |
| 🟡 T2 Screen | one new/changed page or component | (`requirements`*) → `implement-feature` → `verify` → `review` |
| 🟢 T3 Feature | new system / API + UI + store | `requirements` → `architecture` (+`inspect-db`†) → `implement-feature` → `qa` → `review` → `verify` |

\* = conditional (only when non-trivial / ambiguous). † = when the work depends on real Supabase
data shape. **T1** also has a *trivial fast-path*: obvious tiny fixes are applied inline (no
diagnose/coder agents), then gated + verified.

The files in `steps/` are **prompt templates**, not agent definitions. The orchestrator reads one,
fills its placeholders with the previous step's output (paths), and passes the body as the prompt
to a sub-agent.

| Template (`steps/`) | Fed to agent | Produces |
|---------------------|--------------|----------|
| `diagnose.md` | `bug-root-cause-analyst` | root-cause report + smallest fix location (read-only) |
| `inspect-db.md` | `supabase-inspector` | real Supabase data shape via read-only query |
| `implement-fix.md` | `senior-fullstack-coder` | the surgical fix (T1) |
| `requirements.md` | `product-requirements-analyst` | PRD / user stories |
| `architecture.md` | `system-architect` | architecture plan + file list |
| `implement-feature.md` | `senior-fullstack-coder` | API + UI + store code (T2/T3) |
| `qa.md` | `qa-test-engineer` | verification matrix + opt-in pure-logic tests |
| `review.md` | `storyweave-code-reviewer` | review findings |
| `verify.md` | `ui-verifier` | PASS/FAIL verdict on the running app |

- The actual **agents** live in `.claude/agents/`.
- The **orchestrator** is `.claude/commands/dev.md` (the `/dev` skill).
- **Language:** talk to the user in Thai; all persisted memory is written in **English**.
- **Artifact chaining** mechanics + the RESULT schema: `.claude/dev/RESULT-contract.md`.
