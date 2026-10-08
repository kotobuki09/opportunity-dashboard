import { AlarmClockIcon, CalendarClockIcon, CircleSlashIcon, ClockIcon, InfinityIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { STATUSES, type OpportunityRow, type Status } from "@/lib/opps"

export const STATUS_LABEL: Record<Status, string> = {
  "mới": "Mới",
  "quan tâm": "Quan tâm",
  "đang làm hồ sơ": "Đang làm hồ sơ",
  "đã nộp": "Đã nộp",
  "đã tham gia": "Đã tham gia",
  "bỏ qua": "Bỏ qua",
}

export function DeadlineBadge({ row }: { row: OpportunityRow }) {
  if (row.state === "open") {
    const urgent = row.daysLeft !== null && row.daysLeft <= 7
    return (
      <Badge variant={urgent ? "destructive" : "outline"} className={urgent ? undefined : "text-muted-foreground"}>
        {urgent ? <AlarmClockIcon /> : <ClockIcon />}
        {row.label}
      </Badge>
    )
  }
  const icon =
    row.state === "rolling" ? <InfinityIcon /> : row.state === "opens_later" ? <CalendarClockIcon /> : <CircleSlashIcon />
  return (
    <Badge variant="outline" className="text-muted-foreground">
      {icon}
      {row.label}
    </Badge>
  )
}

export function StatusSelect({
  id,
  value,
  onChange,
  className,
}: {
  id?: string
  value: Status
  onChange: (s: Status) => void
  className?: string
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Status)}>
      <SelectTrigger id={id} size="sm" className={className} aria-label="Trạng thái">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectGroup>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
