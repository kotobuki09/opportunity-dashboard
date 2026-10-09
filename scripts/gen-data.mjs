// Generates src/data/data.json (bundled into the app) from data/seen.json.
// Usage: node scripts/gen-data.mjs [path/to/seen.json]   (or SEEN_JSON env var)
// Only title/url/deadline/first_seen/category are required per item; other
// fields (see SCHEMA.md and data/seen.schema.json) are optional and are
// derived best-effort from the free-text deadline when missing.
// Run `npm run validate` first; this script is lenient on purpose.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { sourceUniverseDigest } from "./source-universe.mjs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..")
const input = resolve(process.argv[2] || process.env.SEEN_JSON || resolve(root, "data/seen.json"))
const output = resolve(here, "../src/data/data.json")

const CATEGORIES = ["Học bổng/Fellowship", "Research visit", "Tài trợ/Grant", "Kiếm tiền khác", "Startup", "AI training gig", "Đấu thầu & dự án", "Bounty/Speaking/IP"]
const STATUSES = ["mới", "quan tâm", "đang làm hồ sơ", "đã nộp", "đã tham gia", "bỏ qua"]
// ERA Lab projects (order = filter order). Unknown names are appended.
const PROJECTS = ["AIMed", "ActantOS", "ScienzaOS", "Agent Platform", "ERA Lab (chung)"]
// Approximate FX, only for ranking/plotting non-USD amounts (always shown with "≈").
const FX_TO_USD = { USD: 1, EUR: 1.15, GBP: 1.33, JPY: 0.0067, VND: 1 / 26000, CHF: 1.25 }
const DATE_RE = /(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/g

const pad = (n) => String(n).padStart(2, "0")
const toIso = (m) => `${m[1]}-${m[2]}-${m[3]}T${m[4] ? pad(+m[4]) : "23"}:${m[5] ?? "59"}:00+07:00`

function deriveDeadline(text) {
  const t = (text || "").trim()
  const low = t.toLowerCase()
  const dates = [...t.matchAll(DATE_RE)]
  const rolling = low.includes("rolling") || low.includes("liên tục")
  let opens = null, deadline = null
  if (low.startsWith("mở") && dates.length) {
    opens = dates[0][0].slice(0, 10)
    if (dates[1]) deadline = toIso(dates[1])
  } else if (dates.length) deadline = toIso(dates[0])
  const type = deadline ? (rolling ? "rolling_cutoff" : "fixed") : opens ? "opens_later" : rolling ? "rolling" : "unknown"
  return { deadline, type, opens }
}

function normalize(raw) {
  const it = { ...raw }
  const out = {
    id: it.id || createHash("sha1").update(it.url || it.title || "").digest("hex").slice(0, 12),
    title: String(it.title || "(không tên)"),
    url: String(it.url || ""),
    category: it.category || "Kiếm tiền khác",
    deadline: String(it.deadline || ""),
    first_seen: it.first_seen || "",
  }
  const d = deriveDeadline(out.deadline)
  out.deadline_iso = "deadline_iso" in it ? it.deadline_iso : d.deadline
  out.deadline_type = it.deadline_type || (out.deadline_iso ? d.type : d.type === "fixed" ? "unknown" : d.type)
  out.opens_iso = "opens_iso" in it ? it.opens_iso : d.opens
  out.value_text = it.value_text || "không rõ"
  out.benefit_kind = it.benefit_kind || "unknown"
  out.value_usd_estimate = typeof it.value_usd_estimate === "number" ? it.value_usd_estimate : null
  out.value_amount_max = typeof it.value_amount_max === "number" ? it.value_amount_max : null
  out.value_currency = it.value_currency ? String(it.value_currency).toUpperCase() : null
  out.fit_note = it.fit_note || ""
  out.eligibility_note = it.eligibility_note || ""
  out.status = STATUSES.includes(it.status) ? it.status : "mới"
  // project: string or array of ERA Lab project names; always emitted as an array.
  const proj = Array.isArray(it.project) ? it.project : typeof it.project === "string" ? it.project.split(/\s*[,/]\s*(?=[A-Z])/) : []
  out.project = proj.map((p) => String(p).trim()).filter(Boolean)
  out.stage_req = it.stage_req ? String(it.stage_req) : ""
  out.verified_at = it.verified_at ? String(it.verified_at) : ""
  out.review_evidence = Array.isArray(it.review_evidence) ? it.review_evidence.map((entry) => ({...entry})) : []
  if (out.value_usd_estimate != null) { out.value_rank_usd = out.value_usd_estimate; out.value_rank_approx = false }
  else if (out.value_amount_max != null && FX_TO_USD[out.value_currency]) {
    out.value_rank_usd = Math.round(out.value_amount_max * FX_TO_USD[out.value_currency]); out.value_rank_approx = out.value_currency !== "USD"
  } else { out.value_rank_usd = null; out.value_rank_approx = false }
  return out
}

let data = JSON.parse(readFileSync(input, "utf8"))
if (!Array.isArray(data)) data = data.items || []
const items = data.filter((x) => x && typeof x === "object").map(normalize)
const categories = [...CATEGORIES, ...[...new Set(items.map((i) => i.category))].filter((c) => !CATEGORIES.includes(c)).sort()]
const projects = [...PROJECTS.filter((p) => items.some((i) => i.project.includes(p))), ...[...new Set(items.flatMap((i) => i.project))].filter((p) => !PROJECTS.includes(p)).sort()]
const body = { categories, statuses: STATUSES, projects, fx: FX_TO_USD, source_digest: sourceUniverseDigest(items), items }
// built_at = when the data last changed, in VN time: the last commit touching the
// input file, or "now" if the file has uncommitted edits / git is unavailable.
// Deterministic for a given commit, so CI and local builds agree.
const vn = (ms) => new Date(ms + 7 * 3600e3).toISOString().slice(0, 16).replace("T", " ")
let builtAt = vn(Date.now())
let source = "working copy"
try {
  const git = (...a) => execFileSync("git", a, { cwd: dirname(input), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()
  const dirty = git("status", "--porcelain", "--", input)
  const ts = git("log", "-1", "--format=%ct", "--", input)
  if (!dirty && ts) { builtAt = vn(Number(ts) * 1000); source = "last commit" }
} catch { /* not a git checkout */ }
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, JSON.stringify({ built_at: builtAt, ...body }, null, 1))
console.log(`data.json: ${items.length} items from ${input} (updated ${builtAt} VN, ${source})`)
