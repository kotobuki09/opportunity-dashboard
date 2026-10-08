import test from "node:test"
import assert from "node:assert/strict"
import { priorityFor } from "../src/lib/priority.ts"

const base = {
  project: ["ActantOS"],
  state: "open",
  daysLeft: 5,
  verified_at: "2026-10-08",
}

test("priority ranking prefers selected-project and near-deadline tracked items", () => {
  const urgent = priorityFor(base, "quan tâm", "ActantOS")
  const distant = priorityFor({ ...base, daysLeft: 45, verified_at: "" }, "mới", null)
  assert.equal(urgent.score, 95)
  assert.ok(urgent.score > distant.score)
  assert.ok(urgent.reasons.some((reason) => reason.includes("7 ngày")))
})

test("priority does not automatically equate verified status with eligibility", () => {
  const unknown = priorityFor({ ...base, state: "unknown", daysLeft: null }, "mới", "AIMed")
  assert.ok(unknown.score < 50)
  assert.equal(unknown.reasons.some((reason) => reason.includes("đủ điều kiện")), false)
})

test("priority is bounded to 100", () => {
  const prioritized = priorityFor(base, "đang làm hồ sơ", "ActantOS")
  assert.ok(prioritized.score >= 0 && prioritized.score <= 100)
})
