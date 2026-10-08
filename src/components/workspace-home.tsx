import * as React from "react"
import { ArrowRightIcon, CalendarDaysIcon, CheckCircle2Icon, CircleAlertIcon, SparklesIcon } from "lucide-react"
import { toast } from "sonner"
import { DeadlineBadge } from "@/components/opportunity-bits"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { downloadCalendar } from "@/lib/calendar"
import { formatDate, isAccepting, TRACKING, type OpportunityRow, type Status } from "@/lib/opps"
import { priorityFor } from "@/lib/priority"

const ChartAreaInteractive = React.lazy(() => import("@/components/chart-area-interactive").then((m) => ({ default: m.ChartAreaInteractive })))

export function WorkspaceHome({ rows, statusOf, project, onOpen, onNavigate, onStatusChange }: {
  rows: OpportunityRow[]
  statusOf: (row: OpportunityRow) => Status
  project: string | null
  onOpen: (id: string) => void
  onNavigate: (view: string) => void
  onStatusChange: (id: string, status: Status) => void
}) {
  const active = rows.filter((row) => isAccepting(row) && !["bỏ qua", "đã tham gia"].includes(statusOf(row)))
  const urgent = active.filter((row) => row.state === "open" && row.daysLeft !== null && row.daysLeft <= 30)
    .sort((a, b) => a.rank - b.rank).slice(0, 6)
  const prioritized = active.map((row) => ({ row, ...priorityFor(row, statusOf(row), project) }))
    .sort((a, b) => b.score - a.score || a.row.rank - b.row.rank).slice(0, 5)
  const upcoming = rows.filter((row) => row.state === "opens_later").length
  const pursuing = active.filter((row) => TRACKING.includes(statusOf(row))).length
  const missingVerification = active.filter((row) => !row.verified_at).length
  return (
    <div className="flex flex-col gap-5 px-4 lg:px-6">
      <div className="flex flex-col gap-4 rounded-xl border bg-gradient-to-br from-card to-muted/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <SparklesIcon className="size-3.5" /> Opportunity workspace
          </div>
          <h3 className="text-xl font-semibold tracking-tight">Tập trung vào cơ hội đáng hành động</h3>
          <p className="max-w-xl text-sm text-muted-foreground">
            {pursuing} hồ sơ đang theo đuổi · {upcoming} chương trình sắp mở. Xác nhận điều kiện trên trang chính thức trước khi nộp.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const count = downloadCalendar(rows.filter((row) => row.state === "open" || row.state === "opens_later"))
            toast.success("Đã xuất " + count + " hạn nộp")
          }}><CalendarDaysIcon /> Xuất lịch</Button>
          <Button size="sm" onClick={() => onNavigate("board")}>Mở pipeline <ArrowRightIcon /></Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 @4xl/main:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Hạn cần chú ý</CardTitle>
              <CardDescription>Hạn nộp trong 30 ngày tới</CardDescription>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onNavigate("calendar")}>Tất cả <ArrowRightIcon /></Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {urgent.length ? urgent.map((row) => (
              <button key={row.id} type="button" onClick={() => onOpen(row.id)}
                className="group flex w-full items-center justify-between gap-3 rounded-lg border border-transparent p-3 text-left hover:border-border hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium group-hover:underline">{row.title}</span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">{row.project[0] || row.category} · {formatDate(row.deadline_iso)}</span>
                </span>
                <DeadlineBadge row={row} />
              </button>
            )) : <p className="py-12 text-center text-sm text-muted-foreground">Không có hạn nộp trong 30 ngày tới.</p>}
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Ưu tiên gợi ý</CardTitle>
              <Badge variant="secondary">Theo quy tắc</Badge>
            </div>
            <CardDescription>Xếp theo hạn nộp, dự án và trạng thái. Không phải đánh giá đủ điều kiện.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {prioritized.length ? prioritized.map(({ row, score, reasons }) => (
              <div key={row.id} className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted/40">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold tabular-nums" title="Điểm ưu tiên theo quy tắc">{score}</span>
                <button type="button" onClick={() => onOpen(row.id)} className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-ring">
                  <span className="block truncate text-sm font-medium hover:underline">{row.title}</span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">{reasons.join(" · ") || "Đang nhận hồ sơ"}</span>
                </button>
                {statusOf(row) === "mới" ?
                  <Button size="sm" variant="outline" onClick={() => onStatusChange(row.id, "quan tâm")}>Lưu</Button> :
                  <CheckCircle2Icon aria-label="Đã theo dõi" className="mt-1 size-4 text-emerald-600" />}
              </div>
            )) : <p className="py-12 text-center text-sm text-muted-foreground">Không có cơ hội trong bộ lọc.</p>}
          </CardContent>
        </Card>
      </div>
      <div className="flex items-center gap-2 rounded-lg border px-4 py-3 text-xs text-muted-foreground">
        <CircleAlertIcon className="size-4 shrink-0 text-amber-600" />
        {missingVerification} cơ hội đang nhận chưa ghi nhận ngày xác minh. Vui lòng kiểm tra trực tiếp trước khi chuẩn bị hồ sơ.
      </div>
      <React.Suspense fallback={<div className="rounded-xl border bg-muted/30 p-8 text-sm text-muted-foreground">Đang tải biểu đồ hạn nộp...</div>}>
        <ChartAreaInteractive rows={rows} statusOf={statusOf} />
      </React.Suspense>
    </div>
  )
}
