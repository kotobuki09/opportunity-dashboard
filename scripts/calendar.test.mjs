import test from "node:test"
import assert from "node:assert/strict"
import { makeCalendar } from "../src/lib/calendar.ts"

test("calendar includes source, correct timezone conversion and one day reminder", () => {
  const ics = makeCalendar([{ id: "test-id", title: "A, B; Grant", deadline_iso: "2026-10-10T17:00:00+07:00", url: "https://example.org/apply" }], new Date("2026-10-08T00:00:00Z"))
  assert.match(ics, /DTSTART:20261010T100000Z/)
  assert.match(ics, /SUMMARY:Hạn nộp: A\\, B\\; Grant/)
  assert.match(ics, /TRIGGER:-P1D/)
  assert.match(ics, /URL:https:\/\/example.org\/apply/)
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 1)
  assert.ok(ics.endsWith("\r\n"))
})

test("calendar skips missing deadlines and safely escapes line breaks", () => {
  const text = makeCalendar([
    { id: "n", title: "Rolling", deadline_iso: null, url: "https://example.org" },
    { id: "x", title: "Safe\nTitle", deadline_iso: "2026-11-01T23:59:00+07:00", url: "https://example.org" },
  ])
  assert.equal((text.match(/BEGIN:VEVENT/g) || []).length, 1)
  assert.match(text, /Safe\\nTitle/)
  for (const row of text.split("\r\n")) assert.ok(new TextEncoder().encode(row).length <= 75)
})
