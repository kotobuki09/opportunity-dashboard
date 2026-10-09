/**
 * Sanitize an advisory source monitor artifact for publication on GitHub Pages.
 * This is *transport reachability*, never human source verification.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..")
const STATES=new Set(["reachable","restricted","missing","server_error","error","unsafe","uncertain"])
const safeIso=(value)=>typeof value==="string" && !Number.isNaN(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}T/.test(value)

export function publicHealth(raw, canonical, now=new Date()) {
  if(!Array.isArray(canonical) || !raw || !Array.isArray(raw.results))throw Error("Invalid source report")
  if(!safeIso(raw.generated_at) || Date.parse(raw.generated_at)>now.getTime()+300_000)throw Error("Invalid report timestamp")
  if(raw.results.length>canonical.length)throw Error("More observations than source records")
  const allowed=new Set(canonical.map(item=>item.url))
  const seen=new Set()
  const records=raw.results.map(item=>{
    if(typeof item.url!=="string" || !allowed.has(item.url) || seen.has(item.url))throw Error("Duplicate or unexpected source URL")
    if(!STATES.has(item.health))throw Error("Invalid health status")
    if(item.status_code!==null && (!Number.isInteger(item.status_code)||item.status_code<100||item.status_code>599)){
      throw Error("Invalid HTTP status")
    }
    seen.add(item.url)
    return {url:item.url,health:item.health,status_code:item.status_code}
  })
  const counts=Object.fromEntries([...STATES].sort().map(health=>[health,records.filter(x=>x.health===health).length]).filter(([,n])=>n))
  return {
    generated_at:raw.generated_at,
    scope:"Automated HTTP transport check only; NOT human verification, open status, deadline or applicant eligibility.",
    total:canonical.length,checked:records.length,counts,results:records,
  }
}

export function main() {
  const input=resolve(process.env.SOURCE_MONITOR_OUTPUT || resolve(ROOT,"artifacts/source-health.json"))
  const output=resolve(process.env.SOURCE_PUBLISH_OUTPUT || resolve(ROOT,"public/source-health.json"))
  const report=JSON.parse(readFileSync(input,"utf8"))
  const canonical=JSON.parse(readFileSync(resolve(ROOT,"data/seen.json"),"utf8"))
  const result=publicHealth(report,canonical)
  mkdirSync(dirname(output),{recursive:true})
  writeFileSync(output,JSON.stringify(result,null,2)+"\n")
  console.log("Public advisory source snapshot:",result.checked,"/",result.total,JSON.stringify(result.counts))
}

if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {main()}catch(error){console.error(error);process.exitCode=1}
}
