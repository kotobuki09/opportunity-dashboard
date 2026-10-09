import test from "node:test"
import assert from "node:assert/strict"
import { jobScore, normalizePosting, discoverJobs } from "./discover-nz-jobs.mjs"

const job={id:"744000152290238",name:"Postdoctoral Research Fellow - AI and Wireless Communications",
 location:{city:"Auckland",country:"nz"},releasedDate:"2026-10-07T02:00:00Z"}
const details={name:job.name,jobAd:{sections:{jobDescription:{text:"Develop next-generation 6G radio and machine learning networks."},qualifications:{text:"PhD in Electrical Engineering or Computer Science."}}}}
test("screens for actual PhD-level academic roles and relevant research, not generic AI marketing",()=>{
 assert.equal(jobScore("Product Manager, Enterprise AI","research projects"),null)
 assert.equal(jobScore("Media and Communications Partner","AI for Science"),null)
 assert.equal(jobScore("Postdoctoral Fellow","soil samples and farming"),null)
 assert.ok(jobScore("Postdoctoral Research Fellow - Wireless Networking","6G RF system design"))
})
test("normalization uses employer-controlled URL and unknown deadline, never invents eligibility",()=>{
 const a=normalizePosting({...job,postingUrl:"https://evil.example/"},details)
 assert.equal(a.source_url,"https://jobs.smartrecruiters.com/TheUniversityOfAuckland/744000152290238")
 assert.equal(a.deadline_day,null)
 assert.equal(a.status,"auto_candidate")
 assert.equal(a.role,"postdoc")
 assert.ok(a.topics.includes("Telecommunications"))
 assert.equal(normalizePosting({...job,location:{city:"Toronto",country:"ca"}},details),null)
})
test("API discovery fetches official active postings and produces bounded sanitized candidates",async()=>{
 const fetcher=async url=>({
  ok:true,
  json:async()=>url.includes("/744000")?details:{content:[job,{id:"123",name:"Product Manager - AI",location:job.location}],totalFound:2}
 })
 const result=await discoverJobs(fetcher,new Date("2026-10-09T12:00:00Z"))
 assert.equal(result.listings.length,1)
 assert.equal(result.listings[0].id,"uoa-auto-744000152290238")
 assert.equal(result.generated_at,"2026-10-09T12:00:00.000Z")
})
