# data/seen.json schema

`data/seen.json` (in the repo `kotobuki09/opportunity-dashboard`, branch `main`) is a JSON
**array** of opportunity objects. It is the single source of truth for the dashboard at
https://kotobuki09.github.io/opportunity-dashboard/ and for every agent that updates it
(see `AGENTS.md`). The machine-readable version of these rules is `data/seen.schema.json`;
`npm run validate` checks both, and CI runs it on every push and pull request.

Only the five original fields are required. Every other field is optional; items with only the
required fields still build fine (the builder derives what it can from the free-text `deadline`).
Unknown fields are **rejected** by the validator (catches typos): to add a field, add it to this
file and to `data/seen.schema.json` in the same commit.

## Required (original) fields

| field        | type   | notes |
|--------------|--------|-------|
| `title`      | string | Name of the opportunity. |
| `url`        | string | Official page. Also used as the dedupe key and to derive the item `id`. |
| `deadline`   | string | Human text exactly as found, e.g. `"2026-10-30 17:00 (giờ VN)"`, `"rolling"`, `"mở 2026-11-15, đóng khi đủ 800 hồ sơ"`. Times are Vietnam time unless the text names another zone. |
| `first_seen` | string | `YYYY-MM-DD` date (VN) the scout first found it. |
| `category`   | string | One of `Học bổng/Fellowship`, `Research visit`, `Tài trợ/Grant`, `Kiếm tiền khác`, `Startup` (accelerators/incubators, cloud & AI credits, startup competitions/pitch prizes, startup grants), `AI training gig` (paid AI training/evaluation work open to Vietnam-based experts), `Đấu thầu & dự án` (public tenders, pilot/procurement schemes, corporate open-innovation calls), `Bounty/Speaking/IP` (AI bug bounties, sponsorships, paid speaking/CFPs with honoraria, IP/patent & tech-transfer support). Research visits go into `Research visit`. Any other value fails validation. |

## Optional enrichment fields

| field                | type            | notes |
|----------------------|-----------------|-------|
| `id`                 | string          | Stable key for browser status/notes. Default: first 12 hex chars of `sha1(url)`. Do not change once set. |
| `deadline_iso`       | string \| null  | Machine deadline, ISO 8601 **with offset**, converted to VN time, e.g. `"2026-11-01T13:59:00+07:00"`. `null` for rolling / not open yet. If absent, parsed from `deadline` (first `YYYY-MM-DD[ HH:MM]`, assumed +07:00, 23:59 if no time). |
| `deadline_type`      | string          | `fixed` (one hard deadline), `rolling` (no deadline), `rolling_cutoff` (rolling with periodic cut-offs; `deadline_iso` = next cut-off), `opens_later` (call not open yet, no deadline known), `unknown`. |
| `opens_iso`          | string \| null  | `YYYY-MM-DD` the call opens, when it is not open yet. |
| `value_text`         | string          | Amount as stated by the source, in Vietnamese, e.g. `"$10k–150k"`, `"tối đa 3 tỷ đồng"`. Use `"không rõ"` when the source does not state one. |
| `value_usd_estimate` | number \| null  | **Only from an amount stated in USD; never invented.** The upper bound / headline amount (max of a range, "up to" value, or 1st prize for competitions). `null` if no USD amount is stated. |
| `value_usd_min`      | number \| null  | Lower bound of a stated USD range (informational). |
| `value_amount_max`   | number \| null  | Stated upper-bound amount in a non-USD currency (e.g. `72000` for €3,000 × 24 months). |
| `value_currency`     | string \| null  | ISO code for `value_amount_max`: `EUR`, `GBP`, `JPY`, `VND`, … |
| `fit_note`           | string          | Why it fits Keeni / ERA Lab (which project: AIMed, ActantOS, …). Vietnamese. |
| `project`            | string \| string[] \| null | Best-fit ERA Lab project(s), best first: `AIMed`, `ActantOS`, `ScienzaOS`, `Agent Platform`, `ERA Lab (chung)`. Shown as the "Dự án" column/filter. |
| `stage_req`          | string          | Stage/eligibility requirement as stated by the program (e.g. "≥2 co-founder, pre-revenue", "≤Series A"). Omit if not stated. Vietnamese. |
| `eligibility_note`   | string          | Constraints/caveats: legal entity, consortium, host submits, page quirks… Vietnamese. |
| `verified_at`        | string          | `YYYY-MM-DD` (VN) when the official page was last checked and the item confirmed still open. Shown as "Kiểm tra lần cuối". |
| `status`             | string          | Default `"mới"`. One of `mới`, `quan tâm`, `đang làm hồ sơ`, `đã nộp`, `đã tham gia` (already a member, e.g. NVIDIA Inception; excluded from the "open" KPI), `bỏ qua`. The dashboard's per-browser status (localStorage) overrides this. |

