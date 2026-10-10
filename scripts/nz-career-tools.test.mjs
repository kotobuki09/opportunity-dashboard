import test from "node:test"
import assert from "node:assert/strict"
import {nzJobFitScore,nzJobFitDetails,nzDaysUntilDeadline,sortNzAcademicJobs,nzCalendarEvent} from "../src/lib/nz-career-tools.ts"
const base={id:"nz-fellow-1",title:"Postdoctoral Fellow — Wireless Networks",role:"postdoc",
 employer:"University of Canterbury",city:"Christchurch",topics:["Telecommunications","6G"],
 fit:"high",fit_note:"RF sensing and wireless communication",status:"official_deadline",
 deadline_day:"2026-10-30",source_url:"https://example.ac.nz/vacancies/1"}
test("telecommunications PhD profile prefers exact wireless postdoc over generic AI",()=>{
 const wireless=nzJobFitScore(base,"telecom")
 const generic=nzJobFitScore({...base,title:"Postdoctoral Fellow — Language Models",topics:["AI"],fit_note:"LLM research"},"telecom")
 assert.ok(wireless>generic)
 assert.ok(nzJobFitScore(base,"ai")<wireless)
})
test("calendar uses NZ date-only without inventing an application time",()=>{
 const ics=nzCalendarEvent(base)
 assert.ok(ics.includes("DTSTART;VALUE=DATE:20261030"))
 assert.ok(ics.includes("DTEND;VALUE=DATE:20261031"))
 assert.ok(ics.includes("Check exact NZ local closing time"))
 assert.equal(ics.includes("DTSTART;TZID"),false)
 assert.throws(()=>nzCalendarEvent({...base,status:"auto_candidate"}),/officially confirmed/)
 assert.throws(()=>nzCalendarEvent({...base,deadline_day:null}),/No official/)
})

test("negative reviewer caveats cannot over-score an unrelated telecom role",()=>{
 const ai={...base,topics:["Agentic AI"],title:"Postdoctoral Fellow — Autonomous Agency",fit_note:"NOT telecommunications or wireless radio research"}
 const signals=nzJobFitDetails(ai,"telecom")
 assert.equal(signals.telecom,false)
 assert.equal(signals.ai,true)
 assert.ok(nzJobFitScore(base,"telecom")>signals.score)
 assert.equal(signals.signals.includes("Telecom / RF / Wireless"),false)
})
test("academic role sorting honors NZ day and explicit fit/deadline modes",()=>{
 const today="2026-10-10"
 const dueSoon={...base,id:"soon",deadline_day:"2026-10-13",published_at:"2026-10-01"}
 const later={...base,id:"later",deadline_day:"2026-10-29",published_at:"2026-10-09"}
 const uncertain={...base,id:"no-date",status:"auto_candidate",deadline_day:null}
 const expired={...base,id:"expired",deadline_day:"2026-09-29"}
 assert.equal(nzDaysUntilDeadline(dueSoon,today),3)
 assert.equal(nzDaysUntilDeadline(uncertain,today),null)
 assert.equal(nzDaysUntilDeadline(expired,today),-11)
 assert.deepEqual(sortNzAcademicJobs([expired,uncertain,later,dueSoon],"deadline","telecom",today).map(x=>x.id),["soon","later","no-date","expired"])
 assert.equal(sortNzAcademicJobs([dueSoon,later],"newest","balanced",today)[0].id,"later")
})
