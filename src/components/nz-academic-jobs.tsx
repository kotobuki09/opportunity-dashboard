import * as React from "react"
import { ArrowUpRightIcon, BellIcon, BookmarkIcon, BriefcaseBusinessIcon, DownloadIcon, ExternalLinkIcon, GraduationCapIcon, ListChecksIcon, MapPinIcon, SearchIcon, ShieldAlertIcon, UploadIcon, ScaleIcon, RotateCcwIcon } from "lucide-react"
import { toast } from "sonner"
import curatedRaw from "../../data/nz-academic-jobs.json"
import { nzJobFitDetails, nzCalendarEvent, nzDaysUntilDeadline, sortNzAcademicJobs, type CareerPriority, type CareerSort } from "@/lib/nz-career-tools"
import { NzApplicationWorkspace } from "@/components/nz-application-workspace"
import { NzJobCompare } from "@/components/nz-job-compare"
import { nzToggleChecklist, safeNzPersonalEntry, type NzApplicationTaskId } from "@/lib/nz-application"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
 const [mode,setMode]=React.useState<"jobs"|"applications"|"universities">("jobs")
 const [scope,setScope]=React.useState<Scope>("actionable")
 const [role,setRole]=React.useState<Role>("all")
 const [field,setField]=React.useState<Field>("all")
 const [query,setQuery]=React.useState("")
 const [priority,setPriority]=React.useState<CareerPriority>("balanced")
 const [sortBy,setSortBy]=React.useState<CareerSort>("deadline")
 const [employer,setEmployer]=React.useState("all")
 const [compareIds,setCompareIds]=React.useState<string[]>([])
 const [watchQuery,setWatchQuery]=React.useState("")
 const [verifiedOnly,setVerifiedOnly]=React.useState(false)
 const [tracked,setTracked]=React.useState<Record<string,NzPersonalEntry>>(()=>loadNzTracking())
 const [snapshot,setSnapshot]=React.useState<NzAutoSnapshot|null>(null)
 const [feedStatus,setFeedStatus]=React.useState<"loading"|"ready"|"unavailable">("loading")
 const importInput=React.useRef<HTMLInputElement>(null)
 React.useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(tracked))}catch{ /* optional */ }},[tracked])
 React.useEffect(()=>{
  const onStorage=(event:StorageEvent)=>{if(event.key===KEY)setTracked(loadNzTracking())}
  window.addEventListener("storage",onStorage)
  return ()=>window.removeEventListener("storage",onStorage)
 },[])
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
 const changeNote=(id:string,note:string)=>setTracked(prev=>({...prev,[id]:{...prev[id],status:prev[id]?.status||"saved",note:note.slice(0,2000),updated_at:new Date().toISOString()}}))
 const changeNextStep=(id:string,nextStep:string)=>setTracked(prev=>({...prev,[id]:{...prev[id],status:prev[id]?.status||"saved",next_step:nextStep.slice(0,250),updated_at:new Date().toISOString()}}))
 const toggleTask=(id:string,task:NzApplicationTaskId)=>setTracked(prev=>({...prev,[id]:{...prev[id],status:prev[id]?.status==="new"||!prev[id]?"saved":prev[id].status,checked:nzToggleChecklist(prev[id],task),updated_at:new Date().toISOString()}}))
 const toggleCompare=(id:string)=>setCompareIds(prev=>prev.includes(id)?prev.filter(value=>value!==id):prev.length<3?[...prev,id]:prev)
 const resetFilters=()=>{setQuery("");setRole("all");setField("all");setScope("actionable");setVerifiedOnly(false);setEmployer("all");setSortBy("deadline")}
 const employers=React.useMemo(()=>[...new Set(jobs.map(job=>job.employer))].sort(),[jobs])
 const filtered=sortNzAcademicJobs(jobs.filter(job=>{
  const active=nzDeadlineState(job,now)
  const personal=tracked[job.id]?.status||"new"
  if(scope==="actionable"&&(active==="closed"||personal==="dismissed"))return false
  if(verifiedOnly&&job.status!=="official_deadline")return false
  if(scope==="saved"&&!["saved","preparing","applied"].includes(personal))return false
  if(role!=="all"&&job.role!==role)return false
  if(employer!=="all"&&job.employer!==employer)return false
  const disciplines=(job.title+" "+job.topics.join(" ")).toLowerCase()
  const content=(job.title+" "+job.employer+" "+job.city+" "+job.topics.join(" ")+" "+job.fit_note).toLowerCase()
  if(field!=="all"&&!MATCH[field].some(t=>disciplines.includes(t)))return false
  return content.includes(query.trim().toLowerCase())
 }),sortBy,priority,nzDay(now))
 const compared=jobs.filter(job=>compareIds.includes(job.id))
 const savedJobs=jobs.filter(job=>["saved","preparing","applied"].includes(tracked[job.id]?.status||"new"))
 const watchlist=DATA.watchlist.filter(w=>{
  const value=[w.name,w.city,...w.topics,w.note].join(" ").toLowerCase()
  return value.includes(watchQuery.trim().toLowerCase())
 })
 const active=jobs.filter(j=>["open","closing_today"].includes(nzDeadlineState(j,now))).length
 const downloadCalendar=(job:NzAcademicJob)=>{
  try{
   const blob=new Blob([nzCalendarEvent(job)],{type:"text/calendar;charset=utf-8"})
   const url=URL.createObjectURL(blob),a=document.createElement("a")
   a.href=url;a.download="nz-job-deadline-"+job.id+".ics";a.click()
   window.setTimeout(()=>URL.revokeObjectURL(url),1000)
   toast.success("Đã xuất lịch. Kiểm tra lại giờ đóng đơn theo múi giờ NZ.")
  }catch(e){toast.error(e instanceof Error?e.message:"Không có hạn chính thức")}
 }
 const saved=savedJobs.length
 const importBackup=async(file:File)=>{
  if(file.size>500000)throw Error("File theo dõi quá lớn")
  const raw:unknown=JSON.parse(await file.text())
  if(!raw||typeof raw!=="object")throw Error("File không hợp lệ")
  const v=raw as Record<string,unknown>
  if(v.app!=="nz-academic-jobs"||v.version!==1||!v.items||typeof v.items!=="object")throw Error("Sai định dạng bản sao lưu")
  const known=new Set(jobs.map(j=>j.id)),update:Record<string,NzPersonalEntry>={}
  for(const [id,value] of Object.entries(v.items as Record<string,unknown>)){
   if(!known.has(id)||!value||typeof value!=="object")continue
   const e=value as Record<string,unknown>
   if(!["new","saved","preparing","applied","dismissed"].includes(String(e.status)))continue
   const safe=safeNzPersonalEntry({...e,updated_at:new Date().toISOString()})
   if(safe)update[id]=safe
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
    <Button size="sm" variant={mode==="jobs"?"secondary":"ghost"} aria-pressed={mode==="jobs"} onClick={()=>setMode("jobs")}><BriefcaseBusinessIcon className="size-4"/> Việc làm</Button>
    <Button size="sm" variant={mode==="applications"?"secondary":"ghost"} aria-pressed={mode==="applications"} onClick={()=>setMode("applications")}><ListChecksIcon className="size-4"/> Hồ sơ của tôi <span className="rounded bg-background/85 px-1.5 text-xs tabular-nums">{saved}</span></Button>
    <Button size="sm" variant={mode==="universities"?"secondary":"ghost"} aria-pressed={mode==="universities"} onClick={()=>setMode("universities")}><BellIcon className="size-4"/> Theo dõi trường & viện</Button>
   </div>
   <div className="flex gap-2">
    <Button variant="outline" size="sm" onClick={()=>exportBackup({app:"nz-academic-jobs",version:1,exported_at:new Date().toISOString(),items:tracked})}><DownloadIcon className="size-4"/> Xuất</Button>
    <Button variant="outline" size="sm" onClick={()=>importInput.current?.click()}><UploadIcon className="size-4"/> Nhập</Button>
   </div>
  </div>
  {mode==="applications"?<NzApplicationWorkspace jobs={jobs} tracked={tracked}
   onChangeStatus={changeStatus} onChangeNote={changeNote} onChangeNextStep={changeNextStep}
   onToggleTask={toggleTask} now={now} onBrowse={()=>{setMode("jobs");setScope("actionable")}}
  />:mode==="universities"?<>
   <div className="rounded-xl border bg-blue-500/5 p-4 text-sm text-muted-foreground"><BellIcon className="mr-2 inline size-4"/>Các đơn vị bên dưới là <strong className="text-foreground">nguồn tìm việc trong tương lai, không phải tin đang tuyển</strong>. Mở cổng chính thức và đăng ký job alert nếu có.</div>
   <div className="relative max-w-lg">
    <SearchIcon className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground"/>
    <Input className="pl-9" aria-label="Tìm trường và viện nghiên cứu tại New Zealand"
     value={watchQuery} onChange={event=>setWatchQuery(event.target.value)}
     placeholder="Canterbury, Wireless, Auckland, AI…"/>
   </div>
   <p className="text-xs text-muted-foreground" role="status">{watchlist.length}/{DATA.watchlist.length} cơ sở đang hiển thị</p>
   <div className="grid gap-3 md:grid-cols-2">
    {watchlist.map(x=><article key={x.id} className="rounded-xl border bg-card p-5">
     <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">{x.city}, New Zealand</p>
     <h4 className="mt-2 text-base font-semibold">{x.name}</h4>
     <div className="mt-2 flex flex-wrap gap-1">{x.topics.map(t=><Badge key={t} variant="secondary">{t}</Badge>)}</div>
     <p className="mt-3 text-sm text-muted-foreground">{x.note}</p>
     <Button size="sm" variant="outline" className="mt-4" asChild><a href={x.url} target="_blank" rel="noopener noreferrer">Tuyển dụng chính thức <ExternalLinkIcon className="size-4"/></a></Button>
    </article>)}
    {!watchlist.length&&<p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Không tìm thấy trường hoặc viện phù hợp. Thử tìm theo tên thành phố hoặc lĩnh vực nghiên cứu.</p>}
   </div>
  </>:<>
   <div className="flex flex-wrap gap-2 rounded-xl border bg-card p-4">
    <div className="relative min-w-48 flex-1"><SearchIcon className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input className="pl-9" aria-label="Tìm vị trí học thuật" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Postdoc, agentic AI, RF, university…"/></div>
    <Select value={priority} onValueChange={v=>setPriority(v as CareerPriority)}>
     <SelectTrigger className="w-full sm:w-44" aria-label="Ưu tiên hồ sơ tiến sĩ"><SelectValue/></SelectTrigger>
     <SelectContent>
      <SelectItem value="balanced">PhD Telecom + AI</SelectItem>
      <SelectItem value="telecom">Ưu tiên Wireless / RF</SelectItem>
      <SelectItem value="ai">Ưu tiên AI / Autonomous</SelectItem>
     </SelectContent>
    </Select>
    <Select value={role} onValueChange={v=>setRole(v as Role)}><SelectTrigger className="w-full sm:w-44" aria-label="Lọc cấp bậc học thuật"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Mọi vị trí</SelectItem><SelectItem value="postdoc">Postdoc</SelectItem><SelectItem value="researcher">Research Fellow</SelectItem><SelectItem value="lecturer">Lecturer / Faculty</SelectItem></SelectContent></Select>
    <Select value={field} onValueChange={v=>setField(v as Field)}><SelectTrigger className="w-full sm:w-44" aria-label="Lọc chuyên ngành học thuật"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Mọi chuyên ngành</SelectItem><SelectItem value="telecom">Telecom / Wireless</SelectItem><SelectItem value="ai">AI / Data Science</SelectItem><SelectItem value="autonomous">Agentic / Autonomous</SelectItem></SelectContent></Select>
    <Select value={scope} onValueChange={v=>setScope(v as Scope)}><SelectTrigger className="w-full sm:w-44" aria-label="Lọc trạng thái việc làm"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="actionable">Đang xem xét</SelectItem><SelectItem value="saved">Đã lưu / đã nộp</SelectItem><SelectItem value="all">Kể cả đã hết hạn</SelectItem></SelectContent></Select>
    <Select value={employer} onValueChange={setEmployer}>
     <SelectTrigger className="w-full sm:w-48" aria-label="Lọc theo đại học và tổ chức tuyển dụng"><SelectValue/></SelectTrigger>
     <SelectContent><SelectItem value="all">Mọi trường / viện</SelectItem>
      {employers.map(name=><SelectItem key={name} value={name}>{name}</SelectItem>)}
     </SelectContent>
    </Select>
    <Select value={sortBy} onValueChange={value=>setSortBy(value as CareerSort)}>
     <SelectTrigger className="w-full sm:w-44" aria-label="Sắp xếp vị trí học thuật"><SelectValue/></SelectTrigger>
     <SelectContent>
      <SelectItem value="deadline">Hạn gần nhất</SelectItem>
      <SelectItem value="fit">Phù hợp chuyên môn</SelectItem>
      <SelectItem value="newest">Đăng gần đây</SelectItem>
     </SelectContent>
    </Select>
    <Button type="button" size="sm" variant="ghost" onClick={resetFilters}><RotateCcwIcon className="size-4"/> Xóa bộ lọc</Button>
   </div>
   <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
     <input type="checkbox" checked={verifiedOnly} onChange={e=>setVerifiedOnly(e.target.checked)} className="size-4 accent-blue-600"/>
     Chỉ có hạn nộp chính thức
    </label>
    <p className="text-xs text-muted-foreground">Tin máy phát hiện chưa được kiểm chứng vẫn được xem ở chế độ đầy đủ. Điểm phù hợp chỉ để sắp xếp, không phải xác suất trúng tuyển.</p>
   </div>
   <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
    <span role="status" aria-live="polite">{filtered.length} vị trí phù hợp bộ lọc · {saved} đang theo dõi</span>
    <span>{feedStatus==="ready"&&snapshot?.generated_at?"Tin tự động từ cổng chính thức · "+new Date(snapshot.generated_at).toLocaleDateString("vi-VN"):feedStatus==="loading"?"Đang tải dữ liệu...":"Chưa có bản quét mới · vẫn dùng dữ liệu thủ công"}</span>
   </div>
   <NzJobCompare jobs={compared} priority={priority} now={now}
    onRemove={id=>toggleCompare(id)} onClear={()=>setCompareIds([])}/>
   <div className="grid gap-3">
    {filtered.map(job=>{
     const state=nzDeadlineState(job,now)
     const progress=tracked[job.id]?.status||"new"
     const fit=nzJobFitDetails(job,priority)
     const remaining=nzDaysUntilDeadline(job,nzDay(now))
     const inCompare=compareIds.includes(job.id)
     return <article key={job.id} className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm transition-[border-color,box-shadow] hover:border-blue-500/30 hover:shadow-md motion-reduce:transition-none sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
       <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-1.5">
         <Badge variant="outline">{ROLE_LABEL[job.role]}</Badge>
         {state==="open"?<Badge className="bg-emerald-600 text-white">Hạn trên nguồn chính thức</Badge>:state==="closing_today"?<Badge className="bg-amber-600 text-white">Hôm nay hạn chót · kiểm tra giờ đóng đơn</Badge>:state==="closed"?<Badge variant="secondary">Đã hết hạn</Badge>:<Badge variant="outline" className="border-amber-500/50 text-amber-800 dark:text-amber-300"><ShieldAlertIcon className="size-3"/> Cần xác minh đang tuyển</Badge>}
         {job.status==="auto_candidate"&&<Badge variant="outline" className="border-blue-400/50 text-blue-700 dark:text-blue-300">API phát hiện · chưa duyệt</Badge>}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
         <div className="min-w-30 max-w-48 flex-1">
          <div className="flex items-center justify-between gap-2 text-xs">
           <span className="font-medium text-muted-foreground">Khớp chuyên môn</span>
           <strong className="tabular-nums text-blue-700 dark:text-blue-300">{fit.score}/100</strong>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar"
           aria-label={"Điểm so khớp: "+job.title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={fit.score}>
           <div className="h-full rounded-full bg-blue-600 transition-[width] motion-reduce:transition-none" style={{width:fit.score+"%"}}/>
          </div>
         </div>
         <span className="text-xs text-muted-foreground">{fit.signals.length?fit.signals.join(" · "):"Chuyên ngành gần, cần đối chiếu"}</span>
        </div>
        <h4 className="mt-2 text-base font-semibold sm:text-lg">{job.title}</h4>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
         <span><GraduationCapIcon className="mr-1 inline size-3.5"/>{job.employer}</span>
         <span><MapPinIcon className="mr-1 inline size-3.5"/>{job.city}, NZ</span>
         <span>{displayNzDay(job.deadline_day)}</span>
         {remaining!==null&&remaining>=0&&remaining<=7&&job.status==="official_deadline"&&<span className="font-semibold text-amber-800 dark:text-amber-300">{remaining===0?"Hôm nay là hạn theo lịch NZ":"Còn "+remaining+" ngày theo lịch NZ"}</span>}
         {job.salary_nzd_year!==null&&<span>NZ$ {job.salary_nzd_year.toLocaleString("en-NZ")}/năm</span>}
        </div>
       </div>
       <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={progress==="new"?"secondary":"outline"}
         onClick={()=>progress==="new"?changeStatus(job.id,"saved"):setMode("applications")}
         aria-label={(progress==="new"?"Lưu việc làm: ":"Mở hồ sơ đang theo dõi: ")+job.title}>
         <BookmarkIcon className="size-4"/>{progress==="new"?"Lưu việc":"Hồ sơ của tôi"}
        </Button>
        <Button size="sm" variant={inCompare?"secondary":"outline"} aria-pressed={inCompare}
         onClick={()=>toggleCompare(job.id)}
         disabled={!inCompare&&compareIds.length>=3}
         aria-label={"So sánh: "+job.title}><ScaleIcon className="size-4"/> {inCompare?"Đã chọn":"So sánh"}</Button>
        {job.status==="official_deadline"&&job.deadline_day&&state!=="closed"&&
         <Button size="sm" variant="outline" onClick={()=>downloadCalendar(job)}><DownloadIcon className="size-4"/> Nhắc hạn (.ics)</Button>}
        <Button size="sm" asChild><a href={job.source_url} target="_blank" rel="noopener noreferrer">Xem / Apply <ArrowUpRightIcon className="size-4"/></a></Button>
       </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">{job.topics.map(t=><Badge key={t} variant="secondary">{t}</Badge>)}</div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{job.fit_note}</p>
      <details className="mt-3 overflow-hidden rounded-lg border bg-muted/15">
       <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Điều kiện PhD · Visa · Lương · Hợp đồng
       </summary>
       <div className="grid gap-3 border-t p-3 text-xs leading-relaxed sm:grid-cols-2">
        <p><strong>Điều kiện:</strong> {job.eligibility_note}</p>
        <p><strong>Visa:</strong> {job.international_note}</p>
        {job.salary_nzd_year&&<p><strong>Lương:</strong> NZ$ {job.salary_nzd_year.toLocaleString("en-NZ")} / năm</p>}
        {job.salary_note&&<p><strong>Lương tham khảo:</strong> {job.salary_note}</p>}
        <p><strong>Hợp đồng:</strong> {job.contract}</p>
       </div>
      </details>
      {job.requirements.length>0&&<details className="mt-3 rounded-lg border bg-card">
       <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-ring">
        Hồ sơ cần chuẩn bị / Đối chiếu yêu cầu
       </summary>
       <ul className="list-disc space-y-1 px-7 pb-3 text-xs leading-relaxed text-muted-foreground">
        {job.requirements.map((item,i)=><li key={i}>{item}</li>)}
       </ul>
      </details>}
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
       <Textarea id={"nz-note-"+job.id} rows={2} value={tracked[job.id]?.note||""} maxLength={2000} onChange={e=>changeNote(job.id,e.target.value)} placeholder="CV, liên hệ PI, đề cương, visa…"/>
      </div>}
     </article>
    })}
    {!filtered.length&&<div className="rounded-xl border border-dashed bg-card px-4 py-12 text-center">
      <SearchIcon className="mx-auto size-8 text-muted-foreground/50"/>
      <p className="mt-3 text-sm font-semibold">Chưa có việc phù hợp bộ lọc</p>
      <p className="mt-2 text-sm text-muted-foreground">Có thể thay đổi chuyên ngành, trường hoặc xem các nguồn việc làm trong tương lai.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
       <Button size="sm" onClick={resetFilters}><RotateCcwIcon className="size-4"/> Xóa bộ lọc</Button>
       <Button size="sm" variant="outline" onClick={()=>setMode("universities")}><BellIcon className="size-4"/> Theo dõi trường & viện</Button>
      </div>
    </div>}
   </div>
  </>}
  <p className="rounded-xl border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
   <ShieldAlertIcon className="mr-1 inline size-4"/> Không coi dữ liệu từ API là xác minh điều kiện/visa. Các hạn nộp chỉ chính thức khi có nguồn cụ thể; không tự đặt giờ. Hồ sơ nghiên cứu, ghi chú và trạng thái ứng tuyển được giữ trong trình duyệt của bạn.
  </p>
  <input ref={importInput} type="file" accept=".json,application/json" hidden onChange={async e=>{const file=e.target.files?.[0];e.target.value="";if(!file)return;try{await importBackup(file)}catch(err){toast.error(err instanceof Error?err.message:"File không hợp lệ")}}}/>
 </section>
}
