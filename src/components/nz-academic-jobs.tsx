import * as React from "react"
import { ArrowUpRightIcon, BellIcon, BookmarkIcon, BriefcaseBusinessIcon, DownloadIcon, ExternalLinkIcon, GraduationCapIcon, MapPinIcon, SearchIcon, ShieldAlertIcon, UploadIcon } from "lucide-react"
import { toast } from "sonner"
import curatedRaw from "../../data/nz-academic-jobs.json"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ROLE_LABEL, STATUS_LABEL, displayNzDay, loadNzTracking, mergedNzJobs, normalizeAutoSnapshot, nzDeadlineState, nzDay, type NzAcademicJob, type NzAutoSnapshot, type NzDataset, type NzPersonalEntry, type NzPersonalStatus } from "@/lib/nz-jobs"

const DATA=curatedRaw as unknown as NzDataset
type Role="all"|"postdoc"|"researcher"|"lecturer"
type Field="all"|"telecom"|"ai"|"autonomous"
type Scope="actionable"|"saved"|"all"
const KEY="nzAcademicJobs.v1"
const MATCH:Record<Field,string[]>={all:[],telecom:["telecom","wireless","6g","rf","communication","signal","iot"],ai:["ai","artificial intelligence","data science","machine learning"],autonomous:["agentic","autonomous","robot","computational","complex systems"]}
const exportBackup=(value:unknown)=>{
 const href=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+"\n"],{type:"application/json"}))
 const a=document.createElement("a");a.href=href;a.download="nz-academic-job-tracking.json";a.click()
 window.setTimeout(()=>URL.revokeObjectURL(href),1000)
}
export function NzAcademicJobs({now=new Date()}:{now?:Date}){
 const [mode,setMode]=React.useState<"jobs"|"universities">("jobs")
 const [scope,setScope]=React.useState<Scope>("actionable")
 const [role,setRole]=React.useState<Role>("all")
 const [field,setField]=React.useState<Field>("all")
 const [query,setQuery]=React.useState("")
 const [tracked,setTracked]=React.useState<Record<string,NzPersonalEntry>>(()=>loadNzTracking())
 const [snapshot,setSnapshot]=React.useState<NzAutoSnapshot|null>(null)
 const [feedStatus,setFeedStatus]=React.useState<"loading"|"ready"|"unavailable">("loading")
 const importInput=React.useRef<HTMLInputElement>(null)
 React.useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(tracked))}catch{ /* optional */ }},[tracked])
 React.useEffect(()=>{
  const controller=new AbortController()
  fetch(import.meta.env.BASE_URL+"nz-academic-jobs-auto.json",{signal:controller.signal,cache:"no-store"})
   .then(async response=>{if(!response.ok)throw Error("Feed unavailable");return response.json()})
   .then(raw=>{
    if(controller.signal.aborted)return
    const parsed=normalizeAutoSnapshot(raw)
    const age=parsed?.generated_at?(Date.now()-Date.parse(parsed.generated_at))/86400000:Infinity
    if(parsed&&age>=-1&&age<=14){setSnapshot(parsed);setFeedStatus("ready")}
    else setFeedStatus("unavailable")
   })
   .catch(()=>{if(!controller.signal.aborted)setFeedStatus("unavailable")})
  return ()=>controller.abort()
 },[])
 const jobs=React.useMemo(()=>mergedNzJobs(DATA.listings,snapshot?.listings||[]),[snapshot])
 const changeStatus=(id:string,status:NzPersonalStatus)=>setTracked(prev=>({...prev,[id]:{...prev[id],status,updated_at:new Date().toISOString()}}))
 const changeNote=(id:string,note:string)=>setTracked(prev=>({...prev,[id]:{status:prev[id]?.status||"new",note:note.slice(0,2000),updated_at:new Date().toISOString()}}))
 const filtered=jobs.filter(job=>{
  const active=nzDeadlineState(job,now)
  const personal=tracked[job.id]?.status||"new"
  if(scope==="actionable"&&(active==="closed"||personal==="dismissed"))return false
  if(scope==="saved"&&!["saved","preparing","applied"].includes(personal))return false
  if(role!=="all"&&job.role!==role)return false
  const content=(job.title+" "+job.employer+" "+job.city+" "+job.topics.join(" ")+" "+job.fit_note).toLowerCase()
  if(field!=="all"&&!MATCH[field].some(t=>content.includes(t)))return false
  return content.includes(query.trim().toLowerCase())
 }).sort((a,b)=>{
  const rank=(j:NzAcademicJob)=>nzDeadlineState(j,now)==="closed"?3:j.status==="official_deadline"?0:j.status==="needs_confirmation"?1:2
  const r=rank(a)-rank(b)
  return r||String(a.deadline_day||"9999").localeCompare(String(b.deadline_day||"9999"))
 })
 const active=jobs.filter(j=>nzDeadlineState(j,now)==="open").length
 const saved=Object.values(tracked).filter(x=>["saved","preparing","applied"].includes(x.status)).length
 const importBackup=async(file:File)=>{
  if(file.size>100000)throw Error("File theo dõi quá lớn")
  const raw:unknown=JSON.parse(await file.text())
  if(!raw||typeof raw!=="object")throw Error("File không hợp lệ")
  const v=raw as Record<string,unknown>
  if(v.app!=="nz-academic-jobs"||v.version!==1||!v.items||typeof v.items!=="object")throw Error("Sai định dạng bản sao lưu")
  const known=new Set(jobs.map(j=>j.id)),update:Record<string,NzPersonalEntry>={}
  for(const [id,value] of Object.entries(v.items as Record<string,unknown>)){
   if(!known.has(id)||!value||typeof value!=="object")continue
   const e=value as Record<string,unknown>
   if(!["new","saved","preparing","applied","dismissed"].includes(String(e.status)))continue
   update[id]={status:e.status as NzPersonalStatus,note:typeof e.note==="string"?e.note.slice(0,2000):"",updated_at:new Date().toISOString()}
  }
  setTracked(prev=>({...prev,...update}));toast.success("Đã nhập "+Object.keys(update).length+" mục.")
 }
 return <section className="space-y-5 px-4 pb-8 lg:px-6">
  <div className="rounded-2xl border bg-gradient-to-br from-blue-50 via-card to-cyan-50/50 p-5 dark:from-blue-950/35 dark:via-card dark:to-slate-900 sm:p-7">
   <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
    <div className="max-w-2xl">
     <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-blue-700 dark:text-blue-300"><GraduationCapIcon className="size-5"/> Academic Career Radar · New Zealand</span>
     <h3 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">Research, Postdoc & Faculty Positions</h3>
     <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Tìm việc làm học thuật dành cho PhD về <strong className="text-foreground">Telecommunications, Wireless/6G, AI, IoT và Autonomous Systems</strong>. Ưu tiên trường đại học và phòng nghiên cứu ở New Zealand.</p>
     <p className="mt-2 text-xs text-muted-foreground">Hôm nay tại New Zealand: {displayNzDay(nzDay(now))} · Đối chiếu thủ công: {displayNzDay(DATA.last_reviewed)}</p>
    </div>
    <div className="grid grid-cols-3 gap-2 md:min-w-72">
     {([["Hạn chính thức",active],["API phát hiện",snapshot?.listings.length||0],["Đang theo dõi",saved]] as [string,number][]).map(([label,value])=>
      <div key={label} className="rounded-xl border bg-background/85 px-3 py-3 text-center"><strong className="block text-2xl font-semibold tabular-nums">{value}</strong><span className="mt-1 block text-[11px] text-muted-foreground">{label}</span></div>)}
    </div>
   </div>
  </div>
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1" role="group" aria-label="Chọn khu vực việc làm">
    <Button size="sm" variant={mode==="jobs"?"secondary":"ghost"} aria-pressed={mode==="jobs"} onClick={()=>setMode("jobs")}><BriefcaseBusinessIcon className="size-4"/> Vị trí tuyển dụng</Button>
    <Button size="sm" variant={mode==="universities"?"secondary":"ghost"} aria-pressed={mode==="universities"} onClick={()=>setMode("universities")}><BellIcon className="size-4"/> Theo dõi trường & viện</Button>
   </div>
   <div className="flex gap-2">
    <Button variant="outline" size="sm" onClick={()=>exportBackup({app:"nz-academic-jobs",version:1,exported_at:new Date().toISOString(),items:tracked})}><DownloadIcon className="size-4"/> Xuất</Button>
    <Button variant="outline" size="sm" onClick={()=>importInput.current?.click()}><UploadIcon className="size-4"/> Nhập</Button>
   </div>
  </div>
  {mode==="universities"?<>
   <div className="rounded-xl border bg-blue-500/5 p-4 text-sm text-muted-foreground"><BellIcon className="mr-2 inline size-4"/>Các đơn vị bên dưới là <strong className="text-foreground">nguồn tìm việc trong tương lai, không phải tin đang tuyển</strong>. Mở cổng chính thức và đăng ký job alert nếu có.</div>
   <div className="grid gap-3 md:grid-cols-2">
    {DATA.watchlist.map(x=><article key={x.id} className="rounded-xl border bg-card p-5">
     <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">{x.city}, New Zealand</p>
     <h4 className="mt-2 text-base font-semibold">{x.name}</h4>
     <div className="mt-2 flex flex-wrap gap-1">{x.topics.map(t=><Badge key={t} variant="secondary">{t}</Badge>)}</div>
     <p className="mt-3 text-sm text-muted-foreground">{x.note}</p>
     <Button size="sm" variant="outline" className="mt-4" asChild><a href={x.url} target="_blank" rel="noopener noreferrer">Tuyển dụng chính thức <ExternalLinkIcon className="size-4"/></a></Button>
    </article>)}
   </div>
  </>:<>
   <div className="flex flex-wrap gap-2 rounded-xl border bg-card p-4">
    <div className="relative min-w-48 flex-1"><SearchIcon className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input className="pl-9" aria-label="Tìm vị trí học thuật" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Postdoc, agentic AI, RF, university…"/></div>
    <Select value={role} onValueChange={v=>setRole(v as Role)}><SelectTrigger className="w-full sm:w-44" aria-label="Lọc cấp bậc học thuật"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Mọi vị trí</SelectItem><SelectItem value="postdoc">Postdoc</SelectItem><SelectItem value="researcher">Research Fellow</SelectItem><SelectItem value="lecturer">Lecturer / Faculty</SelectItem></SelectContent></Select>
    <Select value={field} onValueChange={v=>setField(v as Field)}><SelectTrigger className="w-full sm:w-44" aria-label="Lọc chuyên ngành học thuật"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Mọi chuyên ngành</SelectItem><SelectItem value="telecom">Telecom / Wireless</SelectItem><SelectItem value="ai">AI / Data Science</SelectItem><SelectItem value="autonomous">Agentic / Autonomous</SelectItem></SelectContent></Select>
    <Select value={scope} onValueChange={v=>setScope(v as Scope)}><SelectTrigger className="w-full sm:w-44" aria-label="Lọc trạng thái việc làm"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="actionable">Đang xem xét</SelectItem><SelectItem value="saved">Đã lưu / đã nộp</SelectItem><SelectItem value="all">Kể cả đã hết hạn</SelectItem></SelectContent></Select>
   </div>
   <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
    <span>{filtered.length} vị trí phù hợp bộ lọc</span>
    <span>{feedStatus==="ready"&&snapshot?.generated_at?"Tin tự động từ cổng chính thức · "+new Date(snapshot.generated_at).toLocaleDateString("vi-VN"):feedStatus==="loading"?"Đang tải dữ liệu...":"Chưa có bản quét mới · vẫn dùng dữ liệu thủ công"}</span>
   </div>
   <div className="grid gap-3">
    {filtered.map(job=>{
     const state=nzDeadlineState(job,now)
     const progress=tracked[job.id]?.status||"new"
     return <article key={job.id} className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
       <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-1.5">
         <Badge variant="outline">{ROLE_LABEL[job.role]}</Badge>
         {state==="open"?<Badge className="bg-emerald-600 text-white">Hạn trên nguồn chính thức</Badge>:state==="closed"?<Badge variant="secondary">Đã hết hạn</Badge>:<Badge variant="outline" className="border-amber-500/50 text-amber-800 dark:text-amber-300"><ShieldAlertIcon className="size-3"/> Cần xác minh đang tuyển</Badge>}
         {job.status==="auto_candidate"&&<Badge variant="outline" className="border-blue-400/50 text-blue-700 dark:text-blue-300">API phát hiện · chưa duyệt</Badge>}
        </div>
        <h4 className="mt-2 text-base font-semibold sm:text-lg">{job.title}</h4>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
         <span><GraduationCapIcon className="mr-1 inline size-3.5"/>{job.employer}</span>
         <span><MapPinIcon className="mr-1 inline size-3.5"/>{job.city}, NZ</span>
         <span>{displayNzDay(job.deadline_day)}</span>
        </div>
       </div>
       <Button size="sm" asChild><a href={job.source_url} target="_blank" rel="noopener noreferrer">Xem / Apply <ArrowUpRightIcon className="size-4"/></a></Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">{job.topics.map(t=><Badge key={t} variant="secondary">{t}</Badge>)}</div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{job.fit_note}</p>
      <div className="mt-3 grid gap-3 rounded-lg border bg-muted/25 p-3 text-xs sm:grid-cols-2">
       <p><strong>Điều kiện:</strong> {job.eligibility_note}</p>
       <p><strong>Visa:</strong> {job.international_note}</p>
       {job.salary_nzd_year&&<p><strong>Lương:</strong> NZ$ {job.salary_nzd_year.toLocaleString("en-NZ")} / năm</p>}
       {job.salary_note&&<p><strong>Lương tham khảo:</strong> {job.salary_note}</p>}
       <p><strong>Hợp đồng:</strong> {job.contract}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
       <label className="text-xs font-medium">Theo dõi ứng tuyển</label>
       <Select value={progress} onValueChange={v=>changeStatus(job.id,v as NzPersonalStatus)}>
        <SelectTrigger className="w-full sm:w-48" aria-label={"Trạng thái ứng tuyển: "+job.title}><SelectValue/></SelectTrigger>
        <SelectContent>{(Object.entries(STATUS_LABEL) as [NzPersonalStatus,string][]).map(([v,label])=><SelectItem key={v} value={v}>{label}</SelectItem>)}</SelectContent>
       </Select>
       {progress!=="new"&&<span className="text-xs text-blue-700 dark:text-blue-300"><BookmarkIcon className="mr-1 inline size-3.5"/> Lưu ở trình duyệt</span>}
      </div>
      {progress!=="new"&&progress!=="dismissed"&&<div className="mt-3 space-y-1">
       <label className="text-xs font-medium" htmlFor={"nz-note-"+job.id}>Ghi chú cá nhân</label>
       <Input id={"nz-note-"+job.id} value={tracked[job.id]?.note||""} maxLength={2000} onChange={e=>changeNote(job.id,e.target.value)} placeholder="CV, liên hệ PI, đề cương, visa…"/>
      </div>}
     </article>
    })}
    {!filtered.length&&<div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">Chưa có việc phù hợp. Hãy mở “Theo dõi trường & viện” hoặc điều chỉnh bộ lọc.</div>}
   </div>
  </>}
  <p className="rounded-xl border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
   <ShieldAlertIcon className="mr-1 inline size-4"/> Không coi dữ liệu từ API là xác minh điều kiện/visa. Các hạn nộp chỉ chính thức khi có nguồn cụ thể; không tự đặt giờ. Hồ sơ nghiên cứu, ghi chú và trạng thái ứng tuyển được giữ trong trình duyệt của bạn.
  </p>
  <input ref={importInput} type="file" accept=".json,application/json" hidden onChange={async e=>{const file=e.target.files?.[0];e.target.value="";if(!file)return;try{await importBackup(file)}catch(err){toast.error(err instanceof Error?err.message:"File không hợp lệ")}}}/>
 </section>
}
