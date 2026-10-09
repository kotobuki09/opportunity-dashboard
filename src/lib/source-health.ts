/**
 * Scanner transport health is advisory, not manual source verification.
 * A dataset fingerprint prevents an old scan being presented as current.
 */
export type TransportState="reachable"|"restricted"|"missing"|"server_error"|"error"|"unsafe"|"uncertain"
export type PublicHealthRow={
 url:string;health:TransportState;status_code:number|null
 previous_health:TransportState|null;unreachable_streak:number
}
export type PublicHealth={
 generated_at:string;source_digest:string|null;total:number;checked:number
 counts:Partial<Record<TransportState,number>>;results:PublicHealthRow[]
}
export const HEALTH_LABEL:Record<TransportState,string>={
 reachable:"Truy cập được",restricted:"Bị giới hạn",missing:"404 / 410",
 server_error:"Lỗi máy chủ",error:"Lỗi kết nối",unsafe:"URL không an toàn",uncertain:"Chưa kết luận",
}
const states=new Set<TransportState>(["reachable","restricted","missing","server_error","error","unsafe","uncertain"])
export function parseSourceHealth(value:unknown):PublicHealth|null{
 if(!value||typeof value!=="object")return null
 const report=value as Record<string,unknown>
 if(typeof report.generated_at!=="string" || Number.isNaN(Date.parse(report.generated_at)))return null
 if(report.source_digest!==undefined && !/^[a-f0-9]{64}$/.test(String(report.source_digest)))return null
 if(!Array.isArray(report.results) || !Number.isInteger(report.total)||!Number.isInteger(report.checked)||
   Number(report.total)<0 || Number(report.checked)<0 ||
   (report.checked as number)!==report.results.length || (report.checked as number)>(report.total as number))return null
 const results:PublicHealthRow[]=[]
 const seen=new Set<string>()
 for(const item of report.results){
  if(!item||typeof item!=="object")return null
  const r=item as Record<string,unknown>
  if(typeof r.url!=="string"||!/^https?:\/\/[^/]+\./.test(r.url) || seen.has(r.url))return null
  if(!states.has(r.health as TransportState))return null
  if(r.status_code!==null&&(!Number.isInteger(r.status_code)||Number(r.status_code)<100||Number(r.status_code)>599))return null
  if(r.previous_health!==null && r.previous_health!==undefined && !states.has(r.previous_health as TransportState))return null
  if(r.unreachable_streak!==undefined && (!Number.isInteger(r.unreachable_streak)||Number(r.unreachable_streak)<0||Number(r.unreachable_streak)>255))return null
  seen.add(r.url)
  results.push({url:r.url,health:r.health as TransportState,status_code:r.status_code as number|null,
    previous_health:r.previous_health as TransportState|null ?? null,
    unreachable_streak:Number(r.unreachable_streak ?? (r.health==="reachable"?0:1))})
 }
 const counts=Object.fromEntries([...states].map(state=>[state,results.filter(r=>r.health===state).length])) as Partial<Record<TransportState,number>>
 return {generated_at:report.generated_at,source_digest:typeof report.source_digest==="string"?report.source_digest:null,
  total:report.total as number,checked:report.checked as number,counts,results}
}
export function sourceSnapshotAge(snapshot:PublicHealth|null,now=new Date()):"unavailable"|"current"|"aging"|"outdated"{
 if(!snapshot)return "unavailable"
 const age=now.getTime()-Date.parse(snapshot.generated_at)
 if(age< -5*60_000)return "outdated"
 if(age>14*86_400_000)return "outdated"
 return age>7*86_400_000?"aging":"current"
}
/** Old or foreign URL populations must not assert live transport state. */
export function snapshotCompatible(snapshot:PublicHealth|null,sourceDigest:string,now=new Date()):boolean{
 return !!snapshot && snapshot.source_digest===sourceDigest && sourceSnapshotAge(snapshot,now)!=="outdated"
}
export function healthByUrl(report:PublicHealth|null):Map<string,PublicHealthRow>{
 return new Map(report?.results.map(x=>[x.url,x])??[])
}
