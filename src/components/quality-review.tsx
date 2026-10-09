import * as React from "react"
import {
  AlertTriangleIcon, ArrowUpRightIcon, CheckCheckIcon, ClipboardCheckIcon,
  ClockAlertIcon, FileDownIcon, FileQuestionIcon, SearchIcon, ShieldCheckIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { qualityFor, qualitySummary, type QualityGroup, type QualityFinding } from "@/lib/data-quality"
import { buildQualityCsv } from "@/lib/quality-export"
import { formatDate, formatDay, stripVi, type OpportunityRow } from "@/lib/opps"

type Filter = "review" | "verification" | "normalization" | "availability" | "normalized" | "all"
type Sort = "priority" | "deadline" | "title"
const PAGE_SIZE = 20
const FILTERS: { value: Filter; label: string }[] = [
  { value: "review", label: "Cần xử lý" },
  { value: "verification", label: "Chưa kiểm định nguồn" },
  { value: "normalization", label: "Chưa chuẩn hoá" },
  { value: "availability", label: "Trạng thái chưa rõ" },
  { value: "normalized", label: "Đã đủ metadata" },
  { value: "all", label: "Tất cả" },
]
const severityColor = (finding: QualityFinding) =>
  finding.severity === "high"
    ? "border-amber-500/40 text-amber-800 dark:text-amber-300"
    : "text-muted-foreground"

export function QualityReview({ rows, onOpen, now = new Date() }: {
  rows: OpportunityRow[]
  onOpen: (id: string) => void
  now?: Date
}) {
  const [filter, setFilter] = React.useState<Filter>("review")
  const [query, setQuery] = React.useState("")
  const [sort, setSort] = React.useState<Sort>("priority")
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE)
  const summary = React.useMemo(() => qualitySummary(rows, now), [rows, now])
  const reviewed = React.useMemo(() => rows.map((row) => ({ row, q: qualityFor(row, now) })), [rows, now])
  const countFor = (value: Filter) => {
    if (value === "verification") return summary.needsVerification
    if (value === "normalization") return summary.needsNormalization
    if (value === "availability") return summary.needsDeadlineReview
    if (value === "normalized") return summary.normalized
    if (value === "review") return summary.needsReview
    return summary.total
  }
  const changeFilter = (value: Filter) => { setFilter(value); setVisibleCount(PAGE_SIZE) }
  const reports = React.useMemo(() => reviewed.filter(({ row, q }) => {
    if (filter === "review" && !q.findings.length) return false
    if (filter === "verification" && !q.needsVerification) return false
    if (filter === "normalization" && !q.needsNormalization) return false
    if (filter === "availability" && !q.needsDeadlineReview) return false
    if (filter === "normalized" && !q.normalized) return false
    if (!query.trim()) return true
    return stripVi([row.title, row.category, row.project.join(" "), row.url, ...q.issues].join(" ")).includes(stripVi(query.trim()))
  }).sort((a, b) => {
    if (sort === "title") return a.row.title.localeCompare(b.row.title, "vi")
    if (sort === "deadline") return a.row.rank - b.row.rank
    return b.q.priority - a.q.priority || a.row.rank - b.row.rank
  }), [reviewed, filter, query, sort])
  const visible = reports.slice(0, visibleCount)

  const exportReport = () => {
    const csv = buildQualityCsv(reports.map(({ row }) => row), now)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const href = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = href
    link.download = "opportunity-quality-review.csv"
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(href), 1000)
  }

  const steps: { value: Filter; title: string; valueCount: number; description: string; icon: typeof ShieldCheckIcon }[] = [
    { value:"verification", title:"Chờ kiểm định nguồn", valueCount:summary.needsVerification, description:"Chưa có hoặc đã quá hạn xác minh", icon:FileQuestionIcon },
    { value:"normalization", title:"Chưa chuẩn hoá", valueCount:summary.needsNormalization, description:"Thiếu trường hoặc chưa phân loại", icon:ClipboardCheckIcon },
    { value:"availability", title:"Cần kiểm tra trạng thái", valueCount:summary.needsDeadlineReview, description:"Chưa rõ nhận hồ sơ / cut-off", icon:ClockAlertIcon },
    { value:"normalized", title:"Đã đủ metadata", valueCount:summary.normalized, description:"Không đồng nghĩa đã xác minh", icon:CheckCheckIcon },
  ]

  return (
    <section className="space-y-5 px-4 lg:px-6">
      <div className="rounded-xl border bg-card p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheckIcon className="size-5 text-blue-600 dark:text-blue-400" /> Trung tâm chất lượng dữ liệu</h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Ba bước kiểm tra độc lập: <strong className="text-foreground">xác minh nguồn</strong>, <strong className="text-foreground">chuẩn hoá metadata</strong> và
          <strong className="text-foreground"> xác định khả năng nộp hồ sơ</strong>.
          Bản ghi có đủ metadata không có nghĩa người nộp đủ điều kiện hoặc chương trình còn mở.
          HTTP 200 và rà soát bằng AI không tự tạo ngày xác minh thủ công.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 @4xl/main:grid-cols-4">
        {steps.map(({value, title, valueCount, description, icon: Icon}) => (
          <button type="button" key={value} aria-pressed={filter === value} onClick={() => changeFilter(value)}
            className={"rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " +
              (filter === value ? "border-primary/60 bg-primary/5" : "")}>
            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Icon className="size-4 shrink-0" />{title}
            </span>
            <strong className="mt-3 block text-3xl font-semibold tabular-nums">{valueCount}</strong>
            <span className="mt-2 block text-xs text-muted-foreground">{description}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 @4xl/main:grid-cols-5">
        {[
          ["Thiếu điều kiện", summary.missingEligibility],
          ["Thiếu giai đoạn", summary.missingStage],
          ["Thiếu dự án", summary.missingProject],
          ["Thiếu lý do phù hợp", summary.missingFit],
          ["Chưa phân loại quyền lợi", summary.missingBenefit],
        ].map(([label, amount]) => (
          <div key={label} className="rounded-lg border bg-muted/20 px-3 py-3">
            <strong className="block text-xl tabular-nums">{amount}</strong>
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <Card className="gap-0">
        <CardHeader className="gap-4 border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Hàng đợi chuẩn hoá & kiểm định</CardTitle>
              <CardDescription>{reports.length} bản ghi trong bộ lọc · sắp theo mức cần xử lý, không phải xác suất được tài trợ</CardDescription>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={exportReport} disabled={!reports.length}>
              <FileDownIcon className="size-4" /> Xuất danh sách CSV
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Bộ lọc kiểm định">
            {FILTERS.map((item) => (
              <Button key={item.value} type="button" size="sm"
                variant={filter === item.value ? "secondary" : "ghost"}
                aria-pressed={filter === item.value}
                onClick={() => changeFilter(item.value)}>
                {item.label} <span className="ml-1 text-xs tabular-nums text-muted-foreground">{countFor(item.value)}</span>
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => { setQuery(e.target.value); setVisibleCount(PAGE_SIZE) }}
                placeholder="Tìm tên, dự án, URL, vấn đề..." aria-label="Tìm trong hàng đợi kiểm định" className="pl-9" />
            </div>
            <Select value={sort} onValueChange={(value) => setSort(value as Sort)}>
              <SelectTrigger aria-label="Sắp xếp hàng đợi kiểm định" className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Ưu tiên xử lý</SelectItem>
                <SelectItem value="deadline">Hạn nộp gần nhất</SelectItem>
                <SelectItem value="title">Tên A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="divide-y">
          {visible.map(({ row, q }) => {
            const focusedGroup: QualityGroup | null = filter === "verification" || filter === "normalization" || filter === "availability" ? filter : null
            const issues = focusedGroup ? q.findings.filter((finding) => finding.group === focusedGroup) : q.findings
            return (
              <div key={row.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => onOpen(row.id)} className="text-left text-sm font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                      {row.title}
                    </button>
                    {q.findings.some((i) => i.severity === "high") && <Badge variant="outline" className="border-amber-500/50 text-amber-800 dark:text-amber-300"><AlertTriangleIcon className="size-3" /> Ưu tiên kiểm tra</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{row.category}</span><span>·</span><span>{row.project[0] || "Chưa gắn dự án"}</span>
                    <span>·</span><span>{row.deadline_iso ? "Hạn " + formatDate(row.deadline_iso) : row.label}</span>
                    <span>·</span><span>{row.verified_at ? "Xác minh " + formatDay(row.verified_at) : "Chưa có xác minh thủ công"}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {issues.map((finding) =>
                      <Badge key={finding.code} variant="outline" className={"font-normal " + severityColor(finding)}>{finding.label}</Badge>
                    )}
                    {!issues.length && <Badge variant="secondary">Đã đủ metadata theo quy tắc</Badge>}
                  </div>
                  {issues[0] && <p className="text-xs leading-relaxed text-muted-foreground"><strong className="text-foreground">Bước tiếp theo:</strong> {issues[0].action}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => onOpen(row.id)}>Chi tiết</Button>
                  <Button size="icon" variant="ghost" aria-label={"Đối chiếu nguồn: " + row.title} asChild>
                    <a href={row.url} rel="noopener noreferrer" target="_blank"><ArrowUpRightIcon className="size-4" /></a>
                  </Button>
                </div>
              </div>
            )
          })}
          {!reports.length && <div className="py-12 text-center text-sm text-muted-foreground">Không có bản ghi phù hợp với bộ lọc hiện tại.</div>}
          {reports.length > visibleCount && (
            <div className="flex justify-center pt-4">
              <Button size="sm" variant="outline" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                Xem thêm ({reports.length - visibleCount} mục còn lại)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Danh sách CSV chỉ chứa metadata công khai và những vấn đề cần xử lý, không xuất ghi chú/trạng thái riêng trong trình duyệt.
        Để sửa dữ liệu gốc, cập nhật <code>data/seen.json</code> qua pull request có nguồn dẫn chứng; không tự điền <code>verified_at</code>.
      </p>
    </section>
  )
}
