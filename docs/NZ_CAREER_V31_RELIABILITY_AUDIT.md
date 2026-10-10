# NZ Academic Career Radar V3.1 — Review and reliability hardening

Date: 2026-10-10. Scope: Academic Jobs · NZ only.

## Audit findings and fixes

| Priority | V3 weakness | V3.1 improvement |
|---|---|---|
| P0 | A saved auto-discovered researcher job can disappear from My Applications when the next official API scan removes the posting, even though the private checklist remains in storage | Retain a short, strictly validated private copy, label as no longer in the current feed, and exclude it from the actionable job list |
| P0 | The browser reader rejects tracking JSON beyond 100 KB, even though valid personal backups can contain hundreds of long notes | Allow bounded 2 MB storage/backup so legitimate larger datasets remain accessible |
| P0 | Auto-feed validation trusted requirements, city, salary, contract, fit note and other rendering fields | Validate required fields, lengths, arrays, dates, claimed statuses, duplicated IDs, hostname and posting ID–URL agreement before rendering |
| P1 | NZ Jobs had no in-app way to clear only its saved applicant data | Offer a scoped two-step delete control with cancel |
| P1 | Archived API jobs were indistinguishable from current leads in comparison | Explicit archived status in applicant workspace, saved results and comparison |

## Trust and privacy

- Applicant notes, next steps, checklist, tracked statuses and private saved-posting snapshots stay in the browser and explicitly exported user JSON. Nothing is written to public datasets or server analytics.
- Private snapshots include only bounded employer posting ID, job title, employer, city, academic role, topics, official SmartRecruiters URL and saved timestamp. No fabricated deadline, salary or visa approval is stored.
- Jobs reconstructed from older personal snapshots have status auto_candidate, unknown deadline, unverified fit, and an explicit warning that the posting was not in the latest scan; they are excluded from default actionable jobs.
- All source and snapshot URLs must match the exact University of Auckland SmartRecruiters hostname and numeric posting ID.
- Invalid API records fail closed; the manually curated roles remain visible.
- Data deletion requires explicit confirmation. It does not touch the main grants/startup opportunity data.

## Acceptance and rollback

1. Run schema validation, Node unit tests, lint, TypeScript/Vite production build, dependency audit.
2. Browser tests must confirm an auto candidate is saved, given checklist and notes, removed from the feed, then still visible in the personal archive after a reload and JSON import. Confirm cancel and explicit deletion.
3. Test malformed feed sources, spoofed URLs, fabricated review/deadline fields, and 100 KB+ localStorage backups.
4. Merge only after full CI. Confirm Github Pages deployment and live NZ Jobs page. Roll back with PR revert, preserving local browser data.

## Not yet provided

Multi-user synchronization, documents uploaded to cloud, automatic hiring eligibility decisions, new official university integrations, or access to historical auto jobs that the user never saved.
