import test from "node:test"
import assert from "node:assert/strict"
import { matchKeywords, parseFeed, selectCandidates } from "./feed-utils.mjs"

const sample='<rss version="2.0"><channel><item><title><![CDATA[AI &amp; Wireless Research Grant]]></title>'+
  '<link>https://www.nsf.gov/funding/ai-wireless?utm_source=rss</link>'+
  '<description>Funding for autonomous systems.</description></item>'+
  '<item><title>Unrelated botanical study</title><link>https://www.nsf.gov/funding/botany</link></item>'+
  '<item><title>Phishing entry</title><link>https://private.example.net/apply</link></item>'+
  '</channel></rss>'

test("RSS parsing is bounded and does not trust unrelated web content",()=>{
  const rows=parseFeed(sample)
  assert.equal(rows.length,3)
  assert.ok(rows[0].title.includes("Wireless"))
  assert.throws(()=>parseFeed("<!DOCTYPE html><html></html>"))
  assert.throws(()=>parseFeed("<rss><!ENTITY local SYSTEM 'file:///etc/passwd'></rss>"))
})

test("only official, relevant, nonduplicate candidates survive",()=>{
  const parsed=parseFeed(sample)
  const conf={id:"nsf",official_host:"nsf.gov",category_hint:"Tài trợ/Grant"}
  const candidates=selectCandidates(parsed,conf,[])
  assert.equal(candidates.length,1)
  assert.equal(candidates[0].review_state,"requires_human_verification")
  assert.equal(candidates[0].deadline,"unknown")
  assert.equal("verified_at" in candidates[0],false)
  const deduped=selectCandidates(parsed,conf,[{url:"https://nsf.gov/funding/ai-wireless"}])
  assert.equal(deduped.length,0)
})

test("keywords are matched as words rather than substrings",()=>{
  assert.equal(matchKeywords("Sailing research").keywords.includes("ai"),false)
  assert.ok(matchKeywords("AI cybersecurity agentic systems").score>5)
})

test("Atom entries are supported",()=>{
  const xml='<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>AI innovation</title>'+
    '<link rel="alternate" href="https://www.nsf.gov/ai"/><summary>research</summary></entry></feed>'
  assert.equal(parseFeed(xml)[0].url,"https://www.nsf.gov/ai")
})
