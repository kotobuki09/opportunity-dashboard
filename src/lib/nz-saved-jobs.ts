import type {NzAcademicJob,NzPersonalEntry} from "./nz-jobs"

/**
 * Keep a bounded, privately stored description of an automated vacancy.
 * A saved listing can disappear from a subsequent API snapshot, but the
 * applicant's work must not disappear with it. Stored copies are NEVER
 * eligible for "currently hiring" or "officially verified" badges.
 */
export type NzSavedJobSnapshot=Pick<NzAcademicJob,
 "id"|"title"|"employer"|"city"|"role"|"topics"|"source_url">&{saved_at:string}

const SAFE_ID=/^uoa-auto-\d{6,18}$/
const ROLES=new Set(["postdoc","researcher","lecturer"])
export function validAutoJobUrl(raw:unknown,id:string):raw is string{
 if(typeof raw!=="string"||raw.length>1000||!SAFE_ID.test(id))return false
 try{
  const url=new URL(raw)
  if(url.protocol!=="https:"||url.username||url.password||url.hostname!=="jobs.smartrecruiters.com")return false
  const match=/^\/TheUniversityOfAuckland\/(\d{6,18})(?:-[^/]*|\/?)$/.exec(url.pathname)
  return !!match && id==="uoa-auto-"+match[1]
 }catch{return false}
}
const safeText=(v:unknown,max:number)=>typeof v==="string"&&v.trim().length>0&&v.length<=max
export function nzSnapshotFromJob(job:NzAcademicJob,at=new Date()):NzSavedJobSnapshot|null{
 if(job.status!=="auto_candidate")return null
 const value={id:job.id,title:job.title,employer:job.employer,city:job.city,
  role:job.role,topics:job.topics,source_url:job.source_url,saved_at:at.toISOString()}
 return safeNzJobSnapshot(value)
}
export function safeNzJobSnapshot(raw:unknown):NzSavedJobSnapshot|null{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null
 const r=raw as Record<string,unknown>
 if(typeof r.id!=="string"||!SAFE_ID.test(r.id)||!validAutoJobUrl(r.source_url,r.id)||
  !safeText(r.title,200)||r.employer!=="University of Auckland"||
  !safeText(r.city,100)||!ROLES.has(String(r.role))||
  !Array.isArray(r.topics)||r.topics.length>12||r.topics.some(t=>!safeText(t,80))||
  typeof r.saved_at!=="string"||Number.isNaN(Date.parse(r.saved_at)))return null
 return {id:r.id,title:r.title as string,employer:"University of Auckland",city:r.city as string,
  role:r.role as NzAcademicJob["role"],topics:r.topics as string[],
  source_url:r.source_url as string,saved_at:r.saved_at}
}
export function restoreNzArchivedJobs(
 current:NzAcademicJob[],tracked:Record<string,NzPersonalEntry>
):NzAcademicJob[]{
 const seen=new Set(current.map(job=>job.id))
 const saved:NzAcademicJob[]=[]
 for(const [id,entry] of Object.entries(tracked)){
  if(seen.has(id)||!["saved","preparing","applied"].includes(entry.status))continue
  const snapshot=safeNzJobSnapshot(entry.job_snapshot)
  if(!snapshot||snapshot.id!==id)continue
  saved.push({
   ...snapshot,
   fit:"low",fit_note:"Tin đã lưu từ bản quét trước và không còn trong danh sách đang phát hiện. Kiểm tra trực tiếp nguồn tuyển dụng trước khi tiếp tục.",
   salary_nzd_year:null,contract:"Chưa có dữ liệu cập nhật",
   deadline_day:null,status:"auto_candidate",published_at:null,
   eligibility_note:"Không có xác minh mới cho tin đã rời nguồn tuyển dụng.",
   international_note:"Chưa xác minh điều kiện quốc tế hoặc visa.",
   requirements:["Xem trực tiếp cổng tuyển dụng để xác nhận còn nhận hồ sơ"],
   reviewed_at:null,
  })
 }
 return saved
}
export function mergeNzSavedJobs(current:NzAcademicJob[],tracked:Record<string,NzPersonalEntry>){
 const archived=restoreNzArchivedJobs(current,tracked)
 return {jobs:[...current,...archived],archivedIds:new Set(archived.map(job=>job.id))}
}
