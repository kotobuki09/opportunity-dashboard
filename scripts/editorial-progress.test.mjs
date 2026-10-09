import test from "node:test"
import assert from "node:assert/strict"
import {reviewRecordStamp,effectiveReviewPhase,phaseIsActive} from "../src/lib/editorial-progress.ts"

const row={title:"Grant",url:"https://example.org",deadline:"rolling",deadline_iso:null,deadline_type:"rolling",
  opens_iso:null,value_text:"không rõ",benefit_kind:"unknown",eligibility_note:"",stage_req:"",fit_note:"",
  project:[],verified_at:"",review_evidence:[]}
test("private editorial review progress remains valid on same public record",()=>{
 const token=reviewRecordStamp(row)
 assert.match(token,/^[a-f0-9]{8}$/)
 assert.equal(effectiveReviewPhase(row,{reviewPhase:"checking",reviewStamp:token}),"checking")
 assert.equal(effectiveReviewPhase(row,{reviewPhase:"proposal_ready",reviewStamp:token}),"proposal_ready")
 assert.equal(phaseIsActive("proposal_ready"),true)
 assert.equal(phaseIsActive("needs_recheck"),false)
})
test("public source change requires review again, never marks data verified",()=>{
 const stamp=reviewRecordStamp(row)
 assert.notEqual(reviewRecordStamp({...row,eligibility_note:"Country restriction"}),stamp)
 assert.notEqual(reviewRecordStamp({...row,review_evidence:[{field:"stage_req",source_url:row.url,checked_at:"2026-10-09",summary:"Program rule"}]}),stamp)
 assert.equal(effectiveReviewPhase({...row,stage_req:"Research institution"},{reviewPhase:"proposal_ready",reviewStamp:stamp}),"needs_recheck")
 assert.equal(effectiveReviewPhase(row,{reviewPhase:"not_started",reviewStamp:"bad"}),"not_started")
 assert.equal(effectiveReviewPhase(row,{reviewPhase:"checking"}),"needs_recheck")
})
