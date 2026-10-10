/**
 * Public scanner history only. This information never includes application
 * notes, resume data, personal contact information, private checklist or visa.
 */
export type NzChangeKind="new"|"updated"|"not_returned"
export type NzScanEvent={
 kind:NzChangeKind;id:string;title:string;source_url:string;at:string
}
export type NzScanChanges={
 baseline_at:string|null;new_ids:string[];updated_ids:string[];not_returned_ids:string[]
}
export type NzScanSummary={changes:NzScanChanges|null;recent_events:NzScanEvent[]}
const DAY=86_400_000
const JOB_ID=/^uoa-auto-\d{6,18}$/
const VALID_KIND=new Set(["new","updated","not_returned"])
const COMPANY_PATH=/^\/TheUniversityOfAuckland\/(\d{6,18})(?:-[^/]*|\/?)$/
const parseIso=(value:unknown):number|null=>{
 if(typeof value!=="string")return null
 const t=Date.parse(value)
 return Number.isFinite(t)?t:null
}
export function isOfficialNzAutoUrl(value:unknown,id:string):value is string{
 if(typeof value!=="string"||value.length>1000||!JOB_ID.test(id))return false
 try{
  const url=new URL(value),m=COMPANY_PATH.exec(url.pathname)
  return url.protocol==="https:"&&!url.username&&!url.password&&
   url.hostname==="jobs.smartrecruiters.com"&&!!m&&id==="uoa-auto-"+m[1]
 }catch{return false}
}
function cleanIds(raw:unknown):string[]|null{
 if(!Array.isArray(raw)||raw.length>30||raw.some(v=>typeof v!=="string"||!JOB_ID.test(v)))return null
 if(new Set(raw).size!==raw.length)return null
 return [...raw]
}
export function normalizeNzScanSummary(raw:unknown,now=new Date()):NzScanSummary{
 const result:NzScanSummary={changes:null,recent_events:[]}
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return result
 const parent=raw as Record<string,unknown>
 const metadata=parent.changes
 if(metadata&&typeof metadata==="object"&&!Array.isArray(metadata)){
  const x=metadata as Record<string,unknown>
  const newest=cleanIds(x.new_ids),updated=cleanIds(x.updated_ids),missing=cleanIds(x.not_returned_ids)
  const baseline=x.baseline_at===null?null:parseIso(x.baseline_at)
  if(newest&&updated&&missing&&
   (x.baseline_at===null||baseline!==null&&baseline<=now.valueOf()+DAY)){
   const all=[...newest,...updated,...missing]
   if(new Set(all).size===all.length){
    result.changes={baseline_at:x.baseline_at===null?null:x.baseline_at as string,
     new_ids:newest,updated_ids:updated,not_returned_ids:missing}
   }
  }
 }
 if(Array.isArray(parent.recent_events)&&parent.recent_events.length<=60){
  const seen=new Set<string>()
  result.recent_events=parent.recent_events.flatMap(v=>{
   if(!v||typeof v!=="object"||Array.isArray(v))return []
   const e=v as Record<string,unknown>
   const at=parseIso(e.at)
   if(!VALID_KIND.has(String(e.kind))||typeof e.id!=="string"||!JOB_ID.test(e.id)||
    typeof e.title!=="string"||!e.title.trim()||e.title.length>200||
    !isOfficialNzAutoUrl(e.source_url,e.id)||at===null||
    at>now.valueOf()+DAY||at<now.valueOf()-45*DAY)return []
   const key=e.id+"|"+e.kind+"|"+e.at
   if(seen.has(key))return []
   seen.add(key)
   return [{
    kind:e.kind as NzChangeKind,id:e.id,title:e.title,
    source_url:e.source_url,at:e.at as string,
   }]
  })
  result.recent_events.sort((a,b)=>b.at.localeCompare(a.at))
 }
 return result
}
