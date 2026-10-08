// Advisory source reachability monitor. Does not rewrite verified_at or data/seen.json.
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { lookup } from "node:dns/promises"
import { fileURLToPath, pathToFileURL } from "node:url"
import { httpHealth, isPrivateIp, mapLimit, validatePublicUrl } from "./source-utils.mjs"

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..")
const DEFAULT_OUTPUT=resolve(ROOT,"artifacts/source-health.json")
const HEADERS={ "User-Agent": "OpportunityScoutSourceMonitor/1.0 (advisory link-check, no application submission)" }
const bounded=(value,min,max,fallback)=>Number.isFinite(+value)?Math.max(min,Math.min(max,+value)):fallback

async function ensurePublicHost(url) {
  const host=url.hostname.replace(/\.$/,"")
  const addresses=await lookup(host,{all:true})
  if (!addresses.length || addresses.some((a)=>isPrivateIp(a.address))) throw new Error("unsafe DNS target")
}

/** Redirects are revalidated, and the server's response body is never stored. */
export async function reachability(url, timeoutMs=10000) {
  let current=url
  try {
    for(let hop=0;hop<4;hop++){
      const guard=validatePublicUrl(current)
      if(!guard.safe) return {health:"unsafe",status_code:null,final_url:current,detail:guard.reason}
      await ensurePublicHost(guard.url)
      let response=null
      for(const method of ["HEAD","GET"]){
        response=await fetch(guard.url,{method,headers:HEADERS,redirect:"manual",
          signal:AbortSignal.timeout(timeoutMs)})
        if(method==="HEAD" && [403,405,501].includes(response.status)){
          if(response.body) await response.body.cancel()
          continue
        }
        break
      }
      if (!response) return {health:"error",status_code:null,final_url:current,detail:"no response"}
      const status=response.status
      const location=response.headers.get("location")
      if(response.body) await response.body.cancel()
      if(status>=300&&status<400&&location){
        current=new URL(location,guard.url).href
        continue
      }
      return {health:httpHealth(status),status_code:status,final_url:current,
        detail:status>=300&&status<400?"Redirect without location":""}
    }
    return {health:"error",status_code:null,final_url:current,detail:"Too many redirects"}
  }catch(e){
    return {health:"error",status_code:null,final_url:current,
      detail:String(e instanceof Error?e.message:e).slice(0,180)}
  }
}

export async function main() {
  const items=JSON.parse(readFileSync(resolve(ROOT,"data/seen.json"),"utf8"))
  const destination=resolve(process.env.SOURCE_MONITOR_OUTPUT||DEFAULT_OUTPUT)
  const concurrency=bounded(process.env.SOURCE_MONITOR_CONCURRENCY,1,8,4)
  const limit=bounded(process.env.SOURCE_MONITOR_LIMIT,0,10000,items.length)
  const started=new Date().toISOString()
  const targets=items.slice(0,limit)
  const results=await mapLimit(targets,concurrency,async (entry,index)=>{
    const result=await reachability(entry.url,bounded(process.env.SOURCE_MONITOR_TIMEOUT_MS,2000,20000,10000))
    return {index,id:entry.id||"",title:entry.title,url:entry.url,verified_at:entry.verified_at||"",
      ...result}
  })
  const counts=Object.fromEntries([...new Set(results.map(x=>x.health))].sort().map(
    state=>[state,results.filter(x=>x.health===state).length]))
  const report={generated_at:new Date().toISOString(),started_at:started,
    scope:"HTTP reachability only — never proof of current opportunity, eligibility or application opening.",
    total:items.length,checked:results.length,counts,results}
  mkdirSync(dirname(destination),{recursive:true})
  writeFileSync(destination,JSON.stringify(report,null,2)+"\n")
  const top=results.filter(x=>["missing","server_error","error","unsafe"].includes(x.health))
  console.log("Source reachability: "+JSON.stringify(counts)+" — report "+destination)
  for (const item of top.slice(0,20)) console.log("REVIEW "+item.health+" "+item.status_code+" "+item.url)
  if(process.env.GITHUB_STEP_SUMMARY) {
    const summary=[
      "### Opportunity Scout source reachability (advisory)",
      "Scanned "+results.length+"/"+items.length+" URLs. HTTP reachability is **not human verification**.",
      "Counts: "+JSON.stringify(counts),
      "Review missing/errors: "+top.length+". Download the source-health artifact for details.",
    ].join("\n")+"\n"
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary)
  }
  // External websites failing must never prevent dashboard deployments.
}
if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((e)=>{ console.error(e);process.exitCode=1 })
}
