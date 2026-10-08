# Opportunity Scout V3 — production readiness plan

Last updated: 2026-10-08. Scope: **public, static, browser-local personal opportunity workspace** hosted on GitHub Pages. No private user information or credentials may enter the public repository or build artifacts.

## Contract and non-goals

Production ready for the *static personal product* means data validity, reliable and comprehensible classifications, private local drafts, fault-tolerant builds, observable source health, accessible navigation, repeatable deployment and recovery. It does **not** mean that every grant is genuinely eligible, that all deadlines are up-to-date, that links are verified open, or that an authentication/cloud backend exists. Cross-device sync, email/push reminders, third-party application submission, auto-drafted eligibility judgments and enterprise multi-tenancy require an independently secured service and user consent. The app must not claim those capabilities.

## Release gates (must pass before merge)

| Gate | Test | Rollback / recovery |
| --- | --- | --- |
| Data correctness | AJV schema, id/URL uniqueness, deadline chronology, consistent benefit classification, and no future manual verification date | Restore previous data commit |
| Deadline logic | Node test matrix: opened-before deadline, pre-opening date, timezone boundary, rolling, passed cut-off, unknown, expired | Revert pure logic commit |
| Personal data | Legacy JSON import; reject foreign/oversized payloads; per-item reset; state survives refresh; backup round-trip | Browser-local export and git rollback |
| UX & accessibility | Table, filter, calendar, Kanban (including >24 items), mobile and keyboard interactions | Revert feature PR |
| Source surveillance | Scheduled *reachability* scan with bounded HTTP timeouts/concurrency and exported JSON artifact; never overwrite human-only verified_at | Disable scheduled workflow |
| Discovery | Official RSS candidates deduplicated; raw candidates quarantined in an artifact, never automatically admitted to data/seen.json | Disable scheduled workflow |
| Software supply chain | npm audit for production dependencies; GitHub Actions least privileges; dependency lockfile enforced | Restore previous workflow/lockfile |
| Production delivery | PR CI passes tests/lint/types/build/e2e; main deploy succeeds; live Pages routes checked | Revert merge, let Pages redeploy |
| Operations | Clear runbook, freshness thresholds and manual review path for red flags | Restore last known good data |

## Implementation batches

### 1. Data trust and correctness (P0)
- Model source confidence honestly. The only valid meaning of verified_at is human verification of the official page; **HTTP 200 is not proof of current funding, eligibility or open status**.
- Introduce data-audit metrics (verified / unverified / stale / missing eligibility and project metadata) with an actionable review list.
- Treat an expired rolling cut-off as "needs next-round confirmation", not proof the overall program has ended.
- Introduce optional explicit benefit type (grant, prize, stipend, equity, credits, contract, unknown) and **never sum unlike categories**.
- Add reusable pure validation and test fixtures for edge cases.

### 2. Application workflow and navigation (P1)
- No silent hiding of Kanban items after 24; make the full lane discoverable.
- Respect status filters in calendar and offer a saved/active scope.
- Make searching and table interaction keyboard-accessible; preserve relevant UI state on navigation or refresh where safe.
- Responsive and contrast QA.

### 3. Trusted source monitoring and discovery (P1)
- Daily/weekly scheduled workflow visits public official URLs with timeouts and strict redirect scheme limits, reporting reachability and changes. It never updates verified_at or asserts eligibility.
- Discovery via documented official RSS feeds, with bounded fetching/parsing, deterministic keyword scoring and URL/title dedupe. The output is a **review queue** and is not an official opportunity record.
- Attach results as GitHub Actions artifacts with explicit retention and a manual review protocol. Failed official sources must not break deployment.

### 4. Automated QA and secure delivery (P1)
- GitHub Actions: data validation, Node tests, lint, typecheck/build, npm audit and Chromium E2E smoke checks.
- Fix asset base path, public-page metadata, CSP where compatible with the static site, and document GitHub Pages header limitations.
- Production deploy only from main after checks pass.

### 5. Service-backed features (later / externally provisioned)
- Passwordless/OAuth login, encrypted account data store with per-user access rules, sync and conflict resolution, push/email delivery, data retention and deletion workflows, admin observability, cost controls.
- **Blocked until the owner authorizes an identity/data service and configures secrets/domain.** Do not store user documents in the public repo, do not pretend locally exported calendar alarms are remotely scheduled notifications.

## Operations and acceptance

- The repo is public; agent submissions default to PRs, never silent source/dataset edits.
- All source-finding automation is advisory until a human reviews the official page and inserts accurate metadata.
- Nightly production URL smoke test; source-health artifacts retained at least 14 days.
- Review source integrity warnings at least weekly, immediately for approaching deadlines.
- Any failed deploy: inspect CI, revert offending commit, confirm production availability.
- A release is only labeled **verified** after PR CI, main CI, Pages deployment, and live smoke results are recorded in the release notes.
