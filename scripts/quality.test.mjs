import test from "node:test"
import assert from "node:assert/strict"
import { freshnessFor, qualityFor, qualitySummary } from "../src/lib/data-quality.ts"

const now = new Date("2026-10-09T12:00:00Z")
const row = {
  verified_at:"2026-10-09", eligibility_note:"Eligible nonprofit university applicants",
  stage_req:"Không áp dụng", fit_note:"Hợp nghiên cứu AI", benefit_kind:"grant",
  project:["ActantOS"], state:"open", daysLeft:45,
  deadline_iso:"2026-11-23T17:00:00+07:00", deadline_type:"fixed",
}
test("manual source age is calculated by Vietnam calendar dates", () => {
  assert.deepEqual(freshnessFor("2026-10-09",now),{state:"fresh",ageDays:0})
  assert.equal(freshnessFor("2026-09-07",now).state,"aging")
  assert.equal(freshnessFor("2026-06-01",now).state,"stale")
  assert.equal(freshnessFor("2026-10-10",now).state,"invalid")
  assert.equal(freshnessFor("2026-02-30",now).state,"invalid")
  assert.equal(freshnessFor("",now).state,"unverified")
})
test("fresh source + normalized metadata is not automatically an eligibility approval",()=>{
  const q=qualityFor(row,now)
  assert.equal(q.normalized,true)
  assert.equal(q.needsVerification,false)
  assert.equal(q.needsNormalization,false)
  assert.equal(q.needsDeadlineReview,false)
  assert.deepEqual(q.issues,[])
})
test("an unverified yet otherwise normalized source remains a verification task only",()=>{
  const q=qualityFor({...row,verified_at:""},now)
  assert.equal(q.normalized,true)
  assert.equal(q.needsVerification,true)
  assert.equal(q.needsNormalization,false)
  assert.ok(q.findings.some(x=>x.code==="source_not_verified"))
})
test("metadata gaps and unknown benefit are separate from source verification",()=>{
  const q=qualityFor({...row,project:[],eligibility_note:"",stage_req:"",fit_note:"",benefit_kind:"unknown"},now)
  assert.equal(q.needsVerification,false)
  assert.equal(q.needsNormalization,true)
  assert.deepEqual(q.findings.filter(x=>x.group==="normalization").map(x=>x.code).sort(),[
    "missing_eligibility","missing_fit","missing_project","missing_stage","unclassified_benefit",
  ])
})
test("legitimate rolling calls need no fake closing date",()=>{
  const q=qualityFor({...row,deadline_iso:null,daysLeft:null,deadline_type:"rolling",state:"rolling"},now)
  assert.equal(q.needsDeadlineReview,false)
  assert.equal(q.findings.length,0)
})
test("unknown intake and missed cut-off require separate availability review",()=>{
  const unknown=qualityFor({...row,state:"unknown",deadline_type:"unknown",deadline_iso:null,daysLeft:null},now)
  assert.deepEqual(unknown.findings.map(x=>x.code),["unknown_availability"])
  const cut=qualityFor({...row,state:"missed_cutoff",deadline_type:"rolling_cutoff",daysLeft:-2},now)
  assert.ok(cut.findings.some(x=>x.code==="missed_cutoff"))
  assert.equal(cut.needsDeadlineReview,true)
})
test("urgent unverified deadlines rank above long-horizon unverified leads",()=>{
  const close=qualityFor({...row,verified_at:"",daysLeft:5},now)
  const long=qualityFor({...row,verified_at:"",daysLeft:100},now)
  assert.ok(close.priority>long.priority)
  assert.equal(close.findings[0].severity,"high")
})
test("summary keeps counts independent and never equates normalization with verification",()=>{
  const q=qualitySummary([row,
    {...row,verified_at:"",stage_req:"",benefit_kind:"unknown",daysLeft:5},
    {...row,verified_at:"",project:[],state:"unknown",daysLeft:null,deadline_iso:null,deadline_type:"unknown"},
  ],now)
  assert.equal(q.total,3)
  assert.equal(q.verifiedRecently,1)
  assert.equal(q.neverVerified,2)
  assert.equal(q.needsNormalization,2)
  assert.equal(q.normalized,1)
  assert.equal(q.missingStage,1)
  assert.equal(q.missingProject,1)
  assert.equal(q.missingBenefit,1)
  assert.equal(q.unknownAvailability,1)
  assert.equal(q.needsDeadlineReview,1)
  assert.equal(q.needsReview,2)
})
