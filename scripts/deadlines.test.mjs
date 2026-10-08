import test from "node:test"
import assert from "node:assert/strict"
import { computeDeadline, isAcceptingState, isPastState } from "../src/lib/deadlines.ts"

const now = new Date("2026-10-08T15:00:00Z")
function entry(overrides = {}) {
  return { deadline_iso: "2026-10-10T17:00:00+07:00", opens_iso: null, deadline_type: "fixed", ...overrides }
}

test("fixed opportunity open before its deadline", () => {
  const row = computeDeadline(entry(), now)
  assert.equal(row.state, "open")
  assert.equal(row.daysLeft, 2)
  assert.equal(isAcceptingState(row.state), true)
})

test("announced opportunity is not open even if the end date is known", () => {
  const row = computeDeadline(entry({
    opens_iso: "2026-11-17",
    deadline_iso: "2027-03-18T23:00:00+07:00",
  }), now)
  assert.equal(row.state, "opens_later")
  assert.equal(isAcceptingState(row.state), false)
})

test("opportunity changes from announced to open at the Vietnam opening boundary", () => {
  const sample = entry({ opens_iso: "2026-11-17", deadline_iso: "2027-03-18T23:00:00+07:00" })
  assert.equal(computeDeadline(sample, new Date("2026-11-16T16:59:59Z")).state, "opens_later")
  assert.equal(computeDeadline(sample, new Date("2026-11-16T17:00:00Z")).state, "open")
})

test("closed fixed calls and passed rolling cutoffs do not count as open", () => {
  const closed = entry({ deadline_iso: "2026-10-07T17:00:00+07:00" })
  const past = computeDeadline(closed, now)
  assert.equal(past.state, "expired")
  assert.equal(isPastState(past.state), true)
  const cutoff = computeDeadline({ ...closed, deadline_type: "rolling_cutoff" }, now)
  assert.equal(cutoff.state, "missed_cutoff")
  assert.equal(isPastState(cutoff.state), true)
  assert.equal(isAcceptingState(cutoff.state), false)
})

test("rolling without cutoff is open, unknown is not proven to be open", () => {
  assert.equal(computeDeadline(entry({ deadline_iso: null, deadline_type: "rolling" }), now).state, "rolling")
  const uncertain = computeDeadline(entry({ deadline_iso: null, deadline_type: "unknown" }), now)
  assert.equal(uncertain.state, "unknown")
  assert.equal(isAcceptingState(uncertain.state), false)
})

test("Vietnam day, not UTC day, governs days remaining", () => {
  const justBeforeLocalMidnight = new Date("2026-10-08T16:30:00Z")
  assert.equal(computeDeadline(entry({ deadline_iso: "2026-10-09T23:59:00+07:00" }), justBeforeLocalMidnight).daysLeft, 1)
  const justAfterLocalMidnight = new Date("2026-10-08T17:30:00Z")
  assert.equal(computeDeadline(entry({ deadline_iso: "2026-10-09T23:59:00+07:00" }), justAfterLocalMidnight).daysLeft, 0)
})
