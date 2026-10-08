import { AlarmClockIcon, InfinityIcon, TargetIcon, CoinsIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  formatDate,
  isDue,
  isExpired,
  money,
  statedAmount,
  TRACKING,
  type OpportunityRow,
  type Status,
} from "@/lib/opps"

export function SectionCards({
  rows,
  statusOf,
}: {
  rows: OpportunityRow[]
  statusOf: (r: OpportunityRow) => Status
}) {
  // Programs already joined are not open opportunities.
  const open = rows.filter((r) => !isExpired(r) && statusOf(r) !== "đã tham gia")
  const due14 = open.filter((r) => isDue(r, 14)).sort((a, b) => a.rank - b.rank)
  const due7 = due14.filter((r) => isDue(r, 7))
  const rolling = open.filter((r) => r.rolling)
  const opening = open.filter((r) => r.notOpenYet)
  const tracking = open.filter((r) => TRACKING.includes(statusOf(r)))

  const totals: Record<string, number> = {}
  let approx = 0
  let known = 0
  for (const r of open) {
    const a = statedAmount(r)
    if (a) {
      known++
      totals[a.cur] = (totals[a.cur] ?? 0) + a.n
    }
    if (r.value_rank_usd != null) approx += r.value_rank_usd
  }
  const currencies = Object.keys(totals).sort((a, b) => (a === "USD" ? -1 : b === "USD" ? 1 : 0))
  const next = due14[0]

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Cơ hội đang mở</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {open.length}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TargetIcon />
              {tracking.length} đang theo đuổi
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {rolling.length} rolling · {opening.length} sắp mở
          </div>
          <div className="text-muted-foreground">Trên tổng {rows.length} mục đã lưu</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Hết hạn trong 14 ngày</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {due14.length}
          </CardTitle>
          <CardAction>
            <Badge variant={due7.length ? "destructive" : "outline"}>
              <AlarmClockIcon />
              {due7.length} trong 7 ngày
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">
            {next ? `Gần nhất: ${next.title}` : "Không có hạn gấp"}
          </div>
          <div className="text-muted-foreground">
            {next ? `${next.label} · ${formatDate(next.deadline_iso)}` : "Trong 2 tuần tới"}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Nhận hồ sơ liên tục</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {rolling.length}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <InfinityIcon />
              {open.length ? Math.round((rolling.length / open.length) * 100) : 0}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">Rolling hoặc cut-off theo đợt</div>
          <div className="text-muted-foreground">Không có hạn chót cố định</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Giá trị công bố (tối đa)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {currencies.length ? money(totals[currencies[0]], currencies[0]) : "—"}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <CoinsIcon />
              {known} mục có số tiền
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">
            {currencies.length > 1
              ? currencies.slice(1).map((c) => `+ ${money(totals[c], c)}`).join(" ")
              : "Chỉ tính số tiền nguồn công bố"}
          </div>
          <div className="text-muted-foreground">≈ {money(Math.round(approx), "USD")} nếu quy đổi xấp xỉ</div>
        </CardFooter>
      </Card>
    </div>
  )
}
