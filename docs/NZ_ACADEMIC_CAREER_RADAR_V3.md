# Academic Jobs · New Zealand — V3 UX and application workspace

Date: 2026-10-10. Applies to the existing Opportunity Scout GitHub Pages app. The NZ academic tab is separate from the grant/startup opportunities and retains the existing privacy boundary.

## Product outcomes

- Faster decision path: search academic roles, filter by research discipline / university / degree of source confirmation, sort by nearest *NZ calendar day*, speciality match, or published date
- Source-backed comparison of up to three vacancies: position, university, declared salary, contract, publication and deadline status
- One-click shortlist to an accessible **Hồ sơ của tôi** workspace, then edit per-job checklist (CV, statement, eligibility, referees, actual submission), private next step and multiline notes
- Browser-local JSON export/import now includes validated checklist and next step, while still accepting prior `nzAcademicJobs.v1` backups
- Keyboard-accessible status buttons, search, source comparison and empty-state reset actions; responsive cards and compact disclosure for eligibility/visa detail
- Institution watchlist search remains explicitly for *future openings*, not confirmed job offers

## Data and scoring safeguards

- Fit score uses only employer title and assigned positive discipline topics, *not* reviewer caveats that might contain negative terms (“not wireless”), keeping telecom/AI matching grounded. It is an **explainable heuristic**, not an applicant-eligibility estimate or hiring probability.
- Date calculation uses the `Pacific/Auckland` local date, not the user's browser timezone. A date-only deadline does **not** establish an exact submission cutoff hour.
- `official_deadline` means only a deadline date was read from a source, not visa eligibility or proof the portal is currently accepting applications.
- Stale machine-scanned jobs are excluded from the current feed (14-day limit); watchlist and archived postings remain distinct.
- Per-job `status`, `checked`, `next_step`, and `note` remain solely under browser-local `nzAcademicJobs.v1` and exports. These fields must not be written to public `data/` files, API scanners, analytics logs, GitHub or browser URLs.
- Documents are intentionally not uploaded to the anonymous static app.

## Release gates

1. `npm run validate`, `npm test` (including privacy / score / sort / timezone), `npm run lint`, `npm run build`, `npm audit --omit=dev --audit-level=high`
2. Playwright: use NZ route, card visibility, saved/reloaded/exported checklist, university search, comparison on mobile, job source labels, sorted results and search reset
3. Merge to `main` only if CI passes, verify deploy succeeds, then smoke-check `#nz-jobs` live and corresponding public candidate feed freshness
4. Rollback: revert the merged PR; keep `nzAcademicJobs.v1` browser state intact (optional extra keys will be ignored by older code)

## Future considerations

- Broader official feeds from Canterbury, AUT, Waikato, Wellington, Massey, Otago **only when permitted and supported**; avoid scraping CAPTCHA or unsupported endpoints.
- Optional authenticated cross-device application sync with consent, encryption and access controls
- User-authorized email/calendar integrations and reminders, with verified cut-off times
- Research advisor / laboratory outreach helper and CV tailoring, with user-controlled review before any communication
