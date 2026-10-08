import type { OpportunityRow, Status } from "@/lib/opps"

/**
 * Deterministic, explainable triage ordering.
 * This is not a claim of program eligibility or a probability of success.
 */
export function priorityFor(row: OpportunityRow, status: Status, project: string | null) {
  let score = 0
  const reasons: string[] = []
  if (project && row.project.includes(project)) { score += 35; reasons.push("Phù hợp dự án đã chọn") }
  else if (row.project.length) { score += 15; reasons.push("Có liên kết dự án") }
  if (row.state === "open" && row.daysLeft !== null && row.daysLeft <= 7) {
    score += 35
    reasons.push("Hạn trong 7 ngày")
  } else if (row.state === "open" && row.daysLeft !== null && row.daysLeft <= 30) {
    score += 25
    reasons.push("Hạn trong 30 ngày")
  } else if (row.state === "open") score += 12
  else if (row.state === "rolling") score += 5
  if (status === "quan tâm" || status === "đang làm hồ sơ") { score += 20; reasons.push("Đang theo đuổi") }
  if (row.verified_at) { score += 5; reasons.push("Có ngày kiểm tra nguồn") }
  return { score: Math.min(score, 100), reasons }
}
