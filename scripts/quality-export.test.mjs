import test from "node:test"
import assert from "node:assert/strict"
import { buildQualityCsv } from "../src/lib/quality-export.ts"
const row = {
  id:"oppx",title:"=IMPORTXML(A1)",url:"https://example.org/grant",
  category:"Startup",project:["AIMed"],state:"rolling",
  verified_at:"",deadline_iso:null,deadline_type:"rolling",
  value_text:"không rõ",benefit_kind:"unknown",fit_note:"",
  eligibility_note:"",stage_req:"",daysLeft:null,
}
test("quality CSV contains UTF-8 BOM, public issues and safe Excel cells",()=>{
  const text=buildQualityCsv([row],new Date("2026-10-09T11:00:00Z"))
  assert.equal(text[0],"\uFEFF")
  assert.ok(text.includes('"'+"'"+row.title+'"'))
  assert.ok(text.includes("Chưa xác minh nguồn"))
  assert.ok(text.includes("Chưa phân loại quyền lợi"))
  assert.ok(text.includes("https://example.org/grant"))
  assert.equal(text.includes("private-notes"),false)
})
test("CSV escapes quotes, line breaks and keeps rolling dates empty",()=>{
  const text=buildQualityCsv([{...row,title:'A "research"\nprogram'}])
  assert.ok(text.includes('"A ""research"" program"'))
  assert.ok(text.includes(',"",')) // no fixed deadline for legitimate rolling calls
})
