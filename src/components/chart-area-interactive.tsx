import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { CATEGORIES, categoryColor, TRACKING, vnParts, type OpportunityRow, type Status } from "@/lib/opps"

const statusConfig = {
  tracking: {
    label: "Đang theo đuổi",
    color: "var(--primary)",
  },
  other: {
    label: "Chưa theo đuổi",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig
// Category keys must be CSS-safe, so categories map to c0, c1, … by CATEGORIES order.
const catKey = (c: string) => `c${Math.max(CATEGORIES.indexOf(c), 0)}`
const categoryConfig: ChartConfig = Object.fromEntries(
  CATEGORIES.map((c) => [catKey(c), { label: c, color: categoryColor(c) }])
)
type Mode = "cat" | "status"

const RANGES = [
  { value: "13", label: "3 tháng tới" },
  { value: "26", label: "6 tháng tới" },
  { value: "52", label: "12 tháng tới" },
]
const DAY = 86_400_000
const pad = (n: number) => String(n).padStart(2, "0")

/** Monday 00:00 (Vietnam time) of the current week, as a UTC timestamp. */
function weekStart(now: Date) {
  const p = vnParts(now)
  const d = new Date(Date.UTC(p.y, p.m - 1, p.d) - 7 * 3_600_000)
  const dow = (new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() + 6) % 7
  return d.getTime() - dow * DAY
}
const short = (t: number) => { const p = vnParts(new Date(t)); return `${pad(p.d)}/${pad(p.m)}` }

export function ChartAreaInteractive({
  rows,
  statusOf,
}: {
  rows: OpportunityRow[]
  statusOf: (r: OpportunityRow) => Status
}) {
  const isMobile = useIsMobile()
  const [picked, setRange] = React.useState<string | null>(null)
  const range = picked ?? (isMobile ? "13" : "26")
  const [mode, setMode] = React.useState<Mode>("cat")

  const data = React.useMemo(() => {
    const weeks = Number(range)
    const start = weekStart(new Date())
    const buckets: Record<string, number>[] = Array.from({ length: weeks }, (_, i) => ({
      week: start + i * 7 * DAY, tracking: 0, other: 0,
      ...Object.fromEntries(CATEGORIES.map((c) => [catKey(c), 0])),
    }))
    for (const r of rows) {
      if (r.state !== "open" || !r.deadline_iso) continue
      const i = Math.floor((new Date(r.deadline_iso).getTime() - start) / (7 * DAY))
      if (i < 0 || i >= weeks) continue
      if (TRACKING.includes(statusOf(r))) buckets[i].tracking++
      else buckets[i].other++
      buckets[i][catKey(r.category)]++
    }
    return buckets
  }, [rows, statusOf, range])
  const total = data.reduce((s, b) => s + b.tracking + b.other, 0)
  // Only stack categories that actually have rows in this view (keeps the legend short on category pages).
  const shownCats = CATEGORIES.filter((c) => rows.some((r) => r.category === c))
  const config = mode === "cat" ? categoryConfig : statusConfig
  const keys = mode === "cat" ? shownCats.map(catKey) : ["other", "tracking"]
  const rangeLabel = RANGES.find((r) => r.value === range)?.label.toLowerCase()

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Hạn nộp theo thời gian</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            {total} hạn nộp trong {rangeLabel}, đếm theo tuần
          </span>
          <span className="@[540px]/card:hidden">{total} hạn nộp, theo tuần</span>
        </CardDescription>
        <CardAction className="flex flex-wrap justify-end gap-2">
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => v && setMode(v as Mode)}
            variant="outline"
            size="sm"
            aria-label="Tô màu theo"
          >
            <ToggleGroupItem value="cat" className="px-3">Theo loại</ToggleGroupItem>
            <ToggleGroupItem value="status" className="px-3">Theo trạng thái</ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(v) => v && setRange(v)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            {RANGES.map((r) => (
              <ToggleGroupItem key={r.value} value={r.value}>{r.label}</ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Chọn khoảng thời gian"
            >
              <SelectValue placeholder="6 tháng tới" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectGroup>
                {RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="rounded-lg">{r.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={config} className="aspect-auto h-[250px] w-full">
          <AreaChart data={data} margin={{ left: 0, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(v: number) => short(v)}
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const w = payload?.[0]?.payload?.week as number | undefined
                    return w ? `Tuần ${short(w)} – ${short(w + 6 * DAY)}` : ""
                  }}
                  indicator="dot"
                />
              }
            />
            {keys.map((k) => (
              <Area
                key={k}
                dataKey={k}
                type="step"
                fill={`var(--color-${k})`}
                fillOpacity={k === "other" ? 0.25 : 0.35}
                stroke={`var(--color-${k})`}
                stackId="a"
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
