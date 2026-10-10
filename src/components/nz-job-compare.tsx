import { ArrowUpRightIcon, ScaleIcon, XIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { nzJobFitDetails,nzDaysUntilDeadline,type CareerPriority } from "@/lib/nz-career-tools"
import { nzDay,nzDeadlineState,displayNzDay,ROLE_LABEL,type NzAcademicJob } from "@/lib/nz-jobs"

export function NzJobCompare({jobs,priority,now,onRemove,onClear}:{
 jobs:NzAcademicJob[];priority:CareerPriority;now:Date
 onRemove:(id:string)=>void;onClear:()=>void
}){
 if(!jobs.length)return null
 const day=nzDay(now)
 return <section aria-label="So sánh vị trí học thuật" className="space-y-3 overflow-hidden rounded-2xl border border-blue-500/25 bg-blue-50/30 p-4 dark:bg-blue-950/15 sm:p-5">
  <div className="flex flex-wrap items-center justify-between gap-2">
   <div>
    <h4 className="flex items-center gap-2 text-sm font-semibold"><ScaleIcon className="size-4 text-blue-700 dark:text-blue-300"/> So sánh vị trí ({jobs.length}/3)</h4>
    <p className="mt-1 text-xs text-muted-foreground">Đối chiếu nghiên cứu, thời hạn, yêu cầu và quyền lợi; các điều kiện chưa rõ vẫn cần xác minh.</p>
   </div>
   <Button size="sm" variant="ghost" onClick={onClear}>Xóa lựa chọn</Button>
  </div>
  {jobs.length===1?<p className="rounded-lg border border-dashed bg-card p-3 text-sm text-muted-foreground">Đã chọn 1 vị trí. Chọn thêm một vị trí khác để đối chiếu; tối đa 3 vị trí.</p>:null}
  <div className="grid min-w-0 gap-3 lg:grid-cols-3">
   {jobs.map(job=>{
    const result=nzJobFitDetails(job,priority),state=nzDeadlineState(job,now)
    const days=nzDaysUntilDeadline(job,day)
    return <article key={job.id} className="min-w-0 space-y-3 rounded-xl border bg-card p-4">
     <div className="flex items-start justify-between gap-2">
      <Badge variant="outline">{ROLE_LABEL[job.role]}</Badge>
      <Button aria-label={"Bỏ so sánh: "+job.title} size="icon-sm" variant="ghost" onClick={()=>onRemove(job.id)}><XIcon className="size-4"/></Button>
     </div>
     <h5 className="text-sm font-semibold leading-snug">{job.title}</h5>
     <p className="text-xs text-muted-foreground">{job.employer} · {job.city}</p>
     <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">Phù hợp chuyên môn</span><strong className="tabular-nums">{result.score}/100</strong></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-blue-600" style={{width:result.score+"%"}}/></div>
      <p className="text-muted-foreground">{result.signals.length?result.signals.join(" · "):"Chưa có từ khóa chuyên môn khớp trực tiếp"}</p>
      <div className="grid gap-1 border-t pt-2">
       <span className="font-medium">Hạn: {displayNzDay(job.deadline_day)}</span>
       <span className="text-muted-foreground">{state==="closed"?"Đã đóng kỳ này":days!==null&&job.status==="official_deadline"?
        days===0?"Hạn hôm nay, kiểm tra giờ thực tế":days>0?"Còn "+days+" ngày theo lịch NZ":"Cần đối chiếu lại":
        "Chưa xác nhận hạn đang tuyển"}</span>
      </div>
      <div className="grid gap-1 border-t pt-2">
       <span className="font-medium">Thu nhập</span>
       <span className="text-muted-foreground">{job.salary_nzd_year?"NZ$ "+job.salary_nzd_year.toLocaleString("en-NZ")+" / năm":job.salary_note||"Không công bố / chưa xác minh"}</span>
      </div>
      <div className="grid gap-1 border-t pt-2">
       <span className="font-medium">Hợp đồng</span><span className="text-muted-foreground">{job.contract}</span>
      </div>
     </div>
     <Button size="sm" className="w-full" variant="outline" asChild>
      <a href={job.source_url} target="_blank" rel="noopener noreferrer">Đọc thông báo gốc <ArrowUpRightIcon className="size-4"/></a>
     </Button>
    </article>
   })}
  </div>
  <p className="text-[11px] text-muted-foreground">Điểm chỉ so khớp chức danh và lĩnh vực nghiên cứu. Không đo xác suất trúng tuyển, khả năng cấp visa hoặc điều kiện phù hợp thực tế.</p>
 </section>
}
