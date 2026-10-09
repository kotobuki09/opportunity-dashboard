import test from "node:test"
import assert from "node:assert/strict"
import {sourceUniverseDigest} from "./source-universe.mjs"

const a=[{url:"https://example.org/a",title:"A"},{url:"https://example.org/b",title:"B"}]
test("source digest tracks URL population, not order or unrelated metadata",()=>{
 const sig=sourceUniverseDigest(a)
 assert.match(sig,/^[0-9a-f]{64}$/)
 assert.equal(sig,sourceUniverseDigest([...a].reverse()))
 assert.equal(sig,sourceUniverseDigest([{...a[0],title:"edited"},{...a[1],verified_at:"2026-10-09"}]))
 assert.notEqual(sig,sourceUniverseDigest([{...a[0],url:"https://example.org/new"},a[1]]))
})
test("malformed or duplicate scan populations fail closed",()=>{
 assert.throws(()=>sourceUniverseDigest([a[0],a[0]]))
 assert.throws(()=>sourceUniverseDigest([{url:"javascript:alert(1)"}]))
})