Fields starting with `_` are computed by the builder and never stored in `seen.json`.

## Value handling in the dashboard

- Cards always show `value_text` (or "không rõ").
- Display source-stated values per opportunity only. Different benefit kinds (equity, grants, credits, prizes) are **not additive**; the V3 dashboard does not present an aggregate total.
- For sorting and the value chart only, non-USD amounts are converted with fixed approximate
  rates in `FX_TO_USD` in `scripts/gen-data.mjs` and marked "≈".

## Example

```json
{
  "title": "Foresight Institute - AI for Science & Safety Nodes RFP",
  "url": "https://foresight.org/grants/ai-science-safety-nodes-rfp/",
  "deadline": "2026-10-31 23:59 PDT",
  "first_seen": "2026-10-08",
  "category": "Tài trợ/Grant",
  "deadline_iso": "2026-11-01T13:59:00+07:00",
  "deadline_type": "fixed",
  "value_text": "thường $30k–100k",
  "value_usd_estimate": 100000,
  "value_usd_min": 30000,
  "fit_note": "Hợp ActantOS.",
  "eligibility_note": "Bắt buộc open-source.",
  "status": "mới"
}
```

## Validation rules (`npm run validate`)

Errors (fail CI, nothing is deployed):
- not a JSON array; missing required field; unknown field; wrong type;
- `category`, `status`, `deadline_type` outside the enums above;
- `url` not an absolute `http(s)://` URL with a host;
- duplicate `id` (explicit `id`, else `sha1(url)[:12]`, i.e. duplicate URL);
- `first_seen`, `opens_iso`, `verified_at` not a real `YYYY-MM-DD` date;
- `deadline_iso` not ISO 8601 with time and offset (`2026-11-01T13:59:00+07:00`);
- `deadline_type: "fixed"` with `deadline_iso: null`;
- `value_amount_max` without `value_currency`; `value_currency` not a 3-letter code;
  negative amounts; `value_usd_min` > `value_usd_estimate`.

Warnings (printed only): deadline already passed, likely-duplicate URL (http/https, www,
trailing slash), USD estimate with `value_text` "không rõ", rolling item with a `deadline_iso`.

## Build and deploy

- `npm run validate` then `npm run build`: `scripts/gen-data.mjs` turns `data/seen.json` into
  `src/data/data.json` (generated, git-ignored, bundled into the app); Vite builds `dist/` with
  base `/opportunity-dashboard/`. The "Cập nhật" time is the last commit that touched
  `data/seen.json`, in VN time.
- GitHub Actions workflow **"Validate and deploy dashboard"** (`.github/workflows/deploy.yml`)
  runs validate + build on every pull request, and validate + build + deploy to GitHub Pages on
  every push to `main` that touches data or app files (also runnable by hand). If validation
  fails, the live site keeps the last good version.
- Keeni's box: `/workspace/opportunity-scout/publish.sh pull` / `push "message"` (see README.md).

Browser-side state (status, private notes) lives in `localStorage` key `oppScout.v1`
and is exported/imported as `{app, version, exported_at, items: {<id>: {title, url, status, note, updated}}}`.
It overrides the `status` stored in `data/seen.json` on that browser.
