/**
 * Public, bounded diff between two official university discovery snapshots.
 * No applicant data, no claimed immigration/PhD eligibility, and no
 * inference that a not-returned posting is definitively closed.
 */
const POSTING_ID=/^uoa-auto-\d{6,18}$/
const MAX_EVENTS=60
const MAX_EVENT_AGE_DAYS=45
const DAY=86_400_000
const COMPANY_PATH=/^\/TheUniversityOfAuckland\/(\d{6,18})(?:-[^/]*|\/?)$/

function validDate(raw){
 if(typeof raw!=="string")return null
 const t=Date.parse(raw)
 return Number.isFinite(t)?t:null
}
function safeOfficialUrl(raw,id){
 if(typeof raw!=="string"||!POSTING_ID.test(id))return false
 try{
  const u=new URL(raw)
  const match=COMPANY_PATH.exec(u.pathname)
  return u.protocol==="https:"&&!u.username&&!u.password&&u.hostname==="jobs.smartrecruiters.com"&&
   !!match&&"uoa-auto-"+match[1]===id
 }catch{return false}
}
function validJob(job){
 return job&&typeof job==="object"&&POSTING_ID.test(job.id)&&safeOfficialUrl(job.source_url,job.id)&&
  typeof job.title==="string"&&job.title.length>=3&&job.title.length<=200&&
  typeof job.employer==="string"&&job.employer==="University of Auckland"
}
const sortedUnique=ids=>[...new Set(ids)].sort()
function materialFields(job){
 return JSON.stringify({
  title:job.title,role:job.role,city:job.city,
  topics:Array.isArray(job.topics)?[...job.topics].sort():[],
  published_at:job.published_at||null,
 })
}
function safeEvent(value,now){
 if(!value||typeof value!=="object"||!["new","updated","not_returned"].includes(value.kind)||
  typeof value.id!=="string"||!POSTING_ID.test(value.id)||
  typeof value.title!=="string"||value.title.length>200||!value.title.trim()||
  !safeOfficialUrl(value.source_url,value.id)||!validDate(value.at))return null
 const at=Date.parse(value.at)
 if(at>now+DAY||at<now-MAX_EVENT_AGE_DAYS*DAY)return null
 return {kind:value.kind,id:value.id,title:value.title,source_url:value.source_url,at:new Date(at).toISOString()}
}
function mapUnique(rows){
 if(!Array.isArray(rows)||rows.length>30)return null
 const map=new Map()
 for(const job of rows){
  if(!validJob(job)||map.has(job.id))return null
  map.set(job.id,job)
 }
 return map
}
/**
 * On the first run without a prior valid snapshot, show no "new" count:
 * existing jobs are only a bootstrap, not confirmed newly published.
 */
export function buildNzScanHistory(current,previous,now=new Date()){
 const nowTime=now.valueOf(),publishedAt=now.toISOString()
 const currentMap=mapUnique(current?.listings)
 if(!currentMap)throw Error("Invalid official candidate snapshot")
 const prevMap=previous&&validDate(previous.generated_at)!==null?mapUnique(previous.listings):null
 const hasBaseline=!!prevMap&&Date.parse(previous.generated_at)<=nowTime+DAY
 const added=[],changed=[],missing=[]
 const events=[]
 if(hasBaseline){
  for(const [id,job] of currentMap){
   if(!prevMap.has(id)){
    added.push(id)
    events.push({kind:"new",id,title:job.title,source_url:job.source_url,at:publishedAt})
   }else if(materialFields(job)!==materialFields(prevMap.get(id))){
    changed.push(id)
    events.push({kind:"updated",id,title:job.title,source_url:job.source_url,at:publishedAt})
   }
  }
  for(const [id,job] of prevMap){
   if(!currentMap.has(id)){
    missing.push(id)
    events.push({kind:"not_returned",id,title:job.title,source_url:job.source_url,at:publishedAt})
   }
  }
 }
 const old=Array.isArray(previous?.recent_events)?previous.recent_events:[]
 const seen=new Set()
 const history=[...events,...old].map(e=>safeEvent(e,nowTime)).filter(Boolean).filter(e=>{
  const key=e.kind+"|"+e.id+"|"+e.at
  if(seen.has(key))return false
  seen.add(key)
  return true
 }).sort((a,b)=>b.at.localeCompare(a.at)||a.id.localeCompare(b.id)).slice(0,MAX_EVENTS)
 return {
  changes:{
   baseline_at:hasBaseline?previous.generated_at:null,
   new_ids:sortedUnique(added),
   updated_ids:sortedUnique(changed),
   not_returned_ids:sortedUnique(missing),
  },
  recent_events:history,
 }
}
const xmlEscape=value=>String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;")
 .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")
export function nzJobUpdatesRss(snapshot){
 const now=validDate(snapshot?.generated_at)
 if(now===null)throw Error("Missing scanner timestamp")
 const events=(Array.isArray(snapshot.recent_events)?snapshot.recent_events:[])
  .map(e=>safeEvent(e,now)).filter(e=>e&&e.kind!=="not_returned").slice(0,30)
 const updatesUrl="https://kotobuki09.github.io/opportunity-dashboard/nz-academic-updates.xml"
 const blocks=events.map(e=>{
  const type=e.kind==="new"?"Newly observed academic posting":"Academic posting metadata changed"
  // Observation is based on a scanner diff, NOT proof that the employer
  // just opened a vacancy or that the listed applicant is eligible.
  return [
   "<item>",
   "<title>"+xmlEscape(type+": "+e.title)+"</title>",
   "<link>"+xmlEscape(e.source_url)+"</link>",
   "<guid isPermaLink=\"false\">"+xmlEscape("nz-scan-"+e.kind+"-"+e.id+"-"+e.at)+"</guid>",
   "<pubDate>"+new Date(e.at).toUTCString()+"</pubDate>",
   "<description>"+xmlEscape("Observed via University of Auckland official job API. Verify current vacancy, closing time, PhD requirements and visa directly on employer page.")+"</description>",
   "</item>",
  ].join("\n")
 })
 return [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<rss version="2.0"><channel>',
  '<title>Opportunity Scout · NZ Academic Research Updates</title>',
  '<link>https://kotobuki09.github.io/opportunity-dashboard/#nz-jobs</link>',
  '<description>Changes observed between public University of Auckland academic research vacancy scans. Unverified candidate alerts, not application eligibility assessments.</description>',
  '<language>en-nz</language>',
  '<lastBuildDate>'+new Date(now).toUTCString()+'</lastBuildDate>',
  '<atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="'+xmlEscape(updatesUrl)+'" rel="self" type="application/rss+xml"/>',
  ...blocks,'</channel></rss>','',
 ].join("\n")
}
