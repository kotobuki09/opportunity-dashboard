import test from "node:test"
import assert from "node:assert/strict"
import {parseSourceHealth,sourceSnapshotAge,snapshotCompatible,healthByUrl} from "../src/lib/source-health.ts"

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

test("source scan is usable only for the exact canonical URLs and current date",()=>{
 const digest="a".repeat(64)
 const report=parseSourceHealth({...good,source_digest:digest})
 assert.equal(snapshotCompatible(report,digest,new Date("2026-10-09T11:00:00Z")),true)
 assert.equal(snapshotCompatible(report,"b".repeat(64),new Date("2026-10-09T11:00:00Z")),false)
 assert.equal(snapshotCompatible(parseSourceHealth(good),digest,new Date("2026-10-09T11:00:00Z")),false)
 assert.equal(snapshotCompatible(report,digest,new Date("2026-11-01T11:00:00Z")),false)
})
test("malformed digest and duplicate scanned URLs fail closed",()=>{
 assert.equal(parseSourceHealth({...good,source_digest:"bad"}),null)
 assert.equal(parseSourceHealth({...good,results:[good.results[0],good.results[0]]}),null)
})
test("consecutive unreachable counts are informational, not program closure",()=>{
 const report=parseSourceHealth({...good,source_digest:"a".repeat(64),results:[
  {...good.results[0],previous_health:"missing",unreachable_streak:0},
  {...good.results[1],previous_health:"restricted",unreachable_streak:3},
 ]})
 assert.equal(report.results[1].unreachable_streak,3)
 assert.equal(report.results[1].previous_health,"restricted")
 assert.equal(report.results[0].unreachable_streak,0)
})
