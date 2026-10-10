import * as React from "react"
import { CalendarPlusIcon, ExternalLinkIcon, RadarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { displayNzDay, nzDeadlineState, type NzAcademicJob } from "@/lib/nz-jobs"

// Hand-picked destinations, not machine-discovered current vacancies.
const SEARCHES = [
 {label:"UC · Careers",href:"https://www.canterbury.ac.nz/about-uc/work-at-uc",topics:"Wireless · networking · engineering"},
 {label:"University of Auckland",href:"https://www.careers.auckland.ac.nz/academic-careers/",topics:"AI · machine learning · autonomy"},
 {label:"AUT · Academic careers",href:"https://www.aut.ac.nz/about/careers-at-aut/academic-university-careers-at-aut",topics:"Telecommunications · computing"},
 {label:"Waikato · Careers",href:"https://www.waikato.ac.nz/int/about/careers/information-for-applicants/",topics:"AI · cybersecurity · computer science"},
 {label:"Victoria Wellington",href:"https://www.wgtn.ac.nz/about/working-here/current-vacancies-broadbean",topics:"Software · AI · networks"},
 {label:"Otago · Vacancies",href:"https://otago.taleo.net/careersection/2/joblist.ftl?lang=en",topics:"AI · data science · research"},
]
function escapeIcs(s:string){return s.replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;")}
export function buildNzDeadlineIcs(jobs:NzAcademicJob[], now=new Date()):string {
 const events=jobs.filter(j=>j.status==="official_deadline"&&j.deadline_day&&nzDeadlineState(j,now)!=="closed")
  .map(j=>{
   // All-day NZ calendar date: no invented hour or UTC offset.
   const date=j.deadline_day!.replace(/-/g,"")
   const next=new Date(j.deadline_day+"T12:00:00Z")
   next.setUTCDate(next.getUTCDate()+1)
   const end=next.toISOString().slice(0,10).replace(/-/g,"")
   const desc=escapeIcs("Official advertised closing calendar day (NZ). Check actual cut-off time and eligibility on employer portal: "+j.source_url)
   return ["BEGIN:VEVENT","UID:"+escapeIcs(j.id)+"@opportunity-scout","DTSTAMP:"+new Date(now).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,""),"DTSTART;VALUE=DATE:"+date,"DTEND;VALUE=DATE:"+end,"SUMMARY:"+escapeIcs("Academic job deadline: "+j.title),"DESCRIPTION:"+desc,"URL:"+j.source_url,"BEGIN:VALARM","TRIGGER:-P1D","ACTION:DISPLAY","DESCRIPTION:Check university job deadline","END:VALARM","END:VEVENT"].join("\r\n")
  })
 return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Opportunity Scout//NZ Academic Deadlines//EN","CALSCALE:GREGORIAN",...events,"END:VCALENDAR"].join("\r\n")+"\r\n"
}
export function NzCareerTools({jobs,now}:{jobs:NzAcademicJob[];now:Date}){
 const count=jobs.filter(j=>j.status==="official_deadline"&&j.deadline_day&&nzDeadlineState(j,now)!=="closed").length
 const saveCalendar=()=>{
  const url=URL.createObjectURL(new Blob([buildNzDeadlineIcs(jobs,now)],{type:"text/calendar;charset=utf-8"}))
  const a=document.createElement("a");a.href=url;a.download="nz-academic-deadlines.ics";a.click()
  window.setTimeout(()=>URL.revokeObjectURL(url),1000)
 }
 return <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5" aria-label="Academic career discovery tools">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><h4 className="flex items-center gap-2 text-sm font-semibold"><RadarIcon className="size-4"/> Tìm cơ hội trong tương lai</h4><p className="mt-1 text-xs text-muted-foreground">Tra cứu tuyển dụng chính thức. Liên kết dưới đây là cổng tuyển, không phải lời khẳng định đang có vị trí trống.</p></div>
   <Button variant="outline" size="sm" disabled={count===0} onClick={saveCalendar}><CalendarPlusIcon className="size-4"/> Xuất {count} hạn đã xác minh (.ics)</Button>
  </div>
  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
   {SEARCHES.map(s=><a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="rounded-lg border p-3 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring">
    <span className="flex items-center justify-between gap-2 text-sm font-medium">{s.label}<ExternalLinkIcon className="size-3.5 shrink-0"/></span><span className="mt-1 block text-xs text-muted-foreground">{s.topics}</span>
   </a>)}
  </div>
  <p className="text-xs text-muted-foreground">Lịch dùng ngày tại New Zealand, không tự đặt giờ kết thúc. Tin có hạn chưa xác minh không được đưa vào lịch. Lần đối chiếu gần nhất: {displayNzDay(now.toISOString().slice(0,10))} chỉ là ngày xem, không phải ngày xác minh nguồn.</p>
 </section>
}
