import test from "node:test"
import assert from "node:assert/strict"
import {buildNzScanHistory,nzJobUpdatesRss} from "./nz-scan-history.mjs"
import {normalizeNzScanSummary} from "../src/lib/nz-scan-changes.ts"
import {normalizeAutoSnapshot} from "../src/lib/nz-jobs.ts"

const at=new Date("2026-10-10T03:00:00.000Z")
const row=(id,title="Postdoctoral Research Fellow - AI & Wireless",topics=["Artificial Intelligence"])=>({
 id:"uoa-auto-"+id,title,employer:"University of Auckland",city:"Auckland",
 role:"postdoc",topics,fit:"medium",
 fit_note:"Machine screened, check official criteria",salary_nzd_year:null,
 contract:"Academic vacancy",deadline_day:null,status:"auto_candidate",published_at:"2026-10-01",
 source_url:"https://jobs.smartrecruiters.com/TheUniversityOfAuckland/"+id,
 eligibility_note:"Unverified eligibility",international_note:"Visa requires review",
 requirements:["Check source"],reviewed_at:null,
})
const main=row("744000152290238")
const extra=row("744000152290239","Research Fellow - Applied AI")
const removed=row("744000152290240","Lecturer - Embedded Systems")
const snapshot=(listings,generated_at="2026-10-10T02:00:00.000Z")=>({
 generated_at,source:"Official SmartRecruiters API",
 scope:"Review employer details",observed_count:12,candidate_count:4,listings,
})

test("bootstrap first scan does not invent all past jobs as new",()=>{
 const fresh=buildNzScanHistory(snapshot([main]),null,at)
 assert.equal(fresh.changes.baseline_at,null)
 assert.deepEqual(fresh.changes.new_ids,[])
 assert.equal(fresh.recent_events.length,0)
})
test("detects exactly newly seen, materially updated and not-returned postings",()=>{
 const prior=snapshot([main,removed],"2026-10-09T03:00:00.000Z")
 const current=snapshot([{...main,city:"Manukau"},extra],"2026-10-10T03:00:00.000Z")
 const result=buildNzScanHistory(current,prior,at)
 assert.equal(result.changes.baseline_at,prior.generated_at)
 assert.deepEqual(result.changes.new_ids,[extra.id])
 assert.deepEqual(result.changes.updated_ids,[main.id])
 assert.deepEqual(result.changes.not_returned_ids,[removed.id])
 assert.deepEqual(new Set(result.recent_events.map(e=>e.kind)),new Set(["new","updated","not_returned"]))
})
test("sorting topic labels does not falsely report a job changed",()=>{
 const prior=snapshot([row("744000152290238","Research Fellow - RF AI",["Telecommunications","Artificial Intelligence"])],"2026-10-09T03:00:00Z")
 const next=snapshot([row("744000152290238","Research Fellow - RF AI",["Artificial Intelligence","Telecommunications"])],"2026-10-10T03:00:00Z")
 const result=buildNzScanHistory(next,prior,at)
 assert.equal(result.changes.updated_ids.length,0)
})
test("repeated scans carry bounded nonduplicate events and expire ancient entries",()=>{
 const before=snapshot([main],"2026-10-09T03:00:00Z")
 before.recent_events=[
  {kind:"new",id:main.id,title:main.title,source_url:main.source_url,at:"2026-10-09T03:00:00Z"},
  {kind:"new",id:main.id,title:main.title,source_url:main.source_url,at:"2026-10-09T03:00:00Z"},
  {kind:"not_returned",id:removed.id,title:removed.title,source_url:removed.source_url,at:"2024-05-09T03:00:00Z"},
 ]
 const result=buildNzScanHistory(snapshot([main],at.toISOString()),before,at)
 assert.equal(result.recent_events.length,1)
 assert.equal(result.recent_events[0].kind,"new")
})
test("RSS includes only new/updated public posts and XML-escapes any text",()=>{
 const malicious={...main,title:"Research AI & Wireless <Networks>"}
 const before=snapshot([], "2026-10-09T03:00:00Z")
 const after=snapshot([malicious],at.toISOString())
 const result={...after,...buildNzScanHistory(after,before,at)}
 // Even if old private-ish keys are attached accidentally, RSS ignores them.
 result.items={"email":"personal@example.org",note:"PRIVATE CV"}
 result.recent_events.push({kind:"not_returned",id:removed.id,title:removed.title,source_url:removed.source_url,at:at.toISOString()})
 const rss=nzJobUpdatesRss(result)
 assert.match(rss,/Research AI &amp; Wireless &lt;Networks&gt;/)
 assert.ok(rss.includes('<rss version="2.0">'))
 assert.ok(rss.includes("jobs.smartrecruiters.com/TheUniversityOfAuckland/744000152290238"))
 assert.ok(!rss.includes(removed.title))
 assert.ok(!rss.includes("personal@example.org"))
 assert.ok(!rss.includes("PRIVATE CV"))
})
test("untrusted scanner event fields are ignored without hiding valid job listings",()=>{
 const before=snapshot([], "2026-10-09T03:00:00Z"),current=snapshot([main],at.toISOString())
 const valid=buildNzScanHistory(current,before,at)
 const raw={...current,...valid}
 const normalized=normalizeAutoSnapshot(raw)
 assert.equal(normalized.listings.length,1)
 assert.deepEqual(normalized.changes.new_ids,[main.id])
 assert.equal(normalized.recent_events[0].kind,"new")
 const bad={...raw,changes:{baseline_at:at.toISOString(),new_ids:["unsafe/1"],updated_ids:[],not_returned_ids:[]},
 recent_events:[{kind:"new",id:main.id,title:"Spam",source_url:"https://evil.example/job",at:at.toISOString()}]}
 const recovered=normalizeAutoSnapshot(bad)
 assert.equal(recovered.listings.length,1)
 assert.equal(recovered.changes,null)
 assert.deepEqual(recovered.recent_events,[])
 assert.deepEqual(normalizeNzScanSummary(raw,at).changes.new_ids,[main.id])
})
test("bad baseline and spoofed source URLs never create false history",()=>{
 const old=snapshot([{...main,source_url:"https://evil.example.org/744000152290238"}],"2026-10-09T03:00:00Z")
 const result=buildNzScanHistory(snapshot([main],at.toISOString()),old,at)
 assert.equal(result.changes.baseline_at,null)
 assert.equal(result.changes.new_ids.length,0)
 assert.throws(()=>buildNzScanHistory(snapshot([{...main,source_url:"javascript:evil()"}],at.toISOString()),null,at))
})
