import test from "node:test"
import assert from "node:assert/strict"
import { canonicalUrl, isPrivateIp, validatePublicUrl, httpHealth, mapLimit } from "./source-utils.mjs"

test("URL dedupe drops tracking parameters but not meaningful queries", () => {
  assert.equal(canonicalUrl("https://www.Example.org/page/?utm_source=a#x"), "example.org/page")
  assert.equal(canonicalUrl("http://example.org/page?code=123"), "example.org/page?code=123")
  assert.equal(canonicalUrl("bogus"), "")
})

test("monitor rejects local and unexpected destinations",()=>{
  for (const u of ["file:///etc/passwd","http://localhost/","http://127.0.0.1/a",
    "http://10.0.0.3/", "http://[::1]/", "https://host.local/a", "https://example.org:8080/a",
    "https://u:p@example.org/"]) assert.equal(validatePublicUrl(u).safe,false,u)
  assert.equal(validatePublicUrl("https://www.nsf.gov/funding/").safe,true)
  assert.equal(isPrivateIp("192.168.1.1"),true)
  assert.equal(isPrivateIp("8.8.8.8"),false)
})

test("HTTP health states avoid conflating bot blocking with dead opportunities",()=>{
  assert.equal(httpHealth(200),"reachable")
  assert.equal(httpHealth(403),"restricted")
  assert.equal(httpHealth(429),"restricted")
  assert.equal(httpHealth(404),"missing")
  assert.equal(httpHealth(502),"server_error")
})

test("bounded async mapping preserves input order",async()=>{
  const a=await mapLimit([1,2,3,4],2,async x=>{await new Promise(r=>setTimeout(r,(5-x)*3));return x*2})
  assert.deepEqual(a,[2,4,6,8])
})
