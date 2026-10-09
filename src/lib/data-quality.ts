import type { OpportunityRow } from "./opps"

export type SourceFreshness = "unverified" | "fresh" | "aging" | "stale" | "invalid"
export type QualityGroup = "verification" | "normalization" | "availability"
export type QualitySeverity = "high" | "medium" | "low"
export type QualityCode =
  | "source_not_verified" | "source_invalid_date" | "source_aging" | "source_stale"
  | "missing_eligibility" | "missing_stage" | "missing_project" | "missing_fit"
  | "unclassified_benefit" | "unknown_availability" | "missed_cutoff"
  | "fixed_deadline_missing"

export type QualityFinding = {
  code: QualityCode
  group: QualityGroup
  severity: QualitySeverity
  label: string
  action: string
}

export type QualityInput = Pick<
  OpportunityRow,
  "verified_at" | "eligibility_note" | "stage_req" | "project" | "fit_note" |
  "benefit_kind" | "state" | "deadline_iso" | "deadline_type" | "daysLeft"
>

const SEVERITY_SCORE: Record<QualitySeverity, number> = { high: 40, medium: 16, low: 5 }
const DAY = 86_400_000

function vietnamDay(date: Date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Ho_Chi_Minh",
  }).formatToParts(date).map((part) => [part.type, part.value]))
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day))
}

function deadlineDays(row: QualityInput, now: Date) {
  if (typeof row.daysLeft === "number") return row.daysLeft
  if (!row.deadline_iso) return null
  const deadline = new Date(row.deadline_iso)
  return Number.isNaN(deadline.getTime()) ? null : Math.round((vietnamDay(deadline) - vietnamDay(now)) / DAY)
}

/** Only explicit, human-entered verified_at metadata can count as manual source verification. */
export function freshnessFor(verifiedAt: string, now = new Date()): { state: SourceFreshness; ageDays: number | null } {
  if (!verifiedAt) return { state: "unverified", ageDays: null }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(verifiedAt)) return { state: "invalid", ageDays: null }
  const y = Number(verifiedAt.slice(0, 4))
  const m = Number(verifiedAt.slice(5, 7))
  const d = Number(verifiedAt.slice(8, 10))
  const check = new Date(Date.UTC(y, m - 1, d))
  if (check.getUTCFullYear() !== y || check.getUTCMonth() + 1 !== m || check.getUTCDate() !== d) {
    return { state: "invalid", ageDays: null }
  }
  const ageDays = Math.round((vietnamDay(now) - Date.UTC(y, m - 1, d)) / DAY)
  if (ageDays < 0) return { state: "invalid", ageDays }
  if (ageDays > 90) return { state: "stale", ageDays }
  if (ageDays > 30) return { state: "aging", ageDays }
  return { state: "fresh", ageDays }
}

/**
 * Independent checks: verified source, normalized metadata and application availability.
 * A rolling call is valid without a closing date. Unknown benefit type is an
 * editorial review request, not proof that the source is false or ineligible.
 */
