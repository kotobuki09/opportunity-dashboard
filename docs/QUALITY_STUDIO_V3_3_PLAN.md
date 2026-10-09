# Quality Studio V3.3 — review operations & source consistency

Date: 2026-10-09 | Owner: Opportunity Scout | Canonical data: `data/seen.json`

## Verified baseline and decision

At the start of this iteration: 78 opportunities, 19 with `verified_at`, no per-field `review_evidence`. The most recent automated source monitor observed 70 reachable URLs, 7 restricted and 1 connection error. These are **transport observations**, never evidence that a program accepts applications or that a specific applicant qualifies.

The scanner refreshes twice weekly. A newer `seen.json` can otherwise temporarily coexist with an older URL scan and mislead reviewers. Meanwhile the quality queue provides findings but previously had no editable, reload-safe triage progress.

## Delivery scope (P0/P1)

| Priority | Issue | Solution | Acceptance |
|---|---|---|---|
| P0 | Old URL scan shown beside changed data | Order-invariant SHA-256 fingerprint of the canonical URL population in both bundled data and public scanner snapshot; show status only if they match | A different URL set or a scan older than 14 days yields **no** HTTP counts/status badges; tests |
| P0 | New opportunity URLs not immediately scanned | Trigger source-intelligence on `data/seen.json` changes as well as scheduled runs; scan/publication fail closed on population races | Newly added URL scan starts after PR merge; bot commit to `public/` does not create an infinite loop |
| P1 | Single timeout treated as persistent outage | Annotate first/repeated nonreachable observations and transitions against the previous snapshot *only for the same URL set* | UI distinguishes new/repeated observations; 403 remains “restricted”, not “closed” |
| P1 | No human work tracking | Four browser-local editorial phases (not started, checking, awaiting evidence, proposal ready), restore on reload and export/import with personal JSON | Stages never change `verified_at`, `status` or public opportunities; stale local stage shows “review again” when public metadata changes |
| P1 | One note incorrectly attested multiple changed fields | Explicit `evidenceField` and at most one field-level citation per checked source note | Multiple fields still allowed in proposed changes, but unchecked fields cannot automatically acquire evidence |
| P1 | Duplicate quality cards + weak workflow navigation | Contextual quality page without generic dashboard cards; progress ribbon, progress filter, inspector remains open on filter changes | Desktop/mobile, light/dark, keyboard, Playwright |

## Data governance principles

- W3C PROV-O separates **entity, activity, agent and derivation**; the app currently captures source/field/date/summary but does **not** claim full PROV-O compliance or record reviewer identity.
- Task state labels follow explicit actionable language consistent with the GOV.UK Design System’s task-list guidance.
- WCAG 2.2: preserve accessible select labels, keyboard focus, and screen-reader status semantics, with reduced-motion behavior.
- Source fingerprint is a version/consistency control, **not** a security trust score.
- Local review stamp is a short non-cryptographic change detector, **not** a signed record or an approval. Reopened tasks need manual checking.
- Never claim automated HTTP 200 or “review proposal ready” is an eligibility decision.

## Rollout / rollback

1. Create PR on isolated branch, preserving `data/seen.json` and existing per-browser statuses.
2. CI: schema validate, Node unit tests (including source digest and review-stage invalidation), lint, TypeScript/Vite build, production audit, Chromium E2E.
3. Merge only after green PR CI. Verify GitHub Pages deployment and post-deploy live availability.
4. Verify official-source scanner launches on main due to source script/workflow change and publishes a signed-to-URL-set advisory snapshot. Monitor repeat status statistics.
5. If the public snapshot is mismatched/missing or older than 14 days, the UI must show it as unavailable and preserve the manual verification warnings. Never silently fall back to old green badges.
6. Revert merge commit if the release regresses; users’ local statuses/notes remain untouched.

## Deferred

- Review assignment shared between reviewers (needs authentication, backend, access controls)
- Evidence file storage or full W3C PROV-O RDF export
- Automated applicant eligibility conclusions
- Deadline and value overwrites without human source review
