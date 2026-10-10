import * as React from "react"
import { ArrowRightIcon, BellRingIcon, ExternalLinkIcon, HistoryIcon, RssIcon, ShieldAlertIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { NzAutoSnapshot } from "@/lib/nz-jobs"
import type { NzChangeKind } from "@/lib/nz-scan-changes"

type EventFilter="all"|NzChangeKind
const FILTERS:{id:EventFilter;title:string}[]=[
 {id:"all",title:"Toàn bộ"},
 {id:"new",title:"Mới được API ghi nhận"},
 {id:"updated",title:"Thông tin thay đổi"},
 {id:"not_returned",title:"Không còn xuất hiện"},
]
const LABEL:Record<NzChangeKind,string>={
 new:"Mới phát hiện",updated:"Metadata thay đổi",not_returned:"Không còn được trả về",
}
const DESCRIPTION:Record<NzChangeKind,string>={
 new:"Tin mới so với bản quét trước, không nhất thiết là ngày trường bắt đầu tuyển.",
 updated:"Các trường dữ liệu công khai thay đổi; hãy đọc lại trang tuyển dụng gốc.",
 not_returned:"API không trả về tin này ở lần quét gần nhất. Chưa thể kết luận vị trí đã đóng.",
}
function dateLabel(iso:string){
 try{return new Intl.DateTimeFormat("vi-VN",{dateStyle:"medium",timeStyle:"short",timeZone:"Pacific/Auckland"}).format(new Date(iso))+" (NZ)"}
 catch{return "Chưa rõ thời điểm"}
}
export function NzScanUpdates({
 snapshot,feedStatus,onShowJobs,
}:{
 snapshot:NzAutoSnapshot|null
 feedStatus:"loading"|"ready"|"unavailable"
 onShowJobs:(kind:"new"|"updated")=>void
}){
 const [filter,setFilter]=React.useState<EventFilter>("all")
 const [limit,setLimit]=React.useState(8)
 const baseline=snapshot?.changes?.baseline_at||null
 const fresh=snapshot?.changes?.new_ids.length||0
 const changed=snapshot?.changes?.updated_ids.length||0
 const missing=snapshot?.changes?.not_returned_ids.length||0
 const events=snapshot?.recent_events||[]
 const visible=events.filter(e=>filter==="all"||e.kind===filter)
 const rss=import.meta.env.BASE_URL+"nz-academic-updates.xml"
 return <section className="space-y-4" aria-label="Lịch sử quét việc làm học thuật">
  <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
   <div className="flex flex-wrap items-start justify-between gap-3">
    <div className="max-w-2xl">
     <h4 className="flex items-center gap-2 text-base font-semibold"><HistoryIcon className="size-5 text-blue-700 dark:text-blue-300"/> Scan Updates · Dòng thời gian tuyển dụng</h4>
     <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Theo dõi thay đổi giữa các lần quét từ API tuyển dụng chính thức của University of Auckland. Đây là <strong>tín hiệu cần đối chiếu</strong>, không phải xác nhận còn tuyển hay đủ điều kiện ứng tuyển.</p>
     {feedStatus==="ready"&&snapshot?.generated_at?
      <p className="mt-2 text-xs text-muted-foreground">Lần quét: {dateLabel(snapshot.generated_at)}{baseline?" · So với: "+dateLabel(baseline):" · Đang khởi tạo mốc so sánh"}</p>:
      <p className="mt-2 text-xs text-muted-foreground">{feedStatus==="loading"?"Đang lấy bản quét gần nhất…":"Không có bản quét mới được xác thực; vẫn có thể xem các trường đại học từ danh sách theo dõi."}</p>}
    </div>
    <Button size="sm" variant="outline" asChild><a href={rss} target="_blank" rel="noopener noreferrer" aria-label="Mở RSS cập nhật tuyển dụng học thuật"><RssIcon className="size-4"/> RSS cập nhật <ExternalLinkIcon className="size-3"/></a></Button>
   </div>
   <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3" aria-label="Thay đổi từ lần quét mới nhất">
    <div className="rounded-xl border bg-blue-500/5 px-3 py-3">
     <strong className="block text-xl font-semibold tabular-nums text-blue-700 dark:text-blue-300">{fresh}</strong>
     <span className="text-xs text-muted-foreground">Mới so với lần trước</span>
    </div>
    <div className="rounded-xl border bg-muted/40 px-3 py-3">
     <strong className="block text-xl font-semibold tabular-nums">{changed}</strong>
     <span className="text-xs text-muted-foreground">Metadata thay đổi</span>
    </div>
    <div className="rounded-xl border bg-amber-500/5 px-3 py-3">
     <strong className="block text-xl font-semibold tabular-nums text-amber-800 dark:text-amber-300">{missing}</strong>
     <span className="text-xs text-muted-foreground">Không còn thấy trong API</span>
    </div>
   </div>
   {!baseline&&<p className="mt-3 text-xs text-muted-foreground">Chưa có đủ hai bản quét hợp lệ để tính biến động. Các số 0 ở trên không khẳng định rằng chưa có việc mới.</p>}
   <div className="mt-4 flex flex-wrap gap-2">
    <Button size="sm" onClick={()=>onShowJobs("new")} disabled={!fresh}><BellRingIcon className="size-4"/> Xem vị trí mới <ArrowRightIcon className="size-4"/></Button>
    <Button size="sm" variant="outline" onClick={()=>onShowJobs("updated")} disabled={!changed}>Xem vị trí đã sửa <ArrowRightIcon className="size-4"/></Button>
   </div>
  </div>
  <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
     <h5 className="text-sm font-semibold">Nhật ký các lần phát hiện</h5>
     <p className="mt-1 text-xs text-muted-foreground">Tối đa 60 sự kiện công khai trong 45 ngày; không chứa hồ sơ ứng tuyển hay ghi chú cá nhân.</p>
    </div>
    <Badge variant="outline">{events.length} sự kiện</Badge>
   </div>
   <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Lọc lịch sử thay đổi việc làm">
    {FILTERS.map(x=><Button size="sm" variant={filter===x.id?"secondary":"ghost"} aria-pressed={filter===x.id}
     key={x.id} onClick={()=>{setFilter(x.id);setLimit(8)}}>{x.title}</Button>)}
   </div>
   <div className="mt-3 divide-y rounded-xl border" role="list" aria-label="Danh sách sự kiện quét">
    {!visible.length&&<div className="px-4 py-10 text-center text-sm text-muted-foreground">
     <HistoryIcon className="mx-auto mb-3 size-8 opacity-40"/>
     Chưa có sự kiện nào phù hợp. Khi lần quét tiếp theo có thay đổi, hệ thống sẽ ghi nhận tại đây.
    </div>}
    {visible.slice(0,limit).map((event,i)=><article role="listitem" key={event.id+event.kind+event.at+i} className="min-w-0 p-3 sm:p-4">
     <div className="flex flex-wrap items-center gap-2">
      <Badge variant={event.kind==="not_returned"?"outline":"secondary"}
       className={event.kind==="not_returned"?"border-amber-500/40 text-amber-800 dark:text-amber-300":""}>{LABEL[event.kind]}</Badge>
      <span className="text-xs text-muted-foreground">{dateLabel(event.at)}</span>
     </div>
     <p className="mt-2 text-sm font-semibold">{event.title}</p>
     <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{DESCRIPTION[event.kind]}</p>
     <a className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring dark:text-blue-300"
      href={event.source_url} target="_blank" rel="noopener noreferrer">Kiểm tra tin gốc <ExternalLinkIcon className="size-3"/></a>
    </article>)}
   </div>
   {visible.length>limit&&<div className="mt-3 text-center"><Button size="sm" variant="outline" onClick={()=>setLimit(n=>n+8)}>Xem thêm ({visible.length-limit})</Button></div>}
   <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldAlertIcon className="mt-0.5 size-4 shrink-0"/> RSS chỉ đăng tin mới phát hiện và metadata thay đổi, không gửi email/push từ dashboard. Tin không còn trong API không đồng nghĩa tuyển dụng đã kết thúc.</p>
  </div>
 </section>
}
