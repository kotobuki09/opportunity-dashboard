/** Static, private iCalendar exports. No network or external calendar permission required. */
export type CalendarEvent = { id: string; title: string; url: string; deadline_iso: string | null }
function utc(date: Date) { return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "") }
function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;")
}
const encoder = new TextEncoder()
function fold(line: string) {
  const lines: string[] = []
  let segment = ""
  let bytes = 0
  for (const character of line) {
    const n = encoder.encode(character).length
    if (bytes + n > 74 && segment) {
      lines.push(segment)
      segment = " "
      bytes = 1
    }
    segment += character
    bytes += n
  }
  lines.push(segment)
  return lines.join("\r\n")
}
export function makeCalendar(items: CalendarEvent[], created = new Date()) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Opportunity Scout//Vietnam//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"]
  for (const item of items) {
    if (!item.deadline_iso) continue
    const deadline = new Date(item.deadline_iso)
    if (Number.isNaN(deadline.getTime())) continue
    lines.push("BEGIN:VEVENT")
    lines.push("UID:" + escapeIcs(item.id) + "@opportunity-scout")
    lines.push("DTSTAMP:" + utc(created))
    lines.push("DTSTART:" + utc(deadline))
    lines.push("DTEND:" + utc(new Date(deadline.getTime() + 15 * 60_000)))
    lines.push("SUMMARY:" + escapeIcs("Hạn nộp: " + item.title))
    lines.push("DESCRIPTION:" + escapeIcs("Kiểm tra thời hạn và điều kiện trên trang chính thức: " + item.url))
    lines.push("URL:" + escapeIcs(item.url))
    lines.push("BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:Deadline reminder", "END:VALARM")
    lines.push("END:VEVENT")
  }
  lines.push("END:VCALENDAR")
  return lines.map(fold).join("\r\n") + "\r\n"
}
export function downloadCalendar(items: CalendarEvent[], filename = "opportunity-deadlines.ics") {
  const content = makeCalendar(items)
  const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return items.filter((item) => item.deadline_iso && !Number.isNaN(new Date(item.deadline_iso).getTime())).length
}
