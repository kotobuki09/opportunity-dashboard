import type { OpportunityRow } from "./opps"

export type SourceFreshness = "unverified" | "fresh" | "aging" | "stale" | "invalid"
export type QualityInput = Pick<OpportunityRow, "verified_at" | "eligibility_note" | "stage_req" | "project" | "state" | "deadline_iso" | "deadline_type">

function vietnamDay(date: Date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Ho_Chi_Minh",
  }).formatToParts(date).map((part) => [part.type, part.value]))
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day))
}

/** A manual verified_at date is not inferred from whether an HTTP endpoint responds. */
export function freshnessFor(verifiedAt: string, now = new Date()): { state: SourceFreshness; ageDays: number | null } {
  if (!verifiedAt) return { state: "unverified", ageDays: null }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(verifiedAt)) return { state: "invalid", ageDays: null }
  const parsed = new Date(verifiedAt + "T00:00:00+07:00")
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== new Date(Date.UTC(
    Number(verifiedAt.slice(0,4)), Number(verifiedAt.slice(5,7)) - 1, Number(verifiedAt.slice(8,10)),
  )).toISOString().slice(0, 10)) return { state: "invalid", ageDays: null }
  const ageDays = Math.round((vietnamDay(now) - vietnamDay(parsed)) / 86_400_000)
  if (ageDays < 0) return { state: "invalid", ageDays }
  if (ageDays > 90) return { state: "stale", ageDays }
  if (ageDays > 30) return { state: "aging", ageDays }
  return { state: "fresh", ageDays }
}

export function qualityFor(row: QualityInput, now = new Date()) {
  const freshness = freshnessFor(row.verified_at, now)
  const issues: string[] = []
  if (freshness.state === "unverified") issues.push("Chưa có ngày xác minh thủ công")
  if (freshness.state === "invalid") issues.push("Ngày xác minh không hợp lệ hoặc ở tương lai")
  if (freshness.state === "aging") issues.push("Xác minh đã quá 30 ngày")
  if (freshness.state === "stale") issues.push("Xác minh đã quá 90 ngày")
  if (!row.eligibility_note.trim()) issues.push("Thiếu thông tin điều kiện")
  if (!row.stage_req.trim()) issues.push("Thiếu yêu cầu giai đoạn")
  if (!row.project.length) issues.push("Chưa gắn dự án")
  if (row.state === "missed_cutoff") issues.push("Cần kiểm tra cut-off tiếp theo")
  if (row.state === "unknown") issues.push("Chưa biết trạng thái nhận hồ sơ")
  const priority = (row.state === "missed_cutoff" ? 60 : 0)
    + (row.state === "unknown" ? 30 : 0)
    + (freshness.state === "invalid" ? 50 : freshness.state === "unverified" ? 35 : freshness.state === "stale" ? 30 : freshness.state === "aging" ? 15 : 0)
    + (row.deadline_iso && row.state === "open" ? 10 : 0)
    + issues.length
  return { ...freshness, issues, priority }
}

export function qualitySummary(rows: QualityInput[], now = new Date()) {
  const reports = rows.map((row) => qualityFor(row, now))
  return {
    total: rows.length,
    verifiedRecently: reports.filter((q) => q.state === "fresh").length,
    neverVerified: reports.filter((q) => q.state === "unverified").length,
    needsFreshnessReview: reports.filter((q) => q.state === "stale" || q.state === "aging" || q.state === "invalid").length,
    missingEligibility: rows.filter((r) => !r.eligibility_note.trim()).length,
    missingStage: rows.filter((r) => !r.stage_req.trim()).length,
    missingProject: rows.filter((r) => !r.project.length).length,
    cutoffReview: rows.filter((r) => r.state === "missed_cutoff").length,
  }
}
