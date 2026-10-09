import test from "node:test"
import assert from "node:assert/strict"
import {parseSourceHealth,sourceSnapshotAge,healthByUrl} from "../src/lib/source-health.ts"

const good={generated_at:"2026-10-09T10:00:00.000Z",total:3,checked:2,
 results:[{url:"https://example.org/a",health:"reachable",status_code:200},
 {url:"https://another.org",health:"restricted",status_code:403}]}
test("public source transport snapshot is distinct from human verified_at",()=>{
 const result=parseSourceHealth(good)
 assert.equal(result?.counts.reachable,1)
 assert.equal(result?.counts.restricted,1)
 assert.equal(result?.results.length,2)
 assert.equal(result?.results[0].status_code,200)
 assert.deepEqual(healthByUrl(result).get("https://example.org/a")?.health,"reachable")
 assert.equal("verified_at" in result.results[0],false)
})
test("partial and malformed reports cannot assert healthy sources",()=>{
 assert.equal(parseSourceHealth({generated_at:null,results:[]}),null)
 assert.equal(parseSourceHealth({...good,checked:10}),null)
 assert.equal(parseSourceHealth({...good,results:[{url:"javascript:alert(1)",health:"reachable",status_code:200}]}),null)
 assert.equal(parseSourceHealth({...good,results:[{url:"https://example.org",health:"bogus",status_code:200}]}),null)
})
test("stale scanner output is visibly distinguished from healthy freshness",()=>{
 const now=new Date("2026-10-09T11:00:00Z")
 assert.equal(sourceSnapshotAge(parseSourceHealth(good),now),"current")
 assert.equal(sourceSnapshotAge(parseSourceHealth({...good,generated_at:"2026-10-01T10:00:00Z"}),now),"aging")
 assert.equal(sourceSnapshotAge(parseSourceHealth({...good,generated_at:"2026-09-10T10:00:00Z"}),now),"outdated")
 assert.equal(sourceSnapshotAge(null),"unavailable")
})
