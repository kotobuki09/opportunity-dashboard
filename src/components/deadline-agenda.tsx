import * as React from "react"
import { CalendarDaysIcon, DownloadIcon, ExternalLinkIcon } from "lucide-react"
import { toast } from "sonner"
import { DeadlineBadge } from "@/components/opportunity-bits"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { downloadCalendar } from "@/lib/calendar"
import { formatDate, TRACKING, vnParts, type OpportunityRow, type Status } from "@/lib/opps"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function DeadlineAgenda({ rows, statusOf, onOpen }: {
  rows: OpportunityRow[]
  statusOf: (row: OpportunityRow) => Status
  onOpen: (id: string) => void
}) {
  const [scope, setScope] = React.useState<"all" | "tracking">("all")
  const dated = rows.filter((row) =>
    !!row.deadline_iso && (row.state === "open" || row.state === "opens_later") &&
    !["đã tham gia", "bỏ qua"].includes(statusOf(row)) &&
    (scope === "all" || TRACKING.includes(statusOf(row)))
  ).sort((a, b) => new Date(a.deadline_iso!).getTime() - new Date(b.deadline_iso!).getTime())
  const groups = new Map<string, OpportunityRow[]>()
  for (const row of dated) {
    const parts = vnParts(new Date(row.deadline_iso!))
    const key = parts.y + "-" + String(parts.m).padStart(2, "0")
    groups.set(key, [...(groups.get(key) || []), row])
  }
  return (
    <div className="space-y-5 px-4 lg:px-6">
      <div className="flex flex-col justify-between gap-3 rounded-xl border bg-card p-5 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-base font-semibold"><CalendarDaysIcon className="size-5" /> Lịch hạn nộp</h3>
          <p className="text-sm text-muted-foreground">{dated.length} hạn đã công bố · giờ Việt Nam (UTC+7)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={scope} onValueChange={(value) => setScope(value as "all" | "tracking")}>
            <SelectTrigger aria-label="Phạm vi hạn nộp" className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Còn khả dụng</SelectItem>
              <SelectItem value="tracking">Đang theo đuổi</SelectItem>
            </SelectContent>
          </Select>
        <Button size="sm" disabled={!dated.length} onClick={() => {
          const count = downloadCalendar(dated)
          toast.success("Đã xuất " + count + " sự kiện; nhập file vào ứng dụng lịch")
        }}><DownloadIcon /> Xuất lịch .ics</Button>
        </div>
      </div>
      {[...groups.entries()].map(([key, items]) => (
        <Card key={key}>
          <CardHeader>
            <CardTitle className="text-base">Tháng {Number(key.slice(5))}/{key.slice(0, 4)}</CardTitle>
            <CardDescription>{items.length} hạn nộp có ngày cụ thể</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {items.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="w-14 shrink-0 rounded-lg border bg-muted/40 py-2 text-center tabular-nums">
                  <div className="text-xl font-semibold">{vnParts(new Date(row.deadline_iso!)).d}</div>
                  <div className="text-[10px] text-muted-foreground">tháng {vnParts(new Date(row.deadline_iso!)).m}</div>
                </div>
                <div className="min-w-[140px] flex-1">
                  <button type="button" onClick={() => onOpen(row.id)}
                    className="text-left text-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring">{row.title}</button>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(row.deadline_iso)} · {row.project.join(", ") || row.category}</p>
                </div>
                <DeadlineBadge row={row} />
                <Button size="icon" variant="ghost" aria-label={"Mở nguồn: " + row.title} asChild>
                  <a href={row.url} target="_blank" rel="noopener noreferrer"><ExternalLinkIcon className="size-4" /></a>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      {!groups.size && (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Không có cơ hội với hạn nộp cụ thể trong bộ lọc.
        </div>
      )}
      <p className="text-xs text-muted-foreground">Lịch không thể hiện các chương trình rolling chưa công bố cut-off. Hãy xác nhận hạn nộp trên nguồn chính thức.</p>
    </div>
  )
}
