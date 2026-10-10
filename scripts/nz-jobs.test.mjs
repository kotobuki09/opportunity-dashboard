import test from "node:test"
import assert from "node:assert/strict"
import {nzDay,nzDeadlineState,normalizeAutoSnapshot,mergedNzJobs,isSafeAcademicUrl} from "../src/lib/nz-jobs.ts"

const base={id:"a",title:"Postdoctoral AI",employer:"University of Auckland",city:"Auckland",
 role:"postdoc",topics:["Artificial Intelligence"],fit:"high",fit_note:"Manual review required for applicant eligibility.",salary_nzd_year:99788,
 contract:"32 months",deadline_day:"2026-10-13",status:"official_deadline",published_at:null,
 source_url:"https://jobs.smartrecruiters.com/TheUniversityOfAuckland/744000152290238-postdoc",
 eligibility_note:"PhD",international_note:"Unknown",requirements:[],reviewed_at:"2026-10-09"}
test("New Zealand local date respects DST, no invented midnight deadline",()=>{
 const t=new Date("2026-10-13T09:00:00.000Z")
 assert.equal(nzDay(t),"2026-10-13")
 assert.equal(nzDeadlineState(base,t),"closing_today")
 assert.equal(nzDeadlineState(base,new Date("2026-10-12T09:00:00.000Z")),"open")
 assert.equal(nzDeadlineState(base,new Date("2026-10-13T12:01:00.000Z")),"closed")
 assert.equal(nzDeadlineState({...base,status:"needs_confirmation",deadline_day:null},t),"verify")
})
test("auto-discovery jobs are always explicitly unverified",()=>{
 const result={generated_at:"2026-10-09T12:00:00Z",source:"SmartRecruiters",
 listings:[{...base,id:"uoa-auto-744000152290238",source_url:"https://jobs.smartrecruiters.com/TheUniversityOfAuckland/744000152290238",status:"auto_candidate",deadline_day:null,reviewed_at:null,salary_nzd_year:null}]}
 assert.equal(normalizeAutoSnapshot(result)?.listings[0].status,"auto_candidate")
 assert.equal(normalizeAutoSnapshot({...result,listings:[{...result.listings[0],source_url:"https://evil.example.org"}]}),null)
 assert.equal(normalizeAutoSnapshot({...result,generated_at:null}),null)
 assert.equal(nzDeadlineState(result.listings[0],new Date("2026-10-09")),"verify")
})
test("manual curated vacancy outranks auto search duplicate and external protocols are rejected",()=>{
 const automatic={...base,id:"uoa-auto-744000152290238",source_url:"https://jobs.smartrecruiters.com/TheUniversityOfAuckland/744000152290238",status:"auto_candidate"}
 assert.equal(mergedNzJobs([base],[automatic]).length,1)
 assert.equal(isSafeAcademicUrl("javascript:alert(1)"),false)
 assert.equal(isSafeAcademicUrl("https://jobs.smartrecruiters.com/TheUniversityOfAuckland/744000"),true)
})

test("malformed auto feed cannot inject unvalidated content or claimed verification",()=>{
 const candidate={...base,id:"uoa-auto-744000152290238",source_url:"https://jobs.smartrecruiters.com/TheUniversityOfAuckland/744000152290238",
  status:"auto_candidate",deadline_day:null,reviewed_at:null,salary_nzd_year:null}
 const feed={generated_at:"2026-10-09T12:00:00Z",listings:[candidate]}
 assert.equal(normalizeAutoSnapshot(feed)?.listings.length,1)
 assert.equal(normalizeAutoSnapshot({...feed,listings:[{...candidate,requirements:null}]}),null)
 assert.equal(normalizeAutoSnapshot({...feed,listings:[{...candidate,topics:["Telecom",null]}]}),null)
 assert.equal(normalizeAutoSnapshot({...feed,listings:[{...candidate,city:{unexpected:"object"}}]}),null)
 assert.equal(normalizeAutoSnapshot({...feed,listings:[{...candidate,deadline_day:"2026-10-15"}]}),null)
 assert.equal(normalizeAutoSnapshot({...feed,listings:[{...candidate,salary_nzd_year:999999}]}),null)
 assert.equal(normalizeAutoSnapshot({...feed,listings:[{...candidate,reviewed_at:"2026-10-09"}]}),null)
 assert.equal(normalizeAutoSnapshot({...feed,listings:[{...candidate,source_url:"https://jobs.smartrecruiters.com/TheUniversityOfAuckland/999999999"}]}),null)
 assert.equal(normalizeAutoSnapshot({...feed,listings:[candidate,candidate]}),null)
})
