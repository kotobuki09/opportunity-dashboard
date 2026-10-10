import type { NzAcademicJob } from "./nz-jobs"

export type CareerPriority="telecom"|"ai"|"balanced"
const FIELDS={
 telecom:/telecommunications?|wireless|6g|5g|rf\b|antenna|radio.frequency|vlc|visible.light|signal.processing|communication.network|optical/i,
 ai:/\bai\b|machine.learning|artificial.intelligence|agentic|autonomous|reinforcement.learning|data.science|computational/i,
 secure:/security|cyber|trusted|robotics?|iot|edge.comput|autonomous/i,
}
export function nzJobFitScore(job:NzAcademicJob,priority:CareerPriority="balanced"):number{
 const content=[job.title,...job.topics,job.fit_note].join(" ")
 const telecom=FIELDS.telecom.test(content),ai=FIELDS.ai.test(content),secure=FIELDS.secure.test(content)
 let score=job.role==="postdoc"?18:job.role==="researcher"?17:job.role==="lecturer"?11:0
 score+=job.fit==="high"?18:job.fit==="medium"?10:0
 if(priority==="telecom"){score+=telecom?48:0;score+=ai?12:0}
 else if(priority==="ai"){score+=ai?46:0;score+=telecom?14:0}
 else {score+=telecom?29:0;score+=ai?26:0}
 if(secure)score+=8
 if(job.status==="official_deadline")score+=7
 return Math.min(100,score)
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
