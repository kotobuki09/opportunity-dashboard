import type { NzAcademicJob } from "./nz-jobs"

export type CareerPriority="telecom"|"ai"|"balanced"
export type CareerSort="deadline"|"fit"|"newest"
const FIELDS={
 telecom:/telecommunications?|wireless|\b[56]g\b|\brf\b|antenna|radio.frequency|\bvlc\b|visible.light|signal.processing|communication.network|optical/i,
 ai:/\bai\b|machine.learning|artificial.intelligence|agentic|autonomous|reinforcement.learning|data.science|computational|neural.network/i,
 secure:/security|cyber|trusted|robotics?|\biot\b|edge.comput|sensor.fusion/i,
}
/**
 * Match only positive title and topic metadata. Reviewer notes may explicitly
 * say "NOT telecommunications", so including fit_note overstates suitability.
 * This is a heuristic affinity score, NOT eligibility or hiring probability.
 */
export function nzJobFitDetails(job:NzAcademicJob,priority:CareerPriority="balanced"){
 const content=[job.title,...job.topics].join(" ")
 const telecom=FIELDS.telecom.test(content),ai=FIELDS.ai.test(content),secure=FIELDS.secure.test(content)
 const roles={postdoc:20,researcher:18,lecturer:14} as const
 const role=roles[job.role]||0
 const curator=job.fit==="high"?12:job.fit==="medium"?7:0
 const field=priority==="telecom"?(telecom?43:0)+(ai?8:0):
  priority==="ai"?(ai?43:0)+(telecom?8:0):
  (telecom?31:0)+(ai?31:0)
 const complementary=telecom&&ai?6:0
 const adjacent=secure?7:0
 const score=Math.min(99,role+curator+field+complementary+adjacent)
 const signals=[
  telecom?"Telecom / RF / Wireless":null,
  ai?"AI / Autonomous":null,
  secure?"Security / IoT / Robotics":null,
 ].filter((value):value is string=>!!value)
 return {score,signals,telecom,ai,secure,role,curator}
}
export const nzJobFitScore=(job:NzAcademicJob,priority:CareerPriority="balanced")=>nzJobFitDetails(job,priority).score

/** Number of NZ calendar dates until a stated deadline. No closing hour inferred. */
export function nzDaysUntilDeadline(job:Pick<NzAcademicJob,"deadline_day">,todayDay:string):number|null{
 const valid=/^\d{4}-\d{2}-\d{2}$/
 if(!job.deadline_day||!valid.test(job.deadline_day)||!valid.test(todayDay))return null
 const end=Date.parse(job.deadline_day+"T00:00:00Z")
 const start=Date.parse(todayDay+"T00:00:00Z")
 if(!Number.isFinite(end)||!Number.isFinite(start))return null
 return Math.round((end-start)/86_400_000)
}
export function sortNzAcademicJobs(
 rows:NzAcademicJob[],sort:CareerSort,priority:CareerPriority,todayDay:string
):NzAcademicJob[]{
 const open=(job:NzAcademicJob)=>{
  const days=nzDaysUntilDeadline(job,todayDay)
  return days!==null&&days<0?2:job.status==="official_deadline"?0:1
 }
 const fit=(job:NzAcademicJob)=>nzJobFitScore(job,priority)
 const deadline=(job:NzAcademicJob)=>job.deadline_day&&job.deadline_day>=todayDay?
  job.deadline_day:"9999-12-31"
 const published=(job:NzAcademicJob)=>job.published_at||"0000"
 return [...rows].sort((a,b)=>{
  const rank=open(a)-open(b)
  if(rank)return rank
  if(sort==="fit")return fit(b)-fit(a)||deadline(a).localeCompare(deadline(b))
  if(sort==="newest")return published(b).localeCompare(published(a))||fit(b)-fit(a)
  return deadline(a).localeCompare(deadline(b))||fit(b)-fit(a)
 })
}
export function nzCalendarEvent(job:NzAcademicJob):string{
 if(!job.deadline_day||!/^\d{4}-\d{2}-\d{2}$/.test(job.deadline_day))throw Error("No official deadline")
 if(job.status!=="official_deadline")throw Error("Deadline is not officially confirmed")
 const dt=job.deadline_day.replace(/-/g,"")
 const next=new Date(job.deadline_day+"T12:00:00Z")
 if(Number.isNaN(next.getTime()))throw Error("Invalid NZ date")
 next.setUTCDate(next.getUTCDate()+1)
 const until=next.toISOString().slice(0,10).replace(/-/g,"")
 const escape=(s:string)=>s.replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/;/g,"\\;").replace(/,/g,"\\,")
 const url=job.source_url
 const uid="nz-academic-"+job.id+"@opportunity-scout"
 // All-day event avoids fabricating a time that the official source did not state.
 return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Opportunity Scout//Academic Career Radar//EN",
 "BEGIN:VEVENT","UID:"+escape(uid),"DTSTAMP:"+new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,""),
 "DTSTART;VALUE=DATE:"+dt,"DTEND;VALUE=DATE:"+until,
 "SUMMARY:"+escape("NZ application deadline: "+job.title),
 "DESCRIPTION:"+escape("Check exact NZ local closing time and eligibility on official application page. "+url),
 "URL:"+url,"END:VEVENT","END:VCALENDAR",""].join("\r\n")
}
