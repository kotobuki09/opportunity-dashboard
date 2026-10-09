import * as React from "react"
import { ArrowUpRightIcon, ClipboardCopyIcon, FileJsonIcon, ShieldAlertIcon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BENEFIT_LABELS, PROJECTS, formatDay, type OpportunityRow } from "@/lib/opps"
import { qualityFor } from "@/lib/data-quality"
import { REVIEW_PHASE_LABELS, type EffectiveReviewPhase, type ReviewPhase } from "@/lib/editorial-progress"
import { draftFor, buildReviewProposal } from "@/lib/review-proposal"
import { HEALTH_LABEL, type PublicHealthRow } from "@/lib/source-health"

export function ReviewInspector({row,health,phase,onOpen,onPhaseChange}:{
 row:OpportunityRow;health?:PublicHealthRow;phase:EffectiveReviewPhase
 onOpen:(id:string)=>void;onPhaseChange:(value:ReviewPhase)=>void
}){
 const [draft,setDraft]=React.useState(()=>draftFor(row))
 const [editing,setEditing]=React.useState(false)
 const q=qualityFor(row)
 const set=<K extends keyof typeof draft>(key:K,value:(typeof draft)[K])=>setDraft(previous=>({...previous,[key]:value}))
 const make=()=>buildReviewProposal(row,draft,PROJECTS)
 const exportFile=()=>{
  try{
   const value=make(),blob=new Blob([JSON.stringify(value,null,2)+"\n"],{type:"application/json"})
   const href=URL.createObjectURL(blob),anchor=document.createElement("a")
   anchor.href=href;anchor.download="review-proposal-"+row.id+".json";anchor.click()
   window.setTimeout(()=>URL.revokeObjectURL(href),1000)
   toast.success("Đã xuất đề xuất. Chưa chỉnh dữ liệu nguồn.")
  }catch(e){toast.error(e instanceof Error?e.message:"Đề xuất chưa hợp lệ")}
 }
 const copy=async()=>{
  try{await navigator.clipboard.writeText(JSON.stringify(make(),null,2));toast.success("Đã sao chép bản đề xuất")}
  catch(e){toast.error(e instanceof Error?e.message:"Không thể sao chép")}
 }
 return <aside aria-label="Hồ sơ kiểm định đã chọn" className="overflow-hidden rounded-2xl border bg-card shadow-sm xl:sticky xl:top-5">
  <div className="border-b bg-gradient-to-br from-blue-50/80 to-card px-5 py-5 dark:from-blue-950/25 sm:px-6">
   <div className="flex items-center justify-between gap-3">
    <span className="text-[11px] font-semibold uppercase tracking-[.17em] text-blue-700 dark:text-blue-300">Review inspector</span>
    <Badge variant="outline">Ưu tiên {q.priority}</Badge>
   </div>
   <h4 className="mt-3 text-base font-semibold leading-snug">{row.title}</h4>
   <p className="mt-1 text-xs text-muted-foreground">{row.category} · {row.project[0]||"Chưa gắn dự án"}</p>
   <div className="mt-4 grid grid-cols-2 gap-2">
    <Button size="sm" variant="outline" onClick={()=>onOpen(row.id)}>Xem chi tiết</Button>
    <Button size="sm" variant="outline" asChild><a href={row.url} target="_blank" rel="noopener noreferrer">Nguồn gốc <ArrowUpRightIcon className="size-4"/></a></Button>
   </div>
  </div>
  <div className="space-y-5 px-5 py-5 sm:px-6 xl:max-h-[65vh] xl:overflow-y-auto">
   <section className="space-y-3 rounded-xl border border-blue-500/20 bg-blue-50/35 p-3 dark:bg-blue-950/20" aria-label="Tiến độ biên tập của tôi">
    <div>
     <h5 className="text-xs font-semibold text-foreground">Tiến độ xử lý cá nhân</h5>
     <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Lưu trong trình duyệt và bản sao lưu JSON cá nhân; không đánh dấu cơ hội đã xác minh.</p>
    </div>
    {phase==="needs_recheck"&&<p className="rounded-md bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-300">
     Nội dung cơ hội đã thay đổi từ lần xử lý trước. Hãy đối chiếu lại trước khi đặt trạng thái mới.
    </p>}
    <Select value={phase==="needs_recheck"?"not_started":phase} onValueChange={x=>onPhaseChange(x as ReviewPhase)}>
     <SelectTrigger aria-label="Tiến độ rà soát riêng" className="w-full"><SelectValue/></SelectTrigger>
     <SelectContent>
      {(["not_started","checking","waiting_source","proposal_ready"] as ReviewPhase[]).map(key=>
       <SelectItem key={key} value={key}>{REVIEW_PHASE_LABELS[key]}</SelectItem>)}
     </SelectContent>
    </Select>
   </section>
   <section className="space-y-2">
    <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bằng chứng & tình trạng nguồn</h5>
    <div className="space-y-2 rounded-xl border bg-muted/25 p-3 text-xs">
     <p className="flex items-center gap-2 font-medium"><ShieldAlertIcon className="size-4 text-amber-600"/>
      {row.verified_at?"Ngày kiểm tra được ghi: "+formatDay(row.verified_at):"Chưa có xác minh thủ công"}</p>
     <p className="text-muted-foreground">HTTP: {health?HEALTH_LABEL[health.health]+(health.status_code?" ("+health.status_code+")":""):"Chưa có kết quả quét"}. HTTP 200 không chứng minh đang nhận hồ sơ.</p>
     {health&&health.unreachable_streak>=2&&
      <p className="text-amber-800 dark:text-amber-300">{health.unreachable_streak} lượt quét liên tiếp chưa truy cập được. Đây không phải kết luận chương trình đã đóng.</p>}
     <p className="text-muted-foreground">Bằng chứng theo trường: {row.review_evidence.length}. Từ trang chương trình không tự suy ra điều kiện phù hợp cá nhân.</p>
    </div>
    {row.review_evidence.slice(-3).map((e,i)=>
     <a key={e.field+i} href={e.source_url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border p-3 text-xs hover:bg-muted/50">
      <strong>{e.field}</strong> · {formatDay(e.checked_at)}<span className="mt-1 block text-muted-foreground">{e.summary}</span>
     </a>)}
   </section>
   {q.findings.length>0&&<section className="space-y-2">
    <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Việc cần kiểm tra</h5>
    {q.findings.slice(0,5).map((f,i)=><div key={f.code} className="flex gap-2.5 rounded-lg border p-3">
     <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">{i+1}</span>
     <div><p className="text-xs font-semibold">{f.label}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.action}</p></div>
    </div>)}
   </section>}
   <section className="space-y-3 border-t pt-4">
    <div className="flex items-center justify-between gap-2">
     <div><h5 className="text-sm font-semibold">Đề xuất chuẩn hoá</h5><p className="text-xs text-muted-foreground">Soạn bản nháp, không ghi vào repository.</p></div>
     <Button size="sm" variant={editing?"secondary":"outline"} aria-expanded={editing} aria-controls="review-editor"
      onClick={()=>setEditing(v=>!v)}>{editing?"Thu gọn":"Biên tập"}</Button>
    </div>
    {editing&&<div id="review-editor" className="space-y-3 rounded-xl border bg-muted/20 p-3">
     <div className="space-y-1"><label htmlFor="review-elig" className="text-xs font-medium">Điều kiện ứng tuyển</label>
      <Textarea id="review-elig" rows={2} value={draft.eligibility_note} onChange={e=>set("eligibility_note",e.target.value)}/></div>
     <div className="space-y-1"><label htmlFor="review-stage" className="text-xs font-medium">Yêu cầu giai đoạn</label>
      <Textarea id="review-stage" rows={2} value={draft.stage_req} onChange={e=>set("stage_req",e.target.value)}/></div>
     <div className="space-y-1"><label htmlFor="review-fit" className="text-xs font-medium">Lý do phù hợp</label>
      <Textarea id="review-fit" rows={2} value={draft.fit_note} onChange={e=>set("fit_note",e.target.value)}/></div>
     <div className="space-y-1"><label className="text-xs font-medium">Loại quyền lợi</label>
      <Select value={draft.benefit_kind} onValueChange={x=>set("benefit_kind",x as typeof draft.benefit_kind)}>
       <SelectTrigger aria-label="Loại quyền lợi"><SelectValue/></SelectTrigger>
       <SelectContent>{Object.entries(BENEFIT_LABELS).map(([key,label])=><SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent>
      </Select></div>
     <div className="space-y-1"><label htmlFor="review-project" className="text-xs font-medium">Dự án (cách nhau dấu phẩy)</label>
      <Input id="review-project" value={draft.project} onChange={e=>set("project",e.target.value)}/>
      <p className="text-[11px] text-muted-foreground">{PROJECTS.join(" · ")}</p></div>
     <div className="space-y-1 border-t pt-3"><label htmlFor="review-source" className="text-xs font-medium">URL bằng chứng</label>
      <Input id="review-source" value={draft.source_url} onChange={e=>set("source_url",e.target.value)}/></div>
     <div className="space-y-1"><label htmlFor="review-note" className="text-xs font-medium">Nội dung chứng cứ</label>
      <Textarea id="review-note" rows={2} maxLength={1200} placeholder="Đoạn trong điều lệ chứng minh thông tin đã sửa..."
       value={draft.summary} onChange={e=>set("summary",e.target.value)}/></div>
     <label className="flex cursor-pointer items-start gap-2 rounded-lg border bg-background p-3 text-xs leading-relaxed">
      <input type="checkbox" className="mt-0.5 size-4 accent-blue-600" checked={draft.humanChecked} onChange={e=>set("humanChecked",e.target.checked)}/>
      <span>Tôi đã tự đọc nguồn và xác nhận bằng chứng theo từng trường. Không tự thay đổi <code>verified_at</code> hoặc trạng thái hồ sơ.</span>
     </label>
     <div className="grid grid-cols-2 gap-2">
      <Button size="sm" onClick={exportFile}><FileJsonIcon className="size-4"/> Xuất đề xuất</Button>
      <Button size="sm" variant="outline" onClick={copy}><ClipboardCopyIcon className="size-4"/> Sao chép</Button>
     </div>
     <Button size="sm" variant="ghost" className="w-full" asChild>
      <a target="_blank" rel="noopener noreferrer" href="https://github.com/kotobuki09/opportunity-dashboard/edit/main/data/seen.json">Mở GitHub để tạo PR <ArrowUpRightIcon className="size-4"/></a>
     </Button>
     <p className="text-[11px] leading-relaxed text-muted-foreground">Đề xuất JSON phải được duyệt và áp dụng vào <code>data/seen.json</code> qua PR. Không tự động tạo PR, không xuất ghi chú cá nhân.</p>
    </div>}
   </section>
  </div>
 </aside>
}
