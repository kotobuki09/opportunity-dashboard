import { qualityFor } from "./data-quality.ts"
import type { OpportunityRow } from "./opps"

const FIELDS = [
  "ID", "Cơ hội", "Dự án", "Danh mục", "URL nguồn chính thức",
  "Tình trạng hồ sơ", "Ngày xác minh", "Hạn nộp ISO",
  "Cần xác minh nguồn", "Cần chuẩn hóa", "Cần kiểm tra hạn",
  "Điểm ưu tiên", "Các vấn đề", "Bước tiếp theo",
]

/** Protect spreadsheet users from CSV formula execution and preserve Vietnamese UTF-8. */
function cell(value: string | number | boolean | null | undefined) {
  const raw = String(value ?? "")
  const safe = /^[\p{Cc}\s]*[=+\-@]/u.test(raw) ? "'" + raw : raw
  return '"' + safe.replace(/"/g, '""').replace(/\r?\n/g, " ") + '"'
}

/** Export only *public* source metadata. Never include browser-local notes or private checklists. */
export function buildQualityCsv(rows: OpportunityRow[], now = new Date()): string {
  const records = rows.map((row) => {
    const result = qualityFor(row, now)
    return [row.id, row.title, row.project.join("; "), row.category, row.url,
      row.state, row.verified_at, row.deadline_iso,
      result.needsVerification, result.needsNormalization, result.needsDeadlineReview,
      result.priority, result.issues.join("; "), result.findings[0]?.action || "",
    ]
  })
  return "\uFEFF" + [FIELDS, ...records].map((line) => line.map(cell).join(",")).join("\r\n") + "\r\n"
}
