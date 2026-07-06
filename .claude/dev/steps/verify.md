# Step Prompt — ui-verifier (verify on real UI)

> Use this file's body as the prompt for the **ui-verifier** agent.
> Real-UI gate for every tier. Playwright is installed in this repo.
> **Artifact chaining:** read what changed by path; your verdict + screenshots ARE the artifact
> (no `RUN_DIR` `.md`), but still close with a RESULT block — `.claude/dev/RESULT-contract.md`.

---

You are verifying a change on the running Storyweave app (`npm run dev`, http://localhost:3000).
Confirm the change actually works on the real UI — do not modify code.

## Strict standard (non-negotiable)
A UI change is **not done** until it has been driven on the **running app** and each acceptance
criterion has a **saved before/after screenshot**. Enforce this:
- **"Pending UI verify" is NOT an acceptable terminal state.** The only allowed outcomes are **PASS**
  (observed live, with saved screenshots) or **BLOCKED** (with the exact blocker). Never leave a UI
  change verified only by typecheck.
- **Environment caveat:** the game loop needs a valid `GROQ_API_KEY` in `.env.local` — without it,
  `/api/chat` fails and no turn renders. Auth/marketplace/admin flows need a Supabase session and a
  configured Supabase project. If a required secret/session is missing, the verdict is **BLOCKED** —
  state precisely which one, so the user can supply it; do not silently downgrade to "code looks
  correct". Static/menu screens (landing, `/create` form, dashboard) can often be checked without AI.
- **Capture the fail state first, then the fixed state** when reproducing a bug — a pair per criterion
  (`*-fail.png` then `*-pass.png`) makes the PASS mean something.
- **A non-trivial UI run with zero saved screenshots is INCOMPLETE**, not "done".

## What was requested
{{ARGUMENTS}}

## What was changed — read it by path
{{PRIOR_ARTIFACTS}}   <!-- RUN_DIR/05-implementation.md (the change-log: changed files + behavior); read it to know what to exercise -->

## Acceptance criteria to verify
{{ACCEPTANCE_CRITERIA}}   <!-- concrete pass/fail checks derived from the request + change -->

## What to do
Launch/attach to the dev server (`npm run dev` on :3000), navigate to the affected route
(`/`, `/create`, `/play`, `/store`, `/admin`, …), exercise the flow via Playwright, and check each
acceptance criterion independently. For a full game turn you need the opening turn to render — the
first turn's prose is `prologue [[SCENE]] narrative` and the client shows only the part after the
marker.

## Evidence capture (REQUIRED — do not skip)
Save a real screenshot **to disk** for every check:

```
ASSETS_DIR = .claude/memory/reports/assets/{{RUN_SLUG}}/
```

1. `mkdir -p` the folder first.
2. Capture and **save a `.png` into it** at each meaningful moment, named
   `NN-<short-criterion>-<pass|fail>.png` (zero-padded order).
3. Every PASS/FAIL you claim **must cite the saved file path** — a verdict without a saved screenshot
   is not acceptable (downgrade to BLOCKED and say why).
4. If Playwright saves elsewhere, move/copy the file into `ASSETS_DIR`.

Return: verdict (PASS / FAIL / BLOCKED), per-criterion results each citing its **saved screenshot
path** + any console/network output, the environment (route + which secrets/session were available),
the full list of saved screenshot paths, and — if FAIL — precise observed-vs-expected for the
implementer. Never report PASS without having actually observed the behavior.

## Close with the RESULT block
End with the RESULT block (schema: `.claude/dev/RESULT-contract.md`): `artifact:` = the screenshots
folder `reports/assets/{{RUN_SLUG}}/`, `status: success | partial | blocked` mapping PASS / FAIL /
BLOCKED, a `summary:` = the verdict + per-criterion one-liners, `next: NONE` on PASS or back to the
coder on FAIL, and — on FAIL — the observed-vs-expected in `notes:`.