export function qualityFor(row: QualityInput, now = new Date()) {
  const freshness = freshnessFor(row.verified_at, now)
  const findings: QualityFinding[] = []
  const days = deadlineDays(row, now)
  const urgent = row.state === "open" && days !== null && days >= 0 && days <= 14
  const add = (code: QualityCode, group: QualityGroup, severity: QualitySeverity, label: string, action: string) =>
    findings.push({ code, group, severity, label, action })

  if (freshness.state === "unverified") add(
    "source_not_verified", "verification", urgent ? "high" : "medium",
    "Chưa xác minh nguồn",
    "Mở thông báo chính thức và xác nhận chương trình còn nhận hồ sơ; chỉ sau khi kiểm tra thủ công mới cập nhật verified_at."
  )
  if (freshness.state === "invalid") add(
    "source_invalid_date", "verification", "high", "Ngày xác minh không hợp lệ",
    "Sửa ngày kiểm tra nguồn dựa trên lần kiểm tra thủ công thực tế."
  )
  if (freshness.state === "aging") add(
    "source_aging", "verification", urgent ? "high" : "medium", "Xác minh quá 30 ngày",
    "Đối chiếu lại hạn nộp và điều kiện với trang chính thức, sau đó cập nhật ngày xác minh."
  )
  if (freshness.state === "stale") add(
    "source_stale", "verification", "high", "Xác minh quá 90 ngày",
    "Kiểm tra lại chương trình; bản ghi có thể đã lỗi thời. Không mặc định coi chương trình đóng."
  )

  if (!row.eligibility_note?.trim()) add(
    "missing_eligibility", "normalization", "high", "Thiếu điều kiện ứng tuyển",
    "Bổ sung điều kiện quốc gia, pháp nhân, tư cách PI hoặc yêu cầu đối tác từ nguồn chính thức."
  )
  if (!row.stage_req?.trim()) add(
    "missing_stage", "normalization", "medium", "Thiếu yêu cầu giai đoạn",
    "Ghi rõ giai đoạn startup/nhà nghiên cứu được yêu cầu hoặc 'Không áp dụng' nếu đã xác nhận từ nguồn."
  )
  if (!row.project?.length) add(
    "missing_project", "normalization", "medium", "Chưa gắn dự án",
    "Phân loại phù hợp AIMed, ActantOS, ScienzaOS, Agent Platform hoặc ERA Lab."
  )
  if (!row.fit_note?.trim()) add(
    "missing_fit", "normalization", "low", "Thiếu đánh giá mức phù hợp",
    "Ghi căn cứ cho việc gắn dự án, không suy đoán khả năng được nhận tài trợ."
  )
  if (!row.benefit_kind || row.benefit_kind === "unknown") add(
    "unclassified_benefit", "normalization", "low", "Chưa phân loại quyền lợi",
    "Phân biệt grant, prize, equity, service credits, stipend hoặc contract; giữ unknown nếu trang gốc không nêu."
  )

  if (row.deadline_type === "fixed" && !row.deadline_iso) add(
    "fixed_deadline_missing", "availability", "high", "Thiếu ngày đóng đơn cố định",
    "Kiểm tra ngày và múi giờ từ nguồn chính thức; không tự đặt giờ 23:59."
  )
  if (row.state === "missed_cutoff") add(
    "missed_cutoff", "availability", "high", "Đã qua cut-off",
    "Kiểm tra đợt tiếp nhận tiếp theo; qua một cut-off không đồng nghĩa chương trình đã đóng hẳn."
  )
  if (row.state === "unknown") add(
    "unknown_availability", "availability", "medium", "Chưa rõ tình trạng nộp",
    "Xác nhận trang chính thức có đang nhận hồ sơ hay không, tránh coi chương trình thông tin là đợt đang mở."
  )

  findings.sort((a, b) => SEVERITY_SCORE[b.severity] - SEVERITY_SCORE[a.severity])
  const by = (group: QualityGroup) => findings.filter((item) => item.group === group)
  const needsVerification = by("verification").length > 0
  const needsNormalization = by("normalization").length > 0
  const needsDeadlineReview = by("availability").length > 0
  // Make near-deadline review tasks win over long-horizon records with many minor gaps.
  // This ranks editorial urgency only; it never estimates award probability or eligibility.
  const urgencyBonus = urgent && findings.length ? (days !== null && days <= 7 ? 240 : 160) : 0
  const priority = findings.reduce((total, item) => total + SEVERITY_SCORE[item.severity], 0)
    + urgencyBonus
    + (row.state === "missed_cutoff" ? 40 : 0)

  return {
    ...freshness,
    findings,
    issues: findings.map((item) => item.label),
    needsVerification,
    needsNormalization,
    needsDeadlineReview,
    normalized: !needsNormalization,
    priority,
  }
}

export function qualitySummary(rows: QualityInput[], now = new Date()) {
  const reports = rows.map((row) => qualityFor(row, now))
  return {
    total: rows.length,
    needsReview: reports.filter((q) => q.findings.length > 0).length,
    needsNormalization: reports.filter((q) => q.needsNormalization).length,
    normalized: reports.filter((q) => q.normalized).length,
    needsVerification: reports.filter((q) => q.needsVerification).length,
    needsDeadlineReview: reports.filter((q) => q.needsDeadlineReview).length,
    verifiedRecently: reports.filter((q) => q.state === "fresh").length,
    neverVerified: reports.filter((q) => q.state === "unverified").length,
    needsFreshnessReview: reports.filter((q) => ["stale", "aging", "invalid"].includes(q.state)).length,
    missingEligibility: rows.filter((r) => !r.eligibility_note?.trim()).length,
    missingStage: rows.filter((r) => !r.stage_req?.trim()).length,
    missingProject: rows.filter((r) => !r.project?.length).length,
    missingFit: rows.filter((r) => !r.fit_note?.trim()).length,
    missingBenefit: rows.filter((r) => !r.benefit_kind || r.benefit_kind === "unknown").length,
    cutoffReview: rows.filter((r) => r.state === "missed_cutoff").length,
    unknownAvailability: rows.filter((r) => r.state === "unknown").length,
  }
}
