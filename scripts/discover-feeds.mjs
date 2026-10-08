// Advisory official-feed discovery. Produces review candidates, NEVER changes data/seen.json.
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs"
import { dirname,resolve } from "node:path"
import { fileURLToPath,pathToFileURL } from "node:url"
import { parseFeed, selectCandidates } from "./feed-utils.mjs"
import { validatePublicUrl, ensurePublicHost, mapLimit } from "./source-utils.mjs"
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..")
const MAX_BYTES=2_000_000

async function fetchFeed(url,officialHost) {
  let current=url
  for(let hop=0;hop<4;hop++){
    const guard=validatePublicUrl(current)
    if(!guard.safe)throw new Error("Unsafe feed URL: "+guard.reason)
    const host=guard.url.hostname.toLowerCase()
    if(host!==officialHost && !host.endsWith("."+officialHost))throw new Error("Feed redirect left official domain")
    await ensurePublicHost(guard.url)
    const response=await fetch(guard.url,{redirect:"manual",
      headers:{"Accept":"application/rss+xml, application/atom+xml, text/xml, application/xml",
        "User-Agent":"OpportunityScoutFeedReader/1.0"},
      signal:AbortSignal.timeout(15000)})
    if(response.status>=300&&response.status<400){
      const location=response.headers.get("location")
      if(response.body)await response.body.cancel()
      if(!location)throw new Error("Redirect without location")
      current=new URL(location,guard.url).href
      continue
    }
    if(!response.ok)throw new Error("HTTP "+response.status)
    if(response.headers.get("content-length")&&Number(response.headers.get("content-length"))>MAX_BYTES)throw new Error("Feed too large")
    const chunks=[]
    let total=0
    if(!response.body)throw new Error("Empty feed")
    for await (const chunk of response.body){
      total+=chunk.length
      if(total>MAX_BYTES)throw new Error("Feed exceeds size limit")
      chunks.push(chunk)
    }
    return Buffer.concat(chunks).toString("utf8")
  }
  throw new Error("Too many feed redirects")
}

export async function main(){
  const feeds=JSON.parse(readFileSync(resolve(ROOT,"data/discovery-feeds.json"),"utf8"))
  const existing=JSON.parse(readFileSync(resolve(ROOT,"data/seen.json"),"utf8"))
  const all=await mapLimit(feeds,3,async source=>{
    try {
      const rows=parseFeed(await fetchFeed(source.url,source.official_host))
      return {feed_id:source.id,state:"ok",entries:rows.length,
        candidates:selectCandidates(rows,source,existing,100)}
    } catch(error) {
      return {feed_id:source.id,state:"error",entries:0,candidates:[],
        message:String(error instanceof Error?error.message:error).slice(0,220)}
    }
  })
  const seen=new Set()
  const candidates=all.flatMap(x=>x.candidates).sort((a,b)=>b.keyword_score-a.keyword_score)
    .filter(x=>{if(seen.has(x.official_url))return false;seen.add(x.official_url);return true}).slice(0,100)
  const report={generated_at:new Date().toISOString(),
    scope:"Official-feed discovery candidates only; NOT verified opportunities, deadlines, values, or applicant eligibility.",
    feeds:all.map(({candidates,...x})=>({...x,candidates:candidates.length})),
    count:candidates.length,candidates}
  const destination=resolve(process.env.DISCOVERY_OUTPUT||resolve(ROOT,"artifacts/discovery-review.json"))
  mkdirSync(dirname(destination),{recursive:true})
  writeFileSync(destination,JSON.stringify(report,null,2)+"\n")
  console.log("Discovery review queue: "+report.count+" candidates; feeds "+JSON.stringify(report.feeds))
  if(process.env.GITHUB_STEP_SUMMARY){
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      "### Official-feed candidate review (advisory)\n"+
      "Candidates: "+report.count+"; feeds: "+feeds.length+". Download discovery-review artifact.\n"+
      "**Do not import without reviewing the official link, country eligibility, open state, and exact deadline.**\n")
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  main().catch(e=>{console.error(e);process.exitCode=1})
}
