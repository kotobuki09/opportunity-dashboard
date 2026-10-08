import raw from "@/data/data.json"

export type Status = "mới" | "quan tâm" | "đang làm hồ sơ" | "đã nộp" | "đã tham gia" | "bỏ qua"

export type Opportunity = {
  id: string
  title: string
  url: string
  category: string
  deadline: string
  first_seen: string
  deadline_iso: string | null
  deadline_type: "fixed" | "rolling" | "rolling_cutoff" | "opens_later" | "unknown" | string
  opens_iso: string | null
  value_text: string
  value_usd_estimate: number | null
  value_amount_max: number | null
  value_currency: string | null
  value_rank_usd: number | null
  value_rank_approx: boolean
  fit_note: string
  eligibility_note: string
  status: Status
  /** ERA Lab project(s) this fits best (first = best fit). */
  project: string[]
  /** Stage requirement as stated by the program ("" if not stated). */
  stage_req: string
  /** YYYY-MM-DD the official page was last checked (empty if never). */
  verified_at: string
}

export type DeadlineState = "open" | "expired" | "missed_cutoff" | "rolling" | "opens_later" | "unknown"

export type OpportunityRow = Opportunity & {
  state: DeadlineState
  daysLeft: number | null
  /** Sort key: dated items by time, then "opens later", rolling, unknown, expired. */
  rank: number
  label: string
  rolling: boolean
  notOpenYet: boolean
}

export const DATA = raw as unknown as {
  built_at: string
  categories: string[]
  statuses: Status[]
  projects: string[]
  fx: Record<string, number>
  items: Opportunity[]
}
export const CATEGORIES = DATA.categories
export const STATUSES = DATA.statuses
export const PROJECTS = DATA.projects ?? []

/** Fixed per-category colours (CSS vars defined in index.css); unknown categories cycle the chart palette. */
const CATEGORY_COLOR_VARS: Record<string, string> = {
  "Học bổng/Fellowship": "var(--cat-fellowship)",
  "Research visit": "var(--cat-visit)",
  "Tài trợ/Grant": "var(--cat-grant)",
  "Kiếm tiền khác": "var(--cat-other)",
  Startup: "var(--cat-startup)",
  "AI training gig": "var(--cat-gig)",
  "Đấu thầu & dự án": "var(--cat-tender)",
  "Bounty/Speaking/IP": "var(--cat-bounty)",
}
export function categoryColor(c: string) {
  return CATEGORY_COLOR_VARS[c] ?? `var(--chart-${(Math.max(CATEGORIES.indexOf(c), 0) % 5) + 1})`
}
export const TRACKING: Status[] = ["quan tâm", "đang làm hồ sơ", "đã nộp"]

const TZ = "Asia/Ho_Chi_Minh"
const DAY = 86_400_000
const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
})
export function vnParts(d: Date) {
  const p: Record<string, string> = {}
  for (const x of partsFmt.formatToParts(d)) p[x.type] = x.value
  return { y: +p.year, m: +p.month, d: +p.day, hh: p.hour, mm: p.minute }
}
const dayNum = (d: Date) => { const p = vnParts(d); return Date.UTC(p.y, p.m - 1, p.d) / DAY }
const pad = (n: number) => String(n).padStart(2, "0")

export function formatDate(iso: string | null, withTime = true) {
  if (!iso) return ""
  const p = vnParts(new Date(iso))
  const t = `${p.hh}:${p.mm}`
  return `${pad(p.d)}/${pad(p.m)}/${p.y}${withTime && t !== "23:59" ? ` ${t}` : ""}`
}
export const formatDay = (isoDay: string) => { const [y, m, d] = isoDay.split("-"); return `${d}/${m}/${y}` }

