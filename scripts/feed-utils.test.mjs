import test from "node:test"
import assert from "node:assert/strict"
import { matchKeywords, parseFeed, selectCandidates, priorReviewDecision } from "./feed-utils.mjs"
import { readFileSync } from "node:fs"

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

test("review ledger filters 34 already-screened 2026-10-08 entries without hiding new calls",()=>{
  const ledger=JSON.parse(readFileSync(new URL("../data/discovery-reviewed.json",import.meta.url),"utf8"))
  assert.equal(ledger.reviewed_nafosted_titles.length,10)
  assert.equal(ledger.reviewed_nsf_codes.length,21)
  for(const row of ledger.reviewed_nafosted_titles){
    const candidate={source_id:"nafosted-vietnam",title:row.title,official_url:"https://nafosted.gov.vn/"}
    assert.equal(priorReviewDecision(candidate,ledger),row.decision)
  }
  for(const row of ledger.reviewed_nsf_codes){
    for(const suffix of ["","/solicitation"]){
      const candidate={source_id:"nsf-upcoming",title:"NSF official grant",official_url:"https://www.nsf.gov/funding/example/"+row.code+suffix}
      assert.equal(priorReviewDecision(candidate,ledger),row.decision)
    }
  }
  const newNafosted={source_id:"nafosted-vietnam",title:"Thông báo chương trình mới 2027",official_url:"https://nafosted.gov.vn/new/"}
  const newNsf={source_id:"nsf-funding",title:"Future",official_url:"https://www.nsf.gov/funding/nsf27-999"}
  assert.equal(priorReviewDecision(newNafosted,ledger),null)
  assert.equal(priorReviewDecision(newNsf,ledger),null)
})
