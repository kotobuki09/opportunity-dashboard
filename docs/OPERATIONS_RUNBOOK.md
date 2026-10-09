# Opportunity Scout — Operations & incident runbook

## Scope

The public GitHub Pages dashboard hosts non-sensitive opportunity facts and browser-local personal notes. It is not an authenticated SaaS product. The public repository is **not** a private document store.

## Daily / twice-weekly operation

- Main site: https://kotobuki09.github.io/opportunity-dashboard/
- Daily at 05:20 ICT and **after a successful Pages deployment**: **Live GitHub Pages availability** checks public HTML, JS/CSS bundle URLs and favicon/touch-icon assets, with a failed GitHub Actions job on unavailability. Watch Actions failures; this does not send emails unless GitHub notifications are configured.
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
- After manual/AI-assisted review, record a stable NSF solicitation code or exact official NAFOSTED announcement title in `data/discovery-reviewed.json`. The scanner will then suppress repeats but not prevent new programs from appearing. To re-open a rejected call or revisit changed circumstances, remove or update the exact ledger entry in a reviewed pull request. Every suppression appears as a count in the workflow artifact; do not silently discard new calls.
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


## Browser icon and theme regression checks (2026-10-09)

- The Opportunity Scout mark is a solid cobalt radar tile with thick white rings and an amber radar point. It is distinguishable on both light and dark browser tab bars and legible at 16px, unlike the former thin black transparent outline.
- Browser-tab SVG: `public/favicon.svg`; PNG fallback: `public/favicon-32.png`; Apple touch icon: `public/apple-touch-icon.png`. The sidebar uses the same brand mark, resolved under the Vite `/opportunity-dashboard/` base path.
- Browser favicon links carry `?v=2` to refresh aggressive tab-icon caches. For future redesigns, bump the version in `index.html`, `app-sidebar.tsx`, and E2E checks together. Updating icon assets does not touch personal localStorage.
- The theme provider synchronizes the resolved system/manual appearance, HTML class, native `color-scheme`, and mobile browser `theme-color`. Verify keyboard theme shortcut and the moon/sun toggle.
- The nightly Pages check verifies SVG favicon, PNG fallback and Apple touch icon URLs with MIME types. CI tests light/dark behavior and browser asset paths.
- If an older tab icon persists after deploy, reload and fully close/reopen the tab. Do not advise clearing browser storage: doing so can delete personal statuses and notes.

## Quality review workbench — editorial workflow (2026-10-09)

1. Open **Kiểm tra dữ liệu** in the sidebar (the count reflects the currently selected project filter). The **Chưa chuẩn hoá & kiểm định** overview card also leads to this queue.
2. Choose **Chưa kiểm định nguồn** to review official pages and update `verified_at` only when a person has checked the official announcement and confirmed its status; source-health 200 and AI screenings are not verification.
3. Choose **Chưa chuẩn hoá** to fill missing eligibility, stage, project, fit rationale or classify `benefit_kind`. Leave `unknown` if a benefit cannot be determined; do not invent a cash equivalent for credits or equity.
4. Choose **Trạng thái chưa rõ** to recheck intake windows or expired rolling cut-offs. A genuinely rolling call does **not** require an arbitrary application deadline.
5. Sort by urgency and export the filtered CSV to delegate editorial fixes. The CSV excludes browser-local notes, status and checklists, and quotes spreadsheet-formula-like cells.
6. Edit the canonical `data/seen.json` in a reviewable PR. Quality warnings are advisory and do not block the existing valid dataset from deploying. Do not infer applicant eligibility from complete metadata.
7. Unit tests assert that source verification and normalization are independent; Chromium tests exercise the filters, CSV, navigation and pagination.
