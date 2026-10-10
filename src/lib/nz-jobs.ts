import { safeNzPersonalEntry } from "./nz-application.ts"
import { validAutoJobUrl } from "./nz-saved-jobs"
import type { NzSavedJobSnapshot } from "./nz-saved-jobs"
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
export type NzPersonalEntry={status:NzPersonalStatus;note?:string;next_step?:string;checked?:string[];updated_at:string;job_snapshot?:NzSavedJobSnapshot}
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
/**
 * API snapshots are untrusted data, even if previously fetched by a GitHub bot.
 * Validate every field used by cards, search, sorting and application actions.
 * One malformed row fails the snapshot closed; manual vetted rows still render.
 */
export function normalizeAutoSnapshot(raw:unknown):NzAutoSnapshot|null{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null
 const p=raw as Record<string,unknown>
 if(typeof p.generated_at!=="string"||Number.isNaN(Date.parse(p.generated_at)))return null
 if(!Array.isArray(p.listings)||p.listings.length>30)return null
 const string=(v:unknown,max:number)=>typeof v==="string"&&v.trim().length>0&&v.length<=max
 const optionalDay=(v:unknown)=>v===null||(
  typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&
  new Date(v+"T00:00:00Z").toISOString().startsWith(v)
 )
 const rows:NzAcademicJob[]=[]
 const ids=new Set<string>()
 for(const source of p.listings){
  if(!source||typeof source!=="object"||Array.isArray(source))return null
  const x=source as Record<string,unknown>
  if(typeof x.id!=="string"||!/^uoa-auto-\d{6,18}$/.test(x.id)||
   ids.has(x.id)||x.employer!=="University of Auckland"||
   !validAutoJobUrl(x.source_url,x.id)||
   !string(x.title,200)||!string(x.city,100)||!string(x.fit_note,500)||
   !string(x.contract,500)||!string(x.eligibility_note,500)||
   !string(x.international_note,500)||
   !["postdoc","lecturer","researcher"].includes(String(x.role))||
   !["low","medium","high"].includes(String(x.fit))||
   x.status!=="auto_candidate"||x.deadline_day!==null||
   x.reviewed_at!==null||x.salary_nzd_year!==null||
   !optionalDay(x.published_at)||
   !Array.isArray(x.topics)||x.topics.length>12||
   x.topics.some(v=>!string(v,80))||
   !Array.isArray(x.requirements)||x.requirements.length>12||
   x.requirements.some(v=>!string(v,400))||
   (x.salary_note!==undefined&&!string(x.salary_note,300))||
   (x.match_score!==undefined&&(!Number.isFinite(x.match_score)||Number(x.match_score)<0||Number(x.match_score)>100))
  )return null
  ids.add(x.id)
  rows.push({
   id:x.id,title:x.title as string,employer:"University of Auckland",
   city:x.city as string,role:x.role as NzAcademicRole,
   topics:x.topics as string[],fit:x.fit as NzFit,
   fit_note:x.fit_note as string,contract:x.contract as string,
   salary_nzd_year:null,deadline_day:null,
   status:"auto_candidate",published_at:x.published_at as string|null,
   source_url:x.source_url as string,eligibility_note:x.eligibility_note as string,
   international_note:x.international_note as string,
   requirements:x.requirements as string[],reviewed_at:null,
   ...(typeof x.salary_note==="string"?{salary_note:x.salary_note}:{}),
   ...(typeof x.match_score==="number"?{match_score:x.match_score}:{}),
  })
 }
 return {
  generated_at:p.generated_at,
  source:typeof p.source==="string"?p.source.slice(0,200):"Official SmartRecruiters API",
  scope:typeof p.scope==="string"?p.scope.slice(0,350):"Automatically discovered; requires applicant verification.",
  observed_count:Number.isInteger(p.observed_count)&&Number(p.observed_count)>=0?Math.min(10000,p.observed_count as number):0,
  candidate_count:Number.isInteger(p.candidate_count)&&Number(p.candidate_count)>=0?Math.min(10000,p.candidate_count as number):0,
  listings:rows,
 }
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
  // Bound storage to 2 MB so a valid collection of 250 private entries is not silently erased.
  if(!src||src.length>2_000_000)return {}
  const raw:unknown=JSON.parse(src)
  if(!raw||typeof raw!=="object"||Array.isArray(raw))return {}
  return Object.fromEntries(Object.entries(raw as Record<string,unknown>).slice(0,250).flatMap(([id,obj])=>{
   if(!/^[a-zA-Z0-9-]{2,100}$/.test(id))return []
   const safe=safeNzPersonalEntry(obj)
   return safe?[[id,safe]]:[]

  }))
 }catch{return {}}
}
