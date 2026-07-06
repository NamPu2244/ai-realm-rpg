# Verification Report — {{YYYY-MM-DD}} — {{short-slug}}

- **Branch:** {{git branch}}
- **Tier:** {{T1 Fix / T2 Screen / T3 Feature}}
- **Request:** {{one line of what the user asked for}}
- **Verdict:** {{PASS / FAIL / BLOCKED}}
- **Verified on:** {{route + language + http://localhost:3000}}
- **Screenshots:** `assets/{{YYYY-MM-DD}}-{{short-slug}}/` ({{count}} files)

## Acceptance criteria
| # | Criterion | How verified (UI / unit) | Result | Evidence (screenshot file) |
|---|-----------|--------------------------|--------|----------------------------|
| 1 | {{criterion}} | {{UI via ui-verifier / unit test path}} | {{PASS/FAIL}} | `assets/{{slug}}/03-...-pass.png` |

## Evidence (screenshots)
All frames saved under `.claude/memory/reports/assets/{{YYYY-MM-DD}}-{{short-slug}}/`:
- `01-page-loaded.png` — {{what it shows}}
- `02-...-fail.png` — {{the state that should fail}}
- `03-...-pass.png` — {{the state that should pass}}

## Automated tests
- {{test file path — what it locks down + how to run}}, or "none — no pure logic to test / no runner".

## Bugs / gaps found (and whether fixed)
- {{severity}} — {{issue}} → {{fixed in <file> / open}}

## Still pending
- {{anything left, or "none"}}
