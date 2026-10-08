# Opportunity Scout — Operations & incident runbook

## Scope

The public GitHub Pages dashboard hosts non-sensitive opportunity facts and browser-local personal notes. It is not an authenticated SaaS product. The public repository is **not** a private document store.

## Daily / twice-weekly operation

- Main site: https://kotobuki09.github.io/opportunity-dashboard/
- Daily at 05:20 ICT: **Live GitHub Pages availability** checks public HTML and JS/CSS bundle URLs, with a failed GitHub Actions job on unavailability. Watch Actions failures; this does not send emails unless GitHub notifications are configured.
- Release gate: **Validate and deploy dashboard** (data validation, tests, lint, build, browser E2E, dependency audit, Pages).
- Twice weekly at 06:31 ICT: **Official sources and discovery review**. The workflow produces source-health and discovery-review artifacts retained 21 days. It never writes directly to the opportunity data.
- Review candidates only against official source pages. Confirm geographical eligibility, program type, opening and exact deadline/timezone, value/benefit kind, project fit, and the real applicant entity.
- If confirmed, update data/seen.json via a reviewable pull request, following AGENTS.md and SCHEMA.md. Only set verified_at after a person has examined the official call.
- HTTP reachable proves only an HTTP response. Restricted could be bot blocking; missing can be a temporary or relocated page; do not delete or close an opportunity automatically.
- Missing source/changed deadline within 14 days: escalate same day; other warnings: batch review once a week.
- Do not automatically submit applications or make eligibility claims.

## Release and rollback

1. Develop on branch; open PR; require all checks green and no exposed secrets.
2. Confirm production readiness gates in docs/PRODUCTION_READINESS_PLAN.md, data and benefit type validity.
3. Merge through GitHub PR; verify main run reaches **success**, including Pages deployment.
4. Check live homepage, project filter, board, calendar download, quality review, mobile.
5. If production breaks: revert the bad merge commit through GitHub, confirm new CI/deploy success; recover static site by restoring last good commit. Never overwrite browser-local data.
6. Personal backup: use sidebar **Xuất trạng thái (JSON)** before clearing browser storage or migrating devices. Import the JSON after switching devices. Export files may contain private notes — protect them.

## Source-discovery artifacts

- Download discovery-review.json: these are **unverified leads**, not application-ready grants. Do not copy the URL or amount into seen.json without direct official confirmation.
- Download source-health.json: response codes and errors only; no HTML scraping, extracted claims or credential handling.
- RSS providers may be unavailable or block requests. Review the error counts; failures do **not** change deadline states in production.
- To add a provider, use an official government/funder RSS/Atom endpoint, set official_host, and submit it in a PR. The candidate parser only accepts links on that official domain or subdomains.

## Browser-local privacy and security

- Status, notes, next actions and checklist are stored in plaintext browser localStorage; anyone with access to the browser profile could read them. Do not put passwords, identity numbers, medical records or sensitive application files into notes.
- The web app has no user authentication, backend API or database. GitHub Pages cannot reliably set custom response security headers; the HTML uses a best-effort CSP meta directive. Do not confuse noindex with access control.
- Dependencies are checked for production vulnerabilities during CI. Pin dependency versions and update the lockfile through reviewed changes.
- If GitHub Pages or your DNS account is compromised, revoke tokens and access in GitHub settings, inspect commits and workflows, restore clean known-good code, invalidate any external credentials, and re-deploy.

## Remaining external integrations and ownership

- **Cloud sync**: requires configured auth/provider, private database, RLS/tenant isolation, encryption at rest/in transit, retention & delete flows, backups, consent, and migration design.
- **Automatic email/push reminders**: requires a scheduler/queue, verified recipient consent, reliable timezone semantics, unsubscribe and delivery monitoring. A downloaded .ics with VALARM is local, not an email notification.
- **AI eligibility assessment**: requires authoritative source retrieval, project/applicant profiles, human approval, explainable reasoning, evaluation of false positives/negatives, and controlled model costs.
- Those services must not be marked implemented until provisioned and independently tested.

## Initial production source intelligence test (2026-10-08)

- The first production monitor checked all 77 source URLs: 69 reachable, 7 restricted and 1 error. Those are HTTP transport checks **only**, not eligibility decisions.
- The discovery review produced 34 preliminary candidates from official NAFOSTED and NSF feeds. Publication requires manual verification.
- The initially configured Grants.gov RSS endpoint returned an unsupported XML format/size. It was retired from the active feed catalog rather than weakening the DTD/size protections. The general Grants.gov site may still be used for manual research.
- New feeds should only be added after one successful check in the scheduled runner and with a documented expected format/host.

