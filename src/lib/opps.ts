import raw from "@/data/data.json"
import { computeDeadline, isAcceptingState, isPastState, type DeadlineState } from "@/lib/deadlines"
export type { DeadlineState } from "@/lib/deadlines"

export const BENEFIT_LABELS = {
  grant: "Tài trợ không hoàn lại", prize: "Giải thưởng", equity: "Đầu tư đổi cổ phần",
  credits: "Tín dụng dịch vụ", stipend: "Học bổng/trợ cấp", contract: "Hợp đồng/thù lao",
  in_kind: "Hỗ trợ hiện vật", unknown: "Chưa phân loại",
} as const
export type BenefitKind = keyof typeof BENEFIT_LABELS

export type Status = "mới" | "quan tâm" | "đang làm hồ sơ" | "đã nộp" | "đã tham gia" | "bỏ qua"

export type ReviewEvidence = {
  field: "deadline" | "deadline_iso" | "deadline_type" | "benefit_kind" | "value_text" | "eligibility_note" | "stage_req" | "project" | "fit_note"
  source_url: string
  checked_at: string
  summary: string
}

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
  benefit_kind: BenefitKind
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
  /** Field-specific provenance captured explicitly by a human reviewer. */
  review_evidence: ReviewEvidence[]
}


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
const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
})
export function vnParts(d: Date) {
  const p: Record<string, string> = {}
  for (const x of partsFmt.formatToParts(d)) p[x.type] = x.value
  return { y: +p.year, m: +p.month, d: +p.day, hh: p.hour, mm: p.minute }
}
const pad = (n: number) => String(n).padStart(2, "0")

export function formatDate(iso: string | null, withTime = true) {
  if (!iso) return ""
  const p = vnParts(new Date(iso))
  const t = `${p.hh}:${p.mm}`
  return `${pad(p.d)}/${pad(p.m)}/${p.y}${withTime && t !== "23:59" ? ` ${t}` : ""}`
}
export const formatDay = (isoDay: string) => { const [y, m, d] = isoDay.split("-"); return `${d}/${m}/${y}` }

export function deriveRow(it: Opportunity, now = new Date()): OpportunityRow {
  return { ...it, ...computeDeadline(it, now) }
}

/** The word "open" only means that applications are currently accepted. */
export const isAccepting = (r: OpportunityRow) => isAcceptingState(r.state)
export const isExpired = (r: OpportunityRow) => isPastState(r.state)
export const isDue = (r: OpportunityRow, days: number) =>
  r.state === "open" && r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= days

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
  if (w === "rolling") return r.state === "rolling" || (r.state === "open" && r.rolling)
  if (w === "opens") return r.state === "opens_later"
  return isDue(r, Number(w))
}

export const stripVi = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d")
