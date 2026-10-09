# New Zealand Academic Careers — production plan and source policy

Date: 2026-10-09. Audience: PhD researcher in telecommunications, wireless/optical communications, agentic AI, autonomous systems and IoT, looking for academic postdoc, research fellow, research scientist and lecturer careers across New Zealand.

## Source review

| Position | Official source and conclusion |
|---|---|
| University of Auckland Postdoctoral Research Fellow — Autonomous Agency | [Official employer posting](https://jobs.smartrecruiters.com/TheUniversityOfAuckland/744000152290238-postdoctural-research-fellow-school-of-computer-science-te-kura-matai-rorohiko-32-month-fixed-term-). NZ$99,788/year, 32 months, closes **13 October 2026**. Research fit in agent-based computational autonomy, but confirm specific PhD discipline and work rights before application. |
| University of Auckland Lecturer — Data Science/AI | [Official academic career profile](https://www.careers.auckland.ac.nz/career/lecturer-data-science-ai/). Academic role is relevant; the current closing date and vacancy status were not independently established. The UI labels it **check current intake**, not confirmed open. |
| Canterbury Wireless Research Centre postdoc | [Former advert](https://www.tenurify.com/jobs/post-doctoral-fellow-wireless-research-centre-university-of-canterbury-9a81a042): **closed 27 September 2026**. Excellent research match but never show as a current vacancy. [Official WRC programme](https://www.canterbury.ac.nz/study/academic-study/engineering/research-engineering-forestry-product-design/wireless-research-centre/study-with-wrc) is on the watchlist. |
| Bodeker Scientific ML/control postdoc | [Official institute vacancy](https://www.bodekerscientific.com/vacancies/post-doctoral-researcher) closed **24 September 2026**, despite misleading October deadlines on aggregators. Excluded from current open list. |
| Auckland Mathematics scattering postdoc | [Official advert](https://jobs.smartrecruiters.com/TheUniversityOfAuckland/744000149765638-postdoctoral-fellow-te-kura-matauranga-pangarau-department-of-mathematics-12-months-fixed-term-) expects PhD Mathematics/analysis; not prioritized for telecommunications research. |

## Delivery in phases

1. Dedicated Academic Jobs — NZ navigation route without changing grant/startup records or the global project filter.
2. Separately display **official dated opportunities**, **role details needing deadline confirmation** and **automatically found job candidates**.
3. Future-university watchlist: Auckland, Canterbury/Wireless Research Centre, AUT, Waikato and Otago. These are sources for future alerts, not open offers.
4. Scheduled job discovery from the University of Auckland public SmartRecruiters Posting API, documented at https://developers.smartrecruiters.com/docs/endpoints. Screen PhD academic titles, filter for research fit and NZ location. Keep unknown deadlines and applicant/visa eligibility unknown. Other universities' official career sites remain watch-only until a supported API exists.
5. Human application workflow: search, role/specialty filters, official employer links, browser-private tracking status and notes with separate JSON export/import.
6. UI: cobalt design, compact academic role tags, source evidence, obvious deadlines, responsive/mobile, light/dark, keyboard focus.
7. Quality gate: dataset validation, unit tests, lint, TypeScript build, dependency audit, Playwright tests and GitHub Pages release smoke check.
8. Production operations: twice-weekly job scan, conservative stale (>14 day) cutoff for auto results, GitHub Actions publication and explicit Pages rebuild. On API errors, preserve the last good snapshot and do not claim the scan succeeded.

## Source policy

- Official job description with stated closing date takes priority over aggregator listings.
- The public posting API may show a currently advertised position, but that **does not verify your PhD disciplinary eligibility, deadline or right to work in NZ**.
- Employer watchlist pages are not active vacancies.
- Deadlines represent NZ local calendar days (Pacific/Auckland); never invent midnight/23:59.
- No email sending, job applying or GitHub write occurs through the anonymous dashboard UI.
- User notes and application status remain in browser-local storage; they can be exported as a private JSON file.
- New Zealand visa sponsorship policies and academic criteria must be reviewed for each job.

## Rollback

Disable NZ academic discovery workflow if the upstream API changes, retain the static manually screened seed data, and use the official university watchlist. Revert the PR if the Academic Jobs tab introduces regressions; existing opportunity records and stored grant application notes are unchanged.
