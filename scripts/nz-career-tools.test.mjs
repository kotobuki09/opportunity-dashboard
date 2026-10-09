import test from "node:test"
import assert from "node:assert/strict"
import {nzJobFitScore,nzCalendarEvent} from "../src/lib/nz-career-tools.ts"
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
