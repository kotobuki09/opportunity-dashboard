import test from "node:test"
import assert from "node:assert/strict"
import {NZ_APPLICATION_TASKS,nzChecklistProgress,nzToggleChecklist,safeNzPersonalEntry,validNzChecked} from "../src/lib/nz-application.ts"
import {loadNzTracking} from "../src/lib/nz-jobs.ts"
test("new academic application checklist has five independent, editable steps",()=>{
 assert.equal(NZ_APPLICATION_TASKS.length,5)
 const entry={status:"preparing",updated_at:"2026-10-10T00:00:00Z",checked:["cv","letter"]}
 assert.deepEqual(nzChecklistProgress(entry),{done:2,total:5,percentage:40})
 assert.deepEqual(nzToggleChecklist(entry,"referees"),["cv","letter","referees"])
 assert.deepEqual(nzToggleChecklist(entry,"cv"),["letter"])
})
test("import/export sanitizes old browser data without dropping notes",()=>{
 const old={status:"saved",note:"Contact professor",updated_at:"2026-10-09T12:00:00Z"}
 assert.deepEqual(safeNzPersonalEntry(old),{...old,checked:[],next_step:""})
 assert.equal(safeNzPersonalEntry({status:"invalid"}),null)
 assert.deepEqual(validNzChecked(["cv","cv","fake",22,"letter"]),["cv","letter"])
})
test("private backup accepts valid steps and limits text and unknown fields",()=>{
 const safe=safeNzPersonalEntry({
  status:"preparing",note:"n".repeat(5000),next_step:"x".repeat(600),
  checked:["cv","eligibility","invalid","submit","cv"],updated_at:"not a timestamp",
  role:"admin",source_verified:true,
 })
 assert.equal(safe.note.length,2000)
 assert.equal(safe.next_step.length,250)
 assert.deepEqual(safe.checked,["cv","eligibility","submit"])
 assert.equal(safe.updated_at,"")
 assert.equal("role" in safe,false)
 assert.equal("source_verified" in safe,false)
})
test("legacy localStorage tracking restores, including new checklist, ignoring bad IDs",()=>{
 const old=globalThis.localStorage
 try{
  globalThis.localStorage={getItem:()=>JSON.stringify({
   "uoa-2026-autonomous-agency-60022330":{status:"preparing",note:"local note",checked:["cv","referees"],next_step:"Send cover letter"},
   "!unsafe!":{status:"applied"},
  })}
  const result=loadNzTracking()
  assert.equal(Object.keys(result).length,1)
  assert.equal(result["uoa-2026-autonomous-agency-60022330"].next_step,"Send cover letter")
  assert.deepEqual(result["uoa-2026-autonomous-agency-60022330"].checked,["cv","referees"])
 }finally{globalThis.localStorage=old}
})