export function deriveRow(it: Opportunity, now = new Date()): OpportunityRow {
  const dl = it.deadline_iso ? new Date(it.deadline_iso) : null
  const opens = it.opens_iso ? new Date(`${it.opens_iso}T00:00:00+07:00`) : null
  const notOpenYet = !!(opens && opens > now)
  const rolling = it.deadline_type === "rolling" || it.deadline_type === "rolling_cutoff"
  const past = !!(dl && dl < now && it.deadline_type !== "rolling")
  const daysLeft = dl ? dayNum(dl) - dayNum(now) : null
  let state: DeadlineState, label: string, rank: number
  if (notOpenYet) { state = "opens_later"; label = `Mở ${formatDay(it.opens_iso!)}`; rank = 1e15 + (opens?.getTime() ?? 0) }
  else if (past && it.deadline_type === "rolling_cutoff") { state = "missed_cutoff"; label = "Lỡ cut-off, chờ đợt sau"; rank = 3e15 }
  else if (past) { state = "expired"; label = "Đã hết hạn"; rank = 4e15 - (dl as Date).getTime() }
  else if (dl) {
    state = "open"; rank = dl.getTime()
    const h = Math.floor((dl.getTime() - now.getTime()) / 3_600_000)
    label = daysLeft! <= 0 ? (h <= 0 ? "Dưới 1 giờ" : `Còn ${h} giờ`) : daysLeft === 1 ? "Ngày mai" : `Còn ${daysLeft} ngày`
  } else if (notOpenYet || it.deadline_type === "opens_later") {
    state = "opens_later"; label = opens ? `Mở ${formatDay(it.opens_iso!)}` : "Sắp mở"; rank = 1e15 + (opens?.getTime() ?? 0)
  } else if (it.deadline_type === "rolling") { state = "rolling"; label = "Rolling"; rank = 2e15 }
  else { state = "unknown"; label = "Chưa rõ hạn"; rank = 2.5e15 }
  return { ...it, state, daysLeft, rank, label, rolling, notOpenYet }
}

/** Exclude pre-opening, expired and missed-cutoff items from actionable open counts. */
export const isAccepting = (r: OpportunityRow) => r.state === "open" || r.state === "rolling" || r.state === "unknown"
export const isExpired = (r: OpportunityRow) => r.state === "expired"
export const isDue = (r: OpportunityRow, days: number) => r.state === "open" && r.daysLeft !== null && r.daysLeft <= days

const nf = new Intl.NumberFormat("vi-VN")
export function money(n: number, cur: string) {
  if (cur === "VND") return n >= 1e9 ? `${nf.format(+(n / 1e9).toFixed(2))} tỷ ₫` : `${nf.format(Math.round(n / 1e6))} triệu ₫`
  const sym = ({ USD: "$", EUR: "€", GBP: "£", JPY: "¥" } as Record<string, string>)[cur] ?? `${cur} `
  return sym + (n >= 1e6 ? `${nf.format(+(n / 1e6).toFixed(2))}M` : n >= 1e3 ? `${nf.format(+(n / 1e3).toFixed(1))}k` : nf.format(n))
}
export function statedAmount(it: Opportunity): { n: number; cur: string } | null {
  if (typeof it.value_usd_estimate === "number") return { n: it.value_usd_estimate, cur: "USD" }
  if (typeof it.value_amount_max === "number" && it.value_currency) return { n: it.value_amount_max, cur: it.value_currency }
  return null
}
export const hasValue = (it: Opportunity) => !!it.value_text && it.value_text.toLowerCase() !== "không rõ"

/** Deadline-window facet values. */
export const WINDOWS = [
  { value: "7", label: "Trong 7 ngày" },
  { value: "14", label: "Trong 14 ngày" },
  { value: "30", label: "Trong 30 ngày" },
  { value: "90", label: "Trong 90 ngày" },
  { value: "rolling", label: "Rolling" },
  { value: "opens", label: "Sắp mở" },
] as const
export function inWindow(r: OpportunityRow, w: string) {
  if (w === "rolling") return r.rolling
  if (w === "opens") return r.state === "opens_later"
  return isDue(r, Number(w))
}

export const stripVi = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d")
