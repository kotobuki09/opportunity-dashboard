import { AlarmClockIcon, ArrowUpRightIcon, CheckCheckIcon, CompassIcon, ListTodoIcon } from "lucide-react"
import { isAccepting, isDue, TRACKING, type OpportunityRow, type Status } from "@/lib/opps"

type Stat = { label: string; value: number; help: string; icon: typeof CompassIcon; route: string; accent?: boolean }
export function SectionCards({ rows, statusOf, onNavigate }: {
  rows: OpportunityRow[]
  statusOf: (row: OpportunityRow) => Status
  onNavigate: (view: string) => void
}) {
  const active = rows.filter((row) => isAccepting(row) && statusOf(row) !== "đã tham gia" && statusOf(row) !== "bỏ qua")
  const due14 = active.filter((row) => isDue(row, 14))
  const due7 = active.filter((row) => isDue(row, 7))
  const tracking = active.filter((row) => TRACKING.includes(statusOf(row)))
  const verified = active.filter((row) => !!row.verified_at)
  const stats: Stat[] = [
    { label: "Đang nhận hồ sơ", value: active.length, help: "Cơ hội hiện có thể nộp", icon: CompassIcon, route: "explore" },
    { label: "Hạn trong 14 ngày", value: due14.length, help: due7.length + " mục trong 7 ngày", icon: AlarmClockIcon, route: "calendar", accent: due7.length > 0 },
    { label: "Đang theo đuổi", value: tracking.length, help: "Hồ sơ cần theo dõi", icon: ListTodoIcon, route: "shortlist" },
    { label: "Có ngày xác minh", value: verified.length, help: "Trên " + active.length + " cơ hội đang nhận", icon: CheckCheckIcon, route: "explore" },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 px-4 lg:grid-cols-4 lg:gap-4 lg:px-6">
      {stats.map((stat) => (
        <button type="button" key={stat.label} onClick={() => onNavigate(stat.route)}
          className="group rounded-xl border bg-card p-4 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs font-medium text-muted-foreground sm:text-sm">{stat.label}</span>
            <stat.icon className={"size-4 shrink-0 " + (stat.accent ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")} />
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">{stat.value}</div>
          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{stat.help}</span>
            <ArrowUpRightIcon className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </button>
      ))}
    </div>
  )
}
