import test from "node:test"
import assert from "node:assert/strict"
import {publicHealth} from "./publish-health.mjs"

const t="2026-10-09T10:12:00.000Z"
const canonical=[{url:"https://one.example.org"},{url:"https://two.example.org"}]
const source={generated_at:t,results:[
  {title:"=malicious",id:"private",url:"https://one.example.org",health:"reachable",status_code:200,final_url:"http://private",detail:"secret",verified_at:"today"},
  {url:"https://two.example.org",health:"restricted",status_code:403}
]}
test("snapshot keeps only matched URLs and public transport codes, not titles or verified_at",()=>{
 const result=publicHealth(source,canonical,new Date("2026-10-09T11:00:00Z"))
 assert.equal(result.checked,2)
 assert.deepEqual(result.counts,{reachable:1,restricted:1})
 assert.equal(JSON.stringify(result).includes("private"),false)
 assert.equal(JSON.stringify(result).includes("malicious"),false)
 assert.equal(JSON.stringify(result).includes("verified_at"),false)
})
test("unsafe, duplicated, future and unexpected monitor data fails closed",()=>{
 const clock=new Date("2026-10-09T11:00:00Z")
 assert.throws(()=>publicHealth({...source,results:[...source.results,source.results[0]]},canonical,clock))
 assert.throws(()=>publicHealth({...source,results:[{url:"https://evil.example.org",health:"reachable",status_code:200}]},canonical,clock))
 assert.throws(()=>publicHealth({...source,results:[{url:"https://one.example.org",health:"hacked",status_code:200}]},canonical,clock))
 assert.throws(()=>publicHealth({...source,generated_at:"2050-01-01T00:00:00.000Z"},canonical,clock))
})

test("source snapshots carry the exact stable URL population fingerprint",()=>{
 const result=publicHealth(source,canonical,new Date("2026-10-09T11:00:00Z"))
 assert.match(result.source_digest,/^[0-9a-f]{64}$/)
 assert.throws(()=>publicHealth({...source,total:9},canonical,new Date("2026-10-09T11:00:00Z")))
})
test("repeat transport failures are counted without converting HTTP errors into evidence of closure",()=>{
 const first=publicHealth(source,canonical,new Date("2026-10-09T11:00:00Z"))
 const second=publicHealth({...source,generated_at:"2026-10-10T10:12:00.000Z"},
   canonical,new Date("2026-10-10T11:00:00Z"),first)
 assert.equal(second.results.find(x=>x.health==="restricted").unreachable_streak,2)
 assert.equal(second.results.find(x=>x.health==="reachable").unreachable_streak,0)
 const recovered=publicHealth({...source,generated_at:"2026-10-11T10:12:00.000Z",
  results:source.results.map(x=>({...x,health:"reachable",status_code:200}))},
  canonical,new Date("2026-10-11T11:00:00Z"),second)
 assert.equal(recovered.results[1].unreachable_streak,0)
 assert.equal(recovered.results[1].previous_health,"restricted")
 const mismatched={...first,source_digest:"0".repeat(64)}
 const reset=publicHealth({...source,generated_at:"2026-10-11T10:12:00.000Z"},
  canonical,new Date("2026-10-11T11:00:00Z"),mismatched)
 assert.equal(reset.results[1].unreachable_streak,1)
})
