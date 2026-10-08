import test from "node:test"
import assert from "node:assert/strict"
import { freshnessFor, qualityFor, qualitySummary } from "../src/lib/data-quality.ts"
const now = new Date("2026-10-08T12:00:00Z")
const row = {
  verified_at:"2026-10-08", eligibility_note:"Open to all applicants", stage_req:"Early stage",
  project:["ActantOS"], state:"open", deadline_iso:"2026-12-01T00:00:00+07:00", deadline_type:"fixed",
}
test("manual verification age uses VN calendar date", () => {
  assert.deepEqual(freshnessFor("2026-10-08",now),{state:"fresh",ageDays:0})
  assert.equal(freshnessFor("2026-09-07",now).state,"aging")
  assert.equal(freshnessFor("2026-06-01",now).state,"stale")
  assert.equal(freshnessFor("2026-10-09",now).state,"invalid")
  assert.equal(freshnessFor("",now).state,"unverified")
  assert.equal(freshnessFor("2026-02-30",now).state,"invalid")
})
test("unknown and missed cut-off are review issues, not verified closures", () => {
  const x=qualityFor({...row,verified_at:"",state:"missed_cutoff",eligibility_note:""},now)
  assert.ok(x.issues.includes("Cần kiểm tra cut-off tiếp theo"))
  assert.ok(x.issues.includes("Thiếu thông tin điều kiện"))
  assert.equal(x.state,"unverified")
})
test("summary distinguishes missing metadata and verified recently",()=>{
  const x=qualitySummary([row,{...row,verified_at:"",project:[],stage_req:""}],now)
  assert.equal(x.total,2)
  assert.equal(x.verifiedRecently,1)
  assert.equal(x.neverVerified,1)
  assert.equal(x.missingProject,1)
  assert.equal(x.missingStage,1)
})
