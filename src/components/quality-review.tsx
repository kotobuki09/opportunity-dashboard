import * as React from "react"
import { AlertTriangleIcon, ArrowUpRightIcon, CheckCircle2Icon, ClockAlertIcon, FileQuestionIcon, RefreshCwIcon, SearchIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { qualityFor, qualitySummary, type SourceFreshness } from "@/lib/data-quality"
import { formatDay, stripVi, type OpportunityRow } from "@/lib/opps"

const STATUS: Record<SourceFreshness, string> = {
  fresh: "Đã kiểm tra gần đây",
  aging: "Cần kiểm tra lại",
  stale: "Xác minh đã cũ",
  unverified: "Chưa xác minh",
  invalid: "Ngày xác minh có lỗi",
}
type Filter = "review" | "unverified" | "stale" | "incomplete" | "all"
export function QualityReview({ rows, onOpen, now = new Date() }: {
  rows: OpportunityRow[]
  onOpen: (id: string) => void
  now?: Date
}) {
  const [filter, setFilter] = React.useState<Filter>("review")
  const [query, setQuery] = React.useState("")
  const summary = React.useMemo(() => qualitySummary(rows, now), [rows, now])
  const reports = React.useMemo(() => rows.map((row) => ({ row, q: qualityFor(row, now) }))
    .filter(({ row, q }) => {
      if (filter === "review" && !q.issues.length) return false
      if (filter === "unverified" && q.state !== "unverified") return false
      if (filter === "stale" && !["aging", "stale", "invalid"].includes(q.state)) return false
      if (filter === "incomplete" && !(!row.eligibility_note || !row.stage_req || !row.project.length)) return false
      return !query || stripVi([row.title, row.category, row.project.join(" "), ...q.issues].join(" ")).includes(stripVi(query))
    })
    .sort((a,b) => b.q.priority - a.q.priority || a.row.rank - b.row.rank),
  [rows, now, filter, query])
  return (
    <section className="space-y-5 px-4 lg:px-6">
      <div className="rounded-xl border bg-card p-5">
        <h3 className="flex items-center gap-2 text-base font-semibold"><RefreshCwIcon className="size-4" /> Trung tâm chất lượng dữ liệu</h3>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Ngày xác minh chỉ được ghi sau khi con người kiểm tra trang chính thức. Máy chủ trả HTTP 200 không có nghĩa hồ sơ còn mở hoặc bạn đủ điều kiện.
          Những mục chưa có ngày kiểm tra là thông tin cần xác minh, không mặc định là sai.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 @4xl/main:grid-cols-4">
        {[
          {label:"Tổng cơ hội",value:summary.total,icon:SearchIcon},
          {label:"Có xác minh trong 30 ngày",value:summary.verifiedRecently,icon:CheckCircle2Icon},
          {label:"Chưa từng xác minh",value:summary.neverVerified,icon:FileQuestionIcon},
          {label:"Cần xác minh lại",value:summary.needsFreshnessReview,icon:ClockAlertIcon},
        ].map((s) => (
          <Card key={s.label} className="gap-2 py-4">
            <CardHeader className="px-4"><CardDescription className="flex items-center gap-2"><s.icon className="size-4" />{s.label}</CardDescription><CardTitle className="text-2xl tabular-nums">{s.value}</CardTitle></CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg border bg-muted/30 px-4 py-3"><strong>{summary.missingEligibility}</strong> thiếu mô tả điều kiện</div>
        <div className="rounded-lg border bg-muted/30 px-4 py-3"><strong>{summary.missingStage}</strong> thiếu yêu cầu giai đoạn</div>
        <div className="rounded-lg border bg-muted/30 px-4 py-3"><strong>{summary.cutoffReview}</strong> cut-off cần kiểm tra lại</div>
      </div>
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle className="text-base">Hàng đợi rà soát</CardTitle><CardDescription>{reports.length} mục trong bộ lọc · kiểm tra trang nguồn trước khi cập nhật dữ liệu</CardDescription></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm cơ hội..." aria-label="Tìm trong hàng đợi xác minh" className="pl-9 sm:w-52" />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <SelectTrigger aria-label="Lọc mức độ kiểm tra" className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="review">Cần rà soát</SelectItem>
                <SelectItem value="unverified">Chưa xác minh</SelectItem>
                <SelectItem value="stale">Xác minh quá hạn</SelectItem>
                <SelectItem value="incomplete">Thiếu metadata</SelectItem>
                <SelectItem value="all">Tất cả</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="divide-y">
          {reports.map(({row,q}) => (
            <div key={row.id} className="flex flex-wrap items-start gap-3 py-3 first:pt-0">
              <div className="min-w-0 flex-1">
                <button type="button" onClick={() => onOpen(row.id)} className="text-left text-sm font-medium hover:underline">{row.title}</button>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{row.category}</span><span>·</span>
                  <span>{row.project[0] || "Chưa gắn dự án"}</span>
                  <span>·</span><span>{row.verified_at ? "Kiểm tra " + formatDay(row.verified_at) : "Chưa ghi ngày kiểm tra"}</span>
                </div>
                {q.issues.length ? <div className="mt-2 flex flex-wrap gap-1">
                  {q.issues.slice(0,3).map((issue) => <Badge key={issue} variant="outline" className="text-xs font-normal text-muted-foreground">{issue}</Badge>)}
                  {q.issues.length > 3 && <Badge variant="secondary">+{q.issues.length - 3}</Badge>}
                </div> : <p className="mt-1 text-xs text-muted-foreground">Chưa phát hiện lỗ hổng metadata theo quy tắc.</p>}
              </div>
              <div className="flex items-center gap-2">
                {q.state !== "fresh" && <AlertTriangleIcon aria-label={STATUS[q.state]} className="size-4 text-amber-600" />}
                <Button size="icon" variant="ghost" aria-label={"Mở trang nguồn: " + row.title} asChild>
                  <a href={row.url} rel="noopener noreferrer" target="_blank"><ArrowUpRightIcon className="size-4" /></a>
                </Button>
              </div>
            </div>
          ))}
          {!reports.length && <p className="py-10 text-center text-sm text-muted-foreground">Không có mục phù hợp với bộ lọc này.</p>}
        </CardContent>
      </Card>
    </section>
  )
}
