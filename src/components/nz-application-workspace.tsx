import * as React from "react"
import { ArrowUpRightIcon, CheckCheckIcon, ClipboardCheckIcon, FileTextIcon, ShieldCheckIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { NZ_APPLICATION_TASKS,nzChecklistProgress,validNzChecked,type NzApplicationTaskId } from "@/lib/nz-application"
import { displayNzDay,nzDay,nzDeadlineState,STATUS_LABEL,type NzAcademicJob,type NzPersonalEntry,type NzPersonalStatus } from "@/lib/nz-jobs"
import { nzDaysUntilDeadline } from "@/lib/nz-career-tools"

const STAGES:["all",NzPersonalStatus,NzPersonalStatus,NzPersonalStatus]=["all","saved","preparing","applied"]
export function NzApplicationWorkspace({
 jobs,tracked,archivedIds,onChangeStatus,onChangeNote,onChangeNextStep,onToggleTask,onBrowse,now,
}:{
 jobs:NzAcademicJob[]
 tracked:Record<string,NzPersonalEntry>
 archivedIds:Set<string>
 onChangeStatus:(id:string,status:NzPersonalStatus)=>void
 onChangeNote:(id:string,note:string)=>void
 onChangeNextStep:(id:string,nextStep:string)=>void
 onToggleTask:(id:string,task:NzApplicationTaskId)=>void
 onBrowse:()=>void
 now:Date
}){
 const [stage,setStage]=React.useState<(typeof STAGES)[number]>("all")
 const followed=jobs.filter(job=>["saved","preparing","applied"].includes(tracked[job.id]?.status||"new"))
 const visible=followed.filter(job=>stage==="all"||tracked[job.id]?.status===stage)
 const allDone=followed.reduce((n,job)=>n+nzChecklistProgress(tracked[job.id]).done,0)
 const allTotal=followed.length*NZ_APPLICATION_TASKS.length
 const today=nzDay(now)
 return <div className="space-y-4" aria-label="Quản lý hồ sơ ứng tuyển tại New Zealand">
  <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
     <h4 className="flex items-center gap-2 text-base font-semibold"><ClipboardCheckIcon className="size-5 text-blue-600"/> Hồ sơ ứng tuyển của tôi</h4>
     <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Theo dõi các bước chuẩn bị học thuật và kết quả nộp đơn. Dữ liệu này chỉ nằm trong trình duyệt và bản JSON cá nhân.</p>
    </div>
    <Button size="sm" variant="outline" onClick={onBrowse}><ArrowUpRightIcon className="size-4"/> Khám phá thêm việc làm</Button>
   </div>
   {followed.some(job=>archivedIds.has(job.id))&&<div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-900 dark:text-amber-200" role="status">
   Một số tin đã lưu không còn xuất hiện trong nguồn tự động hiện tại. Checklist vẫn được giữ, nhưng hãy kiểm tra trang tuyển dụng trực tiếp trước khi nộp hồ sơ.
  </div>}
  <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
    <div className="rounded-xl bg-blue-50 px-3 py-3 dark:bg-blue-950/30">
     <strong className="block text-xl font-semibold tabular-nums">{followed.length}</strong>
     <span className="text-xs text-muted-foreground">Vị trí đang theo dõi</span>
    </div>
    <div className="rounded-xl bg-muted/65 px-3 py-3">
     <strong className="block text-xl font-semibold tabular-nums">{followed.filter(job=>tracked[job.id]?.status==="applied").length}</strong>
     <span className="text-xs text-muted-foreground">Đã ghi nhận nộp</span>
    </div>
    <div className="rounded-xl bg-muted/65 px-3 py-3">
     <strong className="block text-xl font-semibold tabular-nums">{allDone}<span className="text-sm font-normal text-muted-foreground">/{allTotal}</span></strong>
     <span className="text-xs text-muted-foreground">Bước hoàn tất</span>
    </div>
   </div>
   <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar"
     aria-label="Tiến độ chuẩn bị hồ sơ tổng hợp" aria-valuemin={0} aria-valuemax={100}
     aria-valuenow={allTotal?Math.round(allDone/allTotal*100):0}>
    <div className="h-full rounded-full bg-blue-600 transition-[width] motion-reduce:transition-none"
      style={{width:(allTotal?Math.round(allDone/allTotal*100):0)+"%"}}/>
   </div>
  </div>
  <div role="group" aria-label="Lọc theo tiến độ ứng tuyển" className="flex flex-wrap gap-2">
   {STAGES.map(value=><Button key={value} size="sm" variant={stage===value?"secondary":"outline"}
    aria-pressed={stage===value} onClick={()=>setStage(value)}>
    {value==="all"?"Tất cả hồ sơ":STATUS_LABEL[value]}
    <span className="rounded bg-background/80 px-1.5 text-xs tabular-nums">{value==="all"?followed.length:followed.filter(job=>tracked[job.id]?.status===value).length}</span>
   </Button>)}
  </div>
  {!visible.length?<div className="rounded-xl border border-dashed bg-card p-8 text-center">
    <FileTextIcon className="mx-auto size-9 text-muted-foreground/50"/>
    <p className="mt-3 text-sm font-semibold">{followed.length?"Chưa có hồ sơ ở bước này":"Chưa lưu vị trí nào"}</p>
    <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground">Lưu một vị trí trong tab tuyển dụng để tạo checklist chuẩn bị CV, đề cương nghiên cứu và người giới thiệu.</p>
    <Button onClick={onBrowse} className="mt-4" size="sm">Xem cơ hội tuyển dụng</Button>
   </div>:
   <div className="grid gap-4">
   {visible.map(job=>{
    const entry=tracked[job.id]
    const progress=nzChecklistProgress(entry)
    const checked=new Set(validNzChecked(entry?.checked))
    const closing=nzDeadlineState(job,now)
    const archived=archivedIds.has(job.id)
    const days=nzDaysUntilDeadline(job,today)
    return <article key={job.id} className="min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm">
     <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/20 p-4 sm:p-5">
      <div className="min-w-0 flex-1">
       <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{job.role==="postdoc"?"Postdoc":job.role==="lecturer"?"Lecturer":"Research Fellow"}</Badge>
        {archived?<Badge variant="outline" className="border-amber-500/50 text-amber-900 dark:text-amber-300">Tin đã rời nguồn hiện hành</Badge>:closing==="closed"?<Badge variant="secondary">Đã hết hạn</Badge>:
         closing==="open"||closing==="closing_today"?
          <Badge variant={days!==null&&days<=7?"destructive":"outline"}>{days===0?"Hạn hôm nay":days===1?"Còn 1 ngày":days!==null?"Còn "+days+" ngày":"Hạn đã công bố"}</Badge>:
          <Badge variant="outline">Chưa xác minh hạn</Badge>}
       </div>
       <h5 className="mt-2 text-base font-semibold leading-snug">{job.title}</h5>
       <p className="mt-1 text-xs text-muted-foreground">{job.employer} · {job.city} · {displayNzDay(job.deadline_day)}</p>
      </div>
      <Button size="sm" variant="outline" asChild><a href={job.source_url} target="_blank" rel="noopener noreferrer">{archived?"Kiểm tra nguồn gốc":"Trang tuyển dụng"} <ArrowUpRightIcon className="size-4"/></a></Button>
     </div>
     <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <section className="min-w-0">
       <div className="flex items-center justify-between">
        <h6 className="text-sm font-semibold">Checklist chuẩn bị hồ sơ</h6>
        <span className="text-xs font-medium tabular-nums text-blue-700 dark:text-blue-300">{progress.done}/{progress.total}</span>
       </div>
       <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar"
        aria-label={"Checklist: "+job.title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percentage}>
        <div className="h-full rounded-full bg-blue-600 transition-[width] motion-reduce:transition-none" style={{width:progress.percentage+"%"}}/>
       </div>
       <div className="mt-3 space-y-1">
        {NZ_APPLICATION_TASKS.map(task=><label key={task.id} className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-muted/50">
         <Checkbox className="mt-0.5" checked={checked.has(task.id)}
          onCheckedChange={()=>onToggleTask(job.id,task.id)}
          aria-label={task.label+": "+job.title}/>
         <span className="min-w-0">
          <span className={"block text-sm "+(checked.has(task.id)?"text-muted-foreground line-through":"font-medium")}>{task.label}</span>
          <span className="block text-xs leading-relaxed text-muted-foreground">{task.hint}</span>
         </span>
        </label>)}
       </div>
      </section>
      <section className="min-w-0 space-y-4">
       <div className="space-y-1.5">
        <label className="text-xs font-semibold" htmlFor={"nz-next-"+job.id}>Bước tiếp theo (cá nhân)</label>
        <Input id={"nz-next-"+job.id} maxLength={250} value={entry?.next_step||""}
         onChange={event=>onChangeNextStep(job.id,event.target.value)}
         placeholder="VD: Gửi email xác nhận chuyên ngành PhD"/>
       </div>
       <div className="space-y-1.5">
        <label className="text-xs font-semibold" htmlFor={"nz-work-notes-"+job.id}>Ghi chú ứng tuyển</label>
        <Textarea id={"nz-work-notes-"+job.id} rows={3} maxLength={2000} value={entry?.note||""}
         onChange={event=>onChangeNote(job.id,event.target.value)}
         placeholder="CV, liên hệ PI, yêu cầu tuyển dụng, visa…"/>
       </div>
       <div className="space-y-1.5">
        <label className="text-xs font-semibold">Trạng thái</label>
        <Select value={entry?.status||"saved"} onValueChange={value=>onChangeStatus(job.id,value as NzPersonalStatus)}>
         <SelectTrigger className="w-full" aria-label={"Trạng thái hồ sơ: "+job.title}><SelectValue/></SelectTrigger>
         <SelectContent>{(["saved","preparing","applied","dismissed"] as NzPersonalStatus[]).map(value=>
          <SelectItem key={value} value={value}>{STATUS_LABEL[value]}</SelectItem>)}</SelectContent>
        </Select>
       </div>
       <p className="flex items-start gap-2 rounded-lg bg-blue-500/5 p-3 text-xs text-muted-foreground"><ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-blue-700 dark:text-blue-300"/>Checklist do bạn tự cập nhật, không chứng minh đủ điều kiện hoặc đã được tuyển dụng.</p>
      </section>
     </div>
    </article>
   })}
   </div>}
  {followed.length>0&&<p className="flex items-start gap-2 text-xs text-muted-foreground"><CheckCheckIcon className="size-4 shrink-0"/> Trạng thái và checklist chỉ lưu ở trình duyệt hiện tại. Sử dụng “Xuất” để sao lưu thủ công trước khi xóa dữ liệu trình duyệt.</p>}
 </div>
}
