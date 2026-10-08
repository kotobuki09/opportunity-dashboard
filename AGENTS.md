# AGENTS.md: rules for agents updating this repo

This repo feeds Keeni's public opportunity dashboard: https://kotobuki09.github.io/opportunity-dashboard/.
Several agents edit it. Follow this contract.

## What you may change
- **Only `data/seen.json`.** Do not touch app code, the workflow, the schema or these docs unless
  Keeni explicitly asks you to.
- Follow `SCHEMA.md` (field meanings) and `data/seen.schema.json` (enforced by CI).

## Content rules
1. Add only **real, currently open** opportunities (or ones with an announced opening date), each
   with the **official** URL: the program's or funder's own page, not a news article or aggregator.
2. **Never invent** deadlines, amounts or eligibility. If the source doesn't state something, write
   `"không rõ"` (`value_text`) or `"rolling"` / `"không rõ"` (`deadline`), and leave the numeric
   fields `null` or omit them. `value_usd_estimate` must come from an amount stated in USD.
3. Convert `deadline_iso` to Vietnam time (`+07:00`) and keep the source wording in `deadline`.
4. Keep ids unique: one item per official URL. Before adding, search the file for the same URL
   or program. Never change an existing item's `url` or `id`, because browser notes are keyed on them.
5. Don't change an existing item's `status`; it belongs to Keeni. Change it only if he asks.
   New items use `"status": "mới"`.
6. Write the text fields (`fit_note`, `eligibility_note`, `stage_req`, `value_text`) in Vietnamese.
7. Don't put secrets, emails, phone numbers or private data here. This repo is public.
8. Don't delete expired items unless asked; the dashboard files them under "Đã hết hạn".
   If you recheck an item and it is still open, set `verified_at` to today's date (`YYYY-MM-DD`).

## How to submit
- Prefer a **pull request**. Otherwise push **one small commit** to `main` with a clear message,
  e.g. `data: add 3 EU AI grants (deadline Nov 2026)` or `data: fix NATIF deadline`.
- Keep the file's formatting: a JSON array with 1-space indentation and UTF-8 (no `\u` escapes).
  Edit items in place and append new items at the end.
- Validate locally if you can:
  ```
  npm ci && npm run validate      # schema + unique ids + URL/date checks
  npm run build                   # optional: full build
  ```
- The CI workflow "Validate and deploy dashboard" runs on every PR and push. A push to `main`
  that passes deploys the site in about a minute. If it fails, the live site keeps the last
  good version; fix the data in a follow-up commit.
