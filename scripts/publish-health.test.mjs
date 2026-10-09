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
