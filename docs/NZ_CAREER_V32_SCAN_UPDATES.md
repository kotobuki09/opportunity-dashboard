# NZ Academic Career Radar V3.2 — Scan Updates and RSS

Date: 2026-10-10. Applies to the existing Academic Jobs · NZ tab.

## Problem

A single fresh source snapshot shows jobs without answering whether a posting was recently **observed**, the public posting metadata changed, or an earlier posting stopped appearing. Users with PhD profiles need an evidence-aware review queue and a way to subscribe to changes, rather than mistaking source silence for a closed call.

## Release changes

1. Each successful scheduled University of Auckland SmartRecruiters API scan compares **only public candidates** against the previous public `nz-academic-jobs-auto.json` snapshot.
2. Classification: `new` = first observed relative to the previous successful scan; `updated` = material public title/role/city/topic/publication metadata differs; `not_returned` = not present in the current API candidate result. The latter does NOT establish withdrawal, expiry, or a real-world closing decision.
3. The scanner writes bounded `changes` summary and `recent_events` (up to 60 public events in the last 45 days) to the existing snapshot. A bootstrap scan does not label every existing posting as “new.”
4. The scanner publishes `public/nz-academic-updates.xml` with public new/updated events only. The feed has no applicant data, no source-private material and never states an eligibility or visa decision.
5. New **Scan Updates** view has the latest observation/changed/not-returned counters, searchable-by-kind event grouping, direct links to employer-controlled job URLs and an RSS subscription link.
6. Discovery view can filter `new` and `updated` candidates. “Xóa bộ lọc” restores all. Existing job, saved applications, and university-watchlist sections remain unchanged.
7. University watchlist additionally offers clearly labeled search at the independent UniRoles NZ aggregator and NZ Government Jobs; direct university career portals remain the authoritative application source.

## Data and interpretation

- A scanner event is an observation in a machine-selected feed, not necessarily a vacancy that started on the scan day.
- A missing candidate can result from keyword scoring, a source API error or filtering; it is **not** necessarily closed. The existing per-applicant private saved-job archive continues to safeguard status, checklist and notes.
- RSS is an opt-in, public standard that the user must subscribe to through an RSS reader or another permitted application. It does not send push notifications, execute applications or transmit personal CVs.
- On a scanner fetch error, the existing script exits without overwriting the previously published snapshot/RSS. On the very first historical baseline, the dashboard shows a clear “no comparison yet” message.
- Historical public events are bounded and validated before UI rendering. The frontend rejects invalid URLs, IDs, dates, enum values and oversized event lists while preserving valid curated opportunities.
- `nzAcademicJobs.v1` browser-local application state remains unchanged. No profiles, personal emails or application documents are sent to the scanner.

## Verification checklist

- Unit: first-scan baseline, one new + one changed + one not returned, invariant topic ordering, retention expiry, XML escaping and no personal data in RSS, malformed metadata safely ignored.
- Browser: Scan Updates opens, counts/labels render, source URL checked, RSS URL points to GitHub Pages, new filter isolates current new candidates and reset restores all; no-baseline empty state truthful.
- Release: run validate, unit suite, ESLint, Vite/TS build, npm dependency audit and Playwright. Merge only after passing CI. GitHub Actions NZ scanner produces .json and .xml together, then workflow-run triggers GitHub Pages publication. Verify build, deploy and live availability.
- Rollback: revert feature PR. The scanner may still have published a previous .xml; remove that file if fully disabling the feature. Personal application data unaffected.

## Coverage limits

Only the officially supported University of Auckland SmartRecruiters API is scanned automatically. Canterbury, Waikato, Victoria Wellington, Otago, Massey and AUT remain official portal watchlist sources; their automated integration is deferred until a stable, permitted machine-readable employer feed is validated.
