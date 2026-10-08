/**
 * Pure deadline calculations for the opportunity dashboard.
 * All calendar-day comparisons are in Vietnam time, not the visitor's timezone.
 */
export type DeadlineState = "open" | "expired" | "missed_cutoff" | "rolling" | "opens_later" | "unknown"
export type DeadlineInput = {
  deadline_iso: string | null
  opens_iso: string | null
  deadline_type: string
}
export type DeadlineResult = {
  state: DeadlineState
  daysLeft: number | null
  rank: number
  label: string
  rolling: boolean
  notOpenYet: boolean
}

const DAY = 86_400_000
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric", month: "2-digit", day: "2-digit",
})
function calendarDay(date: Date) {
  const entries = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]))
  return Date.UTC(Number(entries.year), Number(entries.month) - 1, Number(entries.day)) / DAY
}
const fmtDay = (iso: string) => {
  const [y, m, d] = iso.split("-")
  return d + "/" + m + "/" + y
}

export function computeDeadline(item: DeadlineInput, now = new Date()): DeadlineResult {
  const closing = item.deadline_iso ? new Date(item.deadline_iso) : null
  const opening = item.opens_iso ? new Date(item.opens_iso + "T00:00:00+07:00") : null
  const hasClosing = closing !== null && !Number.isNaN(closing.getTime())
  const hasOpening = opening !== null && !Number.isNaN(opening.getTime())
  const notOpenYet = hasOpening && opening! > now
  const rolling = item.deadline_type === "rolling" || item.deadline_type === "rolling_cutoff"
  const daysLeft = hasClosing ? calendarDay(closing!) - calendarDay(now) : null

  if (notOpenYet) {
    return {
      state: "opens_later",
      daysLeft,
      rank: 1e15 + opening!.getTime(),
      label: "Mở " + fmtDay(item.opens_iso!),
      rolling,
      notOpenYet: true,
    }
  }
  if (hasClosing && closing! < now && item.deadline_type === "rolling_cutoff") {
    return { state: "missed_cutoff", daysLeft, rank: 3e15, label: "Đã qua cut-off", rolling, notOpenYet: false }
  }
  if (hasClosing && closing! < now) {
    return { state: "expired", daysLeft, rank: 4e15 - closing!.getTime(), label: "Đã hết hạn", rolling, notOpenYet: false }
  }
  if (hasClosing) {
    const hours = Math.ceil((closing!.getTime() - now.getTime()) / 3_600_000)
    const label = daysLeft === 0 ? (hours <= 1 ? "Dưới 1 giờ" : "Còn " + hours + " giờ")
      : daysLeft === 1 ? "Ngày mai" : "Còn " + daysLeft + " ngày"
    return { state: "open", daysLeft, rank: closing!.getTime(), label, rolling, notOpenYet: false }
  }
  if (rolling) {
    return { state: "rolling", daysLeft: null, rank: 2e15, label: "Nhận liên tục", rolling, notOpenYet: false }
  }
  return { state: "unknown", daysLeft: null, rank: 2.5e15, label: "Chưa rõ hạn / trạng thái", rolling: false, notOpenYet: false }
}

export const isAcceptingState = (state: DeadlineState) => state === "open" || state === "rolling"
export const isPastState = (state: DeadlineState) => state === "expired" || state === "missed_cutoff"
