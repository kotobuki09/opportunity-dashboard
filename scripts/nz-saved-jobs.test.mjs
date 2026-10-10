import test from "node:test"
import assert from "node:assert/strict"
import {nzSnapshotFromJob,safeNzJobSnapshot,validAutoJobUrl,mergeNzSavedJobs} from "../src/lib/nz-saved-jobs.ts"
import {safeNzPersonalEntry} from "../src/lib/nz-application.ts"
import {loadNzTracking,nzDeadlineState} from "../src/lib/nz-jobs.ts"

const job={
 id:"uoa-auto-744000152290238",title:"Research Fellow - Wireless AI",employer:"University of Auckland",
 city:"Auckland",role:"researcher",topics:["Artificial Intelligence","Telecommunications"],
 fit:"high",fit_note:"AI research candidate",salary_nzd_year:null,
 contract:"Fixed term",deadline_day:null,status:"auto_candidate",published_at:"2026-10-09",
 source_url:"https://jobs.smartrecruiters.com/TheUniversityOfAuckland/744000152290238",
 eligibility_note:"Unverified",international_note:"Visa unknown",
 requirements:["Check PhD"],reviewed_at:null,
}
test("saved auto candidate survives disappearance from next public scan without claiming active recruitment",()=>{
 const snapshot=nzSnapshotFromJob(job,new Date("2026-10-09T12:00:00.000Z"))
 assert.equal(snapshot.id,job.id)
 const tracked={[job.id]:{
  status:"preparing",note:"CV ready",next_step:"Ask PI",
  checked:["cv","eligibility"],updated_at:"2026-10-09T12:00:00Z",job_snapshot:snapshot,
 }}
 const current=mergeNzSavedJobs([job],tracked)
 assert.equal(current.archivedIds.size,0)
 const rotated=mergeNzSavedJobs([],tracked)
 assert.equal(rotated.jobs.length,1)
 assert.equal(rotated.archivedIds.has(job.id),true)
 assert.equal(rotated.jobs[0].status,"auto_candidate")
 assert.equal(rotated.jobs[0].deadline_day,null)
 assert.equal(nzDeadlineState(rotated.jobs[0],new Date("2026-10-10T00:00:00Z")),"verify")
 assert.equal(tracked[job.id].note,"CV ready")
 assert.equal(tracked[job.id].next_step,"Ask PI")
 assert.deepEqual(tracked[job.id].checked,["cv","eligibility"])
})
test("official and unsafe URLs cannot be forged as archived University of Auckland roles",()=>{
 const snapshot=nzSnapshotFromJob(job)
 assert.equal(validAutoJobUrl(job.source_url,job.id),true)
 assert.equal(validAutoJobUrl("https://jobs.smartrecruiters.com/TheUniversityOfAuckland/999999999",job.id),false)
 assert.equal(validAutoJobUrl("https://jobs.smartrecruiters.com.evil.com/TheUniversityOfAuckland/744000152290238",job.id),false)
 assert.equal(validAutoJobUrl("javascript:alert(1)",job.id),false)
 assert.equal(safeNzJobSnapshot({...snapshot,source_url:"https://evil.example/job"}),null)
 assert.equal(safeNzJobSnapshot({...snapshot,id:"bad-auto-123"}),null)
 assert.equal(safeNzJobSnapshot({...snapshot,title:"x".repeat(500)}),null)
 assert.equal(nzSnapshotFromJob({...job,status:"official_deadline"}),null)
})
test("imported private snapshots are sanitized and do not elevate source verification",()=>{
 const snapshot=nzSnapshotFromJob(job)
 const raw={status:"saved",note:"Academic plan",checked:["cv"],
  job_snapshot:{...snapshot,status:"official_deadline",deadline_day:"2030-01-01",verified_at:"2026-10-10"}}
 const safe=safeNzPersonalEntry(raw)
 assert.deepEqual(Object.keys(safe.job_snapshot).sort(),
  ["city","employer","id","role","saved_at","source_url","title","topics"].sort())
 const archived=mergeNzSavedJobs([], {[job.id]:safe}).jobs[0]
 assert.equal(archived.status,"auto_candidate")
 assert.equal(archived.deadline_day,null)
})
test("private tracking beyond old 100 KB threshold restores rather than silently resetting all records",()=>{
 const prior=globalThis.localStorage
 const records=Object.fromEntries(Array.from({length:90},(_,i)=>[
  "uoa-auto-"+(744000000000000+i),
  {status:"saved",note:"Research note ".repeat(110),updated_at:"2026-10-09T00:00:00Z"},
 ]))
 const serialized=JSON.stringify(records)
 assert.ok(serialized.length>100000)
 try{
  globalThis.localStorage={getItem:()=>serialized}
  const restored=loadNzTracking()
  assert.equal(Object.keys(restored).length,90)
  assert.equal(restored["uoa-auto-744000000000000"].note.length>1000,true)
 }finally{globalThis.localStorage=prior}
})
