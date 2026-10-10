import { safeNzPersonalEntry } from "./nz-application.ts"
export type NzAcademicRole = "postdoc" | "lecturer" | "researcher"
export type NzJobStatus = "official_deadline" | "needs_confirmation" | "auto_candidate"
export type NzFit = "high" | "medium" | "low"
export type NzAcademicJob = {
 id:string;title:string;employer:string;city:string;role:NzAcademicRole;topics:string[]
 fit:NzFit;fit_note:string;salary_nzd_year:number|null;salary_note?:string
 contract:string;deadline_day:string|null;status:NzJobStatus;published_at:string|null
 source_url:string;eligibility_note:string;international_note:string;requirements:string[];reviewed_at:string|null
 match_score?:number
}
export type NzInstitution={id:string;name:string;city:string;topics:string[];url:string;note:string;type:string}
export type NzDataset={last_reviewed:string;scope:string;listings:NzAcademicJob[];watchlist:NzInstitution[];excluded_sources:{title:string;reason:string;source_url:string}[]}
export type NzAutoSnapshot={generated_at:string|null;source:string;scope:string;observed_count:number;candidate_count:number;listings:NzAcademicJob[]}
export type NzPersonalStatus="new"|"saved"|"preparing"|"applied"|"dismissed"
export type NzPersonalEntry={status:NzPersonalStatus;note?:string;next_step?:string;checked?:string[];updated_at:string}
export const ROLE_LABEL:Record<NzAcademicRole,string>={
 postdoc:"Postdoc",lecturer:"Lecturer / Faculty",researcher:"Research Scientist / Fellow"
}
export const STATUS_LABEL:Record<NzPersonalStatus,string>={
 new:"Chưa theo dõi",saved:"Quan tâm",preparing:"Chuẩn bị hồ sơ",applied:"Đã ứng tuyển",dismissed:"Bỏ qua"
}
export function nzDay(now=new Date()){
 const p=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Pacific/Auckland"}).formatToParts(now).map(x=>[x.type,x.value]))
 return p.year+"-"+p.month+"-"+p.day
}
export function nzDeadlineState(job:NzAcademicJob,now=new Date()):"open"|"closing_today"|"closed"|"verify"{
 const today=nzDay(now)
 if(job.deadline_day && job.deadline_day<today)return "closed"
 // A stated calendar day is not an exact closing time. Never claim open all day.
 if(job.deadline_day===today && job.status==="official_deadline")return "closing_today"
 return job.status==="official_deadline" ? "open" : "verify"
}
export function displayNzDay(day:string|null):string{
 if(!day)return "Chưa rõ hạn"
 const [y,m,d]=day.split("-")
 return d+"/"+m+"/"+y+" (NZ)"
}
export function isSafeAcademicUrl(value:unknown):value is string{
 if(typeof value!=="string"||value.length>2000)return false
 try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password&&url.hostname.endsWith(".com")||url.protocol==="https:"&&!url.username&&!url.password&&url.hostname.endsWith(".nz")}
 catch{return false}
}
export function normalizeAutoSnapshot(raw:unknown):NzAutoSnapshot|null{
 if(!raw||typeof raw!=="object")return null
 const p=raw as Record<string,unknown>
 if(typeof p.generated_at!=="string"||Number.isNaN(Date.parse(p.generated_at)))return null
 if(!Array.isArray(p.listings)||p.listings.length>30)return null
 const rows:NzAcademicJob[]=[]
 for(const source of p.listings){
  if(!source||typeof source!=="object")return null
  const x=source as Record<string,unknown>
  if(typeof x.id!=="string" || !/^uoa-auto-[0-9a-z-]+$/i.test(x.id) ||
   typeof x.title!=="string"||x.title.length>200||typeof x.employer!=="string"||
   x.employer!=="University of Auckland"||!isSafeAcademicUrl(x.source_url)||
   !x.source_url.startsWith("https://jobs.smartrecruiters.com/TheUniversityOfAuckland/") ||
   x.status!=="auto_candidate"||!["postdoc","lecturer","researcher"].includes(String(x.role)))return null
  if(!Array.isArray(x.topics)||x.topics.some(v=>typeof v!=="string"||v.length>80))return null
  rows.push(x as unknown as NzAcademicJob)
 }
 return {generated_at:p.generated_at,source:typeof p.source==="string"?p.source:"Official SmartRecruiters API",
  scope:typeof p.scope==="string"?p.scope:"Automatically discovered; requires applicant verification.",
  observed_count:Number(p.observed_count)||0,candidate_count:Number(p.candidate_count)||0,listings:rows}
}
export function mergedNzJobs(manual:NzAcademicJob[],automatic:NzAcademicJob[]):NzAcademicJob[]{
 const saved=new Map<string,NzAcademicJob>()
 const canonical=(url:string)=>{try{const u=new URL(url);const m=u.pathname.match(/\/TheUniversityOfAuckland\/(\d+)/i);return m?"uoa:"+m[1]:u.origin+u.pathname.toLowerCase()}catch{return url}}
 for(const row of manual)saved.set(canonical(row.source_url),row)
 for(const row of automatic){const key=canonical(row.source_url);if(!saved.has(key))saved.set(key,row)}
 return [...saved.values()]
}
export function loadNzTracking(key="nzAcademicJobs.v1"):Record<string,NzPersonalEntry>{
 try{
  const src=localStorage.getItem(key)
  if(!src||src.length>100000)return {}
  const raw:unknown=JSON.parse(src)
  if(!raw||typeof raw!=="object"||Array.isArray(raw))return {}
  return Object.fromEntries(Object.entries(raw as Record<string,unknown>).slice(0,250).flatMap(([id,obj])=>{
   if(!/^[a-zA-Z0-9-]{2,100}$/.test(id))return []
   const safe=safeNzPersonalEntry(obj)
   return safe?[[id,safe]]:[]

  }))
 }catch{return {}}
}
