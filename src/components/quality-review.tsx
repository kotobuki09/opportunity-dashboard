import * as React from "react"
import {
 ArrowUpRightIcon, CheckCircle2Icon, ClipboardCheckIcon, Clock3Icon,
 FileDownIcon, Link2Icon, RadioTowerIcon, SearchIcon, ShieldCheckIcon, SlidersHorizontalIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ReviewInspector } from "@/components/review-inspector"
import { qualityFor, qualitySummary } from "@/lib/data-quality"
import { buildQualityCsv } from "@/lib/quality-export"
import { formatDate, stripVi, type OpportunityRow } from "@/lib/opps"
import { HEALTH_LABEL, healthByUrl, parseSourceHealth, sourceSnapshotAge, type PublicHealth } from "@/lib/source-health"

type Filter="review"|"verification"|"normalization"|"availability"|"links"|"normalized"|"all"
type Sort="priority"|"deadline"|"title"
const PAGE_SIZE=16
const FILTERS:{value:Filter;label:string}[]=[
 {value:"review",label:"Cần xử lý"},
 {value:"verification",label:"Chưa kiểm định nguồn"},
 {value:"normalization",label:"Chưa chuẩn hoá"},
 {value:"availability",label:"Trạng thái chưa rõ"},
 {value:"links",label:"Lỗi / chặn truy cập"},
 {value:"normalized",label:"Đã đủ metadata"},
 {value:"all",label:"Tất cả"},
]
const unhealthy=new Set(["restricted","missing","server_error","error","unsafe","uncertain"])
const transportTone:Record<string,string>={
 reachable:"text-emerald-700 dark:text-emerald-300",
 restricted:"text-amber-700 dark:text-amber-300",
 missing:"text-rose-700 dark:text-rose-300",
 server_error:"text-rose-700 dark:text-rose-300",
 error:"text-rose-700 dark:text-rose-300",
 unsafe:"text-rose-700 dark:text-rose-300",
 uncertain:"text-muted-foreground",
}
const percent=(a:number,b:number)=>b?Math.round(100*a/b):0

