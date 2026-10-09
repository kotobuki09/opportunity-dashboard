import test from "node:test"
import assert from "node:assert/strict"
import {draftFor,buildReviewProposal,validateSourceUrl} from "../src/lib/review-proposal.ts"

const row={id:"u1",title:"Grant",url:"https://official.example.com/program",
  eligibility_note:"",stage_req:"",fit_note:"",benefit_kind:"unknown",
  project:[],verified_at:"",status:"mới",nextAction:"PRIVATE",note:"SECRET",
  state:"open",daysLeft:2,rank:10,deadline_iso:"2026-10-11T10:00:00+07:00"}
const projects=["AIMed","ActantOS","ScienzaOS"]
const now=new Date("2026-10-09T10:00:00Z")
test("unconfirmed draft carries changed fields without fabricated verified_at",()=>{
 const draft=draftFor(row);draft.stage_req="Chỉ các tổ chức";draft.project="AIMed"
 const proposal=buildReviewProposal(row,draft,projects,now)
 assert.deepEqual(Object.keys(proposal.changes).sort(),["project","stage_req"])
 assert.deepEqual(proposal.review_evidence,[])
 assert.equal(JSON.stringify(proposal).includes("verified_at"),true) // policy note only
 assert.equal(JSON.stringify(proposal).includes("PRIVATE"),false)
 assert.equal(JSON.stringify(proposal).includes("SECRET"),false)
 assert.equal(proposal.record.url,row.url)
})
test("explicitly confirmed review adds field-level evidence but not auto program verification",()=>{
 const draft=draftFor(row);draft.eligibility_note="Vietnamese researchers"
 draft.humanChecked=true;draft.summary="Eligibility published on the program page."
 const proposal=buildReviewProposal(row,draft,projects,now)
 assert.equal(proposal.review_evidence.length,1)
 assert.equal(proposal.review_evidence[0].checked_at,"2026-10-09")
 assert.equal(proposal.review_evidence[0].field,"eligibility_note")
 assert.equal(proposal.changes.eligibility_note.after,"Vietnamese researchers")
})
test("invalid source, project, missing changes, insufficient evidence are rejected",()=>{
 assert.equal(validateSourceUrl("file:///etc/passwd"),false)
 assert.equal(validateSourceUrl("https://u:p@example.org"),false)
 assert.throws(()=>buildReviewProposal(row,draftFor(row),projects))
 const draft=draftFor(row);draft.project="FakeCo";assert.throws(()=>buildReviewProposal(row,draft,projects))
 draft.project="AIMed";draft.source_url="javascript:alert(1)";assert.throws(()=>buildReviewProposal(row,draft,projects))
 draft.source_url=row.url;draft.humanChecked=true;draft.summary="none";assert.throws(()=>buildReviewProposal(row,draft,projects))
})

test("one official citation cannot silently attest unrelated metadata fields",()=>{
 const draft=draftFor(row)
 draft.stage_req="Early-stage only";draft.project="AIMed"
 draft.humanChecked=true;draft.summary="Exact official eligibility clause"
 assert.throws(()=>buildReviewProposal(row,draft,projects,now),/một trường/)
 draft.evidenceField="stage_req"
 const patch=buildReviewProposal(row,draft,projects,now)
 assert.deepEqual(Object.keys(patch.changes).sort(),["project","stage_req"])
 assert.equal(patch.review_evidence.length,1)
 assert.equal(patch.review_evidence[0].field,"stage_req")
 draft.evidenceField="fit_note"
 assert.throws(()=>buildReviewProposal(row,draft,projects,now),/một trường/)
})
