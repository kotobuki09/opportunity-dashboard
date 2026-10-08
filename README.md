# Opportunity Dashboard

Keeni's dashboard of open scholarships, fellowships, research visits, grants, startup programs and
other paid opportunities: **https://kotobuki09.github.io/opportunity-dashboard/**

- **Data:** `data/seen.json` is the single source of truth. Its rules are in `SCHEMA.md`, and
  `data/seen.schema.json` enforces them.
- **Agents:** read `AGENTS.md` before editing.
- **App:** Vite + React + TypeScript + Tailwind + shadcn/ui (`dashboard-01` block), in `src/`.
  `scripts/gen-data.mjs` bundles the data at build time.
- **CI/CD:** `.github/workflows/deploy.yml` ("Validate and deploy dashboard") validates and builds
  on PRs, and deploys to GitHub Pages on pushes to `main`.
- Personal status and notes are stored only in the visitor's browser (localStorage) and are never
  committed.

```
npm ci
npm run validate   # check data/seen.json
npm run dev        # local dev server
npm run build      # dist/ (base /opportunity-dashboard/)
```