export function QualityReview({rows,onOpen,now=new Date()}:{
 rows:OpportunityRow[];onOpen:(id:string)=>void;now?:Date
}){
 const [filter,setFilter]=React.useState<Filter>("review")
 const [query,setQuery]=React.useState("")
 const [sort,setSort]=React.useState<Sort>("priority")
 const [visibleCount,setVisibleCount]=React.useState(PAGE_SIZE)
 const [selectedId,setSelectedId]=React.useState<string|null>(null)
 const [snapshot,setSnapshot]=React.useState<PublicHealth|null>(null)
 const [scanState,setScanState]=React.useState<"loading"|"ready"|"unavailable">("loading")
 const inspectorRef=React.useRef<HTMLDivElement>(null)

 React.useEffect(()=>{
  const controller=new AbortController()
  fetch(import.meta.env.BASE_URL+"source-health.json",{cache:"no-store",signal:controller.signal})
   .then(async response=>{if(!response.ok)throw Error("Source health unavailable");return response.json()})
   .then(raw=>{if(controller.signal.aborted)return;const parsed=parseSourceHealth(raw)
     setSnapshot(parsed);setScanState(parsed?"ready":"unavailable")})
   .catch(()=>{if(!controller.signal.aborted)setScanState("unavailable")})
  return ()=>controller.abort()
 },[])

 const quality=React.useMemo(()=>qualitySummary(rows,now),[rows,now])
 const byUrl=React.useMemo(()=>healthByUrl(snapshot),[snapshot])
 const records=React.useMemo(()=>rows.map(row=>({row,q:qualityFor(row,now),health:byUrl.get(row.url)})),[rows,now,byUrl])
 const linkIssueCount=records.filter(x=>x.health&&unhealthy.has(x.health.health)).length
 const choose=(next:Filter)=>{setFilter(next);setVisibleCount(PAGE_SIZE)}
 const countFor=(value:Filter)=>
  value==="verification"?quality.needsVerification:
  value==="normalization"?quality.needsNormalization:
  value==="availability"?quality.needsDeadlineReview:
  value==="links"?linkIssueCount:
  value==="normalized"?quality.normalized:
  value==="review"?quality.needsReview:quality.total

 const reports=React.useMemo(()=>records.filter(({row,q,health})=>{
  if(filter==="review"&&!q.findings.length)return false
  if(filter==="verification"&&!q.needsVerification)return false
  if(filter==="normalization"&&!q.needsNormalization)return false
  if(filter==="availability"&&!q.needsDeadlineReview)return false
  if(filter==="normalized"&&!q.normalized)return false
  if(filter==="links"&&(!health||!unhealthy.has(health.health)))return false
  return !query.trim()||stripVi([row.title,row.category,row.project.join(" "),row.url,...q.issues].join(" ")).includes(stripVi(query.trim()))
 }).sort((a,b)=>
  sort==="title"?a.row.title.localeCompare(b.row.title,"vi"):
  sort==="deadline"?a.row.rank-b.row.rank:
  b.q.priority-a.q.priority||a.row.rank-b.row.rank
 ),[records,filter,query,sort])

 const onChoose=(id:string)=>{
  setSelectedId(id)
  if(typeof window!=="undefined"&&window.matchMedia("(max-width: 1279px)").matches){
   window.setTimeout(()=>inspectorRef.current?.scrollIntoView({block:"start",behavior:"smooth"}),50)
  }
 }
 const selected=reports.find(x=>x.row.id===selectedId)??null
 const exportReport=()=>{
  const csv=buildQualityCsv(reports.map(x=>x.row),now)
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}))
  const anchor=document.createElement("a")
  anchor.href=url;anchor.download="opportunity-quality-review.csv";anchor.click()
  window.setTimeout(()=>URL.revokeObjectURL(url),1000)
 }
 const age=sourceSnapshotAge(snapshot,now)
 const reachable=snapshot?.counts.reachable??0
 const restricted=snapshot?.counts.restricted??0
 const broken=(snapshot?.counts.missing??0)+(snapshot?.counts.server_error??0)+(snapshot?.counts.error??0)+(snapshot?.counts.unsafe??0)
 const metrics=[
  {filter:"review" as const,title:"Cần xử lý",amount:quality.needsReview,help:"Có ít nhất một yêu cầu rà soát",icon:SlidersHorizontalIcon},
  {filter:"verification" as const,title:"Chưa kiểm định nguồn",amount:quality.needsVerification,help:"Nguồn chưa hoặc quá hạn xác minh",icon:ShieldCheckIcon},
  {filter:"normalization" as const,title:"Chưa chuẩn hoá",amount:quality.needsNormalization,help:"Thiếu metadata hoặc quyền lợi",icon:ClipboardCheckIcon},
  {filter:"availability" as const,title:"Trạng thái chưa rõ",amount:quality.needsDeadlineReview,help:"Cửa sổ nộp / cut-off cần xem lại",icon:Clock3Icon},
 ]
 return <section className="quality-studio space-y-6 px-4 pb-6 lg:px-6">
  <header className="quality-studio-hero relative overflow-hidden rounded-2xl border p-5 sm:p-7">
   <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 size-72 rounded-full border border-blue-200/70 dark:border-blue-400/10"/>
   <div aria-hidden="true" className="pointer-events-none absolute -right-2 -top-10 size-52 rounded-full border border-blue-200/70 dark:border-blue-400/10"/>
   <div className="relative grid gap-5 md:grid-cols-[minmax(0,1fr)_205px] md:items-center">
    <div className="max-w-2xl">
     <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-blue-700 dark:text-blue-300">
      <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white"><ShieldCheckIcon className="size-4"/></span>
      Data governance · Opportunity Scout
     </div>
     <h3 className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">Chất lượng dữ liệu, trước khi hành động</h3>
     <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
      Ba lớp kiểm tra độc lập: <strong className="text-foreground">nguồn có bằng chứng</strong>,
      <strong className="text-foreground"> metadata rõ ràng</strong> và
      <strong className="text-foreground"> tình trạng tiếp nhận</strong>.
      Thông tin đủ trường không có nghĩa người ứng tuyển đủ điều kiện.
     </p>
    </div>
    <div className="rounded-xl border border-blue-200/70 bg-background/80 p-4 backdrop-blur-sm dark:border-blue-400/15">
     <div className="flex items-baseline gap-1"><strong className="text-3xl font-semibold tabular-nums">{quality.normalized}</strong><span className="text-sm text-muted-foreground">/ {quality.total}</span></div>
     <p className="mt-1 text-xs font-semibold">Đủ trường metadata</p>
     <div role="progressbar" aria-label="Tỷ lệ bản ghi đủ metadata" aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={percent(quality.normalized,quality.total)} className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-950">
      <div className="h-full rounded-full bg-blue-600 transition-all" style={{width:percent(quality.normalized,quality.total)+"%"}}/>
     </div>
     <p className="mt-2 text-xs text-muted-foreground">{percent(quality.normalized,quality.total)}% hoàn chỉnh metadata · không phải điểm tin cậy</p>
    </div>
   </div>
  </header>

  <div className="grid grid-cols-2 gap-3 @4xl/main:grid-cols-4">
   {metrics.map(({filter:key,title,amount,help,icon:Icon})=>
    <button type="button" key={key} aria-pressed={filter===key} onClick={()=>choose(key)}
     className={"quality-studio-stat group rounded-xl border bg-card p-4 text-left transition-all hover:border-blue-400/50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-5 "+
      (filter===key?"border-blue-400/70 bg-blue-50/45 dark:bg-blue-950/25":"")}>
     <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-muted-foreground">{title}</span>
      <Icon className="size-4 shrink-0 text-blue-600/80 dark:text-blue-300/80"/>
     </div>
     <strong className="mt-3 block text-3xl font-semibold tabular-nums tracking-tight">{amount}</strong>
     <span className="mt-2 block text-xs text-muted-foreground">{help}</span>
    </button>
   )}
  </div>

  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
   <div className="rounded-xl border bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
     <div>
      <div className="flex items-center gap-2 text-sm font-semibold"><RadioTowerIcon className="size-4 text-blue-600"/> Theo dõi nguồn công khai</div>
      <p className="mt-1 text-xs text-muted-foreground">{age==="current"?"Bản quét hiện hành":age==="aging"?"Bản quét cần cập nhật":age==="outdated"?"Bản quét đã cũ":"Đang chờ bản quét nguồn"}
       {snapshot?" · "+new Date(snapshot.generated_at).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"}):""}
      </p>
     </div>
     <Button variant="outline" size="sm" asChild><a href="https://github.com/kotobuki09/opportunity-dashboard/actions/workflows/source-intelligence.yml"
      target="_blank" rel="noopener noreferrer">Lịch sử quét <ArrowUpRightIcon className="size-4"/></a></Button>
    </div>
    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
     <div className="rounded-lg bg-emerald-500/8 px-2 py-3"><strong className="block text-xl tabular-nums text-emerald-700 dark:text-emerald-300">{snapshot?reachable:"—"}</strong><span className="text-[11px] text-muted-foreground">Truy cập được</span></div>
     <div className="rounded-lg bg-amber-500/8 px-2 py-3"><strong className="block text-xl tabular-nums text-amber-700 dark:text-amber-300">{snapshot?restricted:"—"}</strong><span className="text-[11px] text-muted-foreground">Giới hạn</span></div>
     <div className="rounded-lg bg-rose-500/8 px-2 py-3"><strong className="block text-xl tabular-nums text-rose-700 dark:text-rose-300">{snapshot?broken:"—"}</strong><span className="text-[11px] text-muted-foreground">Lỗi / mất link</span></div>
    </div>
    <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Kiểm tra HTTP chỉ đo khả năng truy cập, không xác nhận còn nhận hồ sơ hoặc điều kiện người nộp. {scanState==="loading"?"Đang tải báo cáo.":snapshot?"Đã kiểm "+snapshot.checked+"/"+snapshot.total+" URL.":"Chưa có snapshot công khai; xem workflow trên GitHub."}</p>
   </div>
   <div className="rounded-xl border bg-card p-4 sm:p-5">
    <h4 className="text-sm font-semibold">Các trường cần chuẩn hoá</h4>
    <p className="mt-1 text-xs text-muted-foreground">Số bản ghi thiếu thông tin, có thể trùng nhau</p>
    <div className="mt-4 space-y-2.5">
     {[
      ["Quyền lợi chưa phân loại",quality.missingBenefit],
      ["Giai đoạn / tư cách",quality.missingStage],
      ["Lý do phù hợp dự án",quality.missingFit],
      ["Điều kiện tham gia",quality.missingEligibility],
     ].map(([label,value])=>
      <div key={label} className="flex items-center gap-3 text-xs">
       <span className="w-40 shrink-0 text-muted-foreground sm:w-44">{label}</span>
       <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-blue-500/80" style={{width:percent(Number(value),quality.total)+"%"}}/>
       </div>
       <span className="w-7 text-right font-semibold tabular-nums">{value}</span>
      </div>
     )}
    </div>
   </div>
  </div>

  <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,1fr)]">
   <Card className="min-w-0 overflow-hidden rounded-2xl shadow-sm">
    <CardHeader className="space-y-4 border-b bg-card">
     <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
       <CardTitle className="text-base">Hàng đợi chuẩn hoá & kiểm định</CardTitle>
       <CardDescription className="mt-1">{reports.length} mục trong bộ lọc · ưu tiên hạn gần và vấn đề nghiêm trọng</CardDescription>
      </div>
      <Button type="button" size="sm" variant="outline" disabled={!reports.length} onClick={exportReport}>
       <FileDownIcon className="size-4"/> Xuất danh sách CSV
      </Button>
     </div>
     <div className="flex flex-wrap gap-1.5" role="group" aria-label="Bộ lọc kiểm định">
      {FILTERS.map(option=>
       <Button type="button" key={option.value} size="sm" aria-pressed={filter===option.value}
        variant={filter===option.value?"secondary":"ghost"} onClick={()=>choose(option.value)}
        className={filter===option.value?"ring-1 ring-blue-500/35":""}>
        {option.label}<span className="ml-1 text-[11px] tabular-nums text-muted-foreground">{countFor(option.value)}</span>
       </Button>
      )}
     </div>
     <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative min-w-0 flex-1">
       <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground"/>
       <Input value={query} onChange={e=>{setQuery(e.target.value);setVisibleCount(PAGE_SIZE)}}
        aria-label="Tìm trong hàng đợi kiểm định" placeholder="Tìm cơ hội, dự án, nguồn..." className="pl-9"/>
      </div>
      <Select value={sort} onValueChange={x=>setSort(x as Sort)}>
       <SelectTrigger aria-label="Sắp xếp hàng đợi kiểm định" className="w-full sm:w-44"><SelectValue/></SelectTrigger>
       <SelectContent>
        <SelectItem value="priority">Ưu tiên xử lý</SelectItem>
        <SelectItem value="deadline">Hạn nộp gần nhất</SelectItem>
        <SelectItem value="title">Tên A–Z</SelectItem>
       </SelectContent>
      </Select>
     </div>
    </CardHeader>
    <CardContent className="divide-y px-4 sm:px-5">
     {reports.slice(0,visibleCount).map(({row,q,health})=>{
      const focused=filter==="verification"||filter==="normalization"||filter==="availability"?filter:null
      const issues=focused?q.findings.filter(x=>x.group===focused):q.findings
      return <div key={row.id} className={"group relative py-4 first:pt-1 "+(selectedId===row.id?"-mx-3 rounded-xl bg-blue-50/60 px-3 dark:bg-blue-950/25":"")}>
       <div className="flex items-start gap-3">
        <span aria-hidden="true" className={"mt-1.5 size-2 shrink-0 rounded-full "+
         (q.findings.some(x=>x.severity==="high")?"bg-amber-500":"bg-blue-400")}/>
        <div className="min-w-0 flex-1">
         <button type="button" onClick={()=>onChoose(row.id)} aria-pressed={selectedId===row.id}
          aria-label={"Kiểm định: "+row.title} className="text-left text-sm font-semibold leading-snug hover:text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-ring dark:hover:text-blue-300">
          {row.title}
         </button>
         <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span>{row.project[0]||"Chưa gắn dự án"}</span><span>·</span>
          <span>{row.deadline_iso?"Hạn "+formatDate(row.deadline_iso):row.label}</span>
          {health&&<><span>·</span><span className={transportTone[health.health]}>{HEALTH_LABEL[health.health]}</span></>}
         </div>
         <div className="mt-2 flex flex-wrap gap-1">
          {issues.slice(0,3).map(issue=><Badge key={issue.code} variant="outline" className={"text-[11px] font-normal "+
           (issue.severity==="high"?"border-amber-500/40 text-amber-800 dark:text-amber-300":"text-muted-foreground")}>{issue.label}</Badge>)}
          {issues.length>3&&<Badge variant="secondary" className="text-[11px]">+{issues.length-3}</Badge>}
          {!issues.length&&<Badge variant="outline" className="text-[11px] text-muted-foreground">Đủ trường theo quy tắc</Badge>}
         </div>
         {issues[0]&&<p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          <strong className="font-medium text-foreground">Tiếp theo:</strong> {issues[0].action}
         </p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
         <Button type="button" size="sm" variant="outline" onClick={()=>onChoose(row.id)} aria-label={"Chọn kiểm định: "+row.title}>Duyệt</Button>
         <a target="_blank" rel="noopener noreferrer" href={row.url} title="Mở nguồn chính thức"
          aria-label={"Đối chiếu nguồn: "+row.title} className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <ArrowUpRightIcon className="size-4"/>
         </a>
        </div>
       </div>
      </div>
     })}
     {!reports.length&&<div className="py-10 text-center text-sm text-muted-foreground">Không có mục phù hợp với bộ lọc này.</div>}
     {reports.length>visibleCount&&<div className="flex justify-center pt-4">
      <Button size="sm" variant="outline" onClick={()=>setVisibleCount(v=>v+PAGE_SIZE)}>Xem thêm ({reports.length-visibleCount} mục còn lại)</Button>
     </div>}
    </CardContent>
   </Card>

   <div ref={inspectorRef} className="min-w-0 scroll-mt-5">
    {selected?<ReviewInspector key={selected.row.id} row={selected.row} health={selected.health} onOpen={onOpen}/>:
     <div className="rounded-2xl border border-dashed bg-card/65 p-7 text-center xl:sticky xl:top-5">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-300"><Link2Icon className="size-5"/></span>
      <h4 className="mt-4 text-sm font-semibold">Chọn một hồ sơ để kiểm định</h4>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
       Xem chứng cứ, các trường còn thiếu và soạn bản đề xuất sửa kèm nguồn. Không cần cung cấp GitHub token.
      </p>
      <p className="mt-4 text-[11px] text-muted-foreground"><CheckCircle2Icon className="mr-1 inline size-3.5"/> Ghi chú cá nhân không được đưa vào đề xuất.</p>
     </div>}
   </div>
  </div>
 </section>
}
