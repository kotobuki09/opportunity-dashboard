import type { OpportunityRow, ReviewEvidence, BenefitKind } from "./opps"

export type ReviewField="eligibility_note"|"stage_req"|"fit_note"|"benefit_kind"|"project"
export type ReviewDraft={
 eligibility_note:string;stage_req:string;fit_note:string;benefit_kind:BenefitKind;project:string
 source_url:string;summary:string;humanChecked:boolean
}
export const REVIEW_FIELDS:readonly ReviewField[]=["eligibility_note","stage_req","fit_note","benefit_kind","project"]
const BENEFITS=new Set(["grant","prize","equity","credits","stipend","contract","in_kind","unknown"])
const clean=(s:string)=>s.trim()
const DAY_FMT=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"})
export function dateInVietnam(date:Date):string{
 const p=Object.fromEntries(DAY_FMT.formatToParts(date).map(x=>[x.type,x.value]))
 return p.year+"-"+p.month+"-"+p.day
}
export function draftFor(row:OpportunityRow):ReviewDraft{
 return {eligibility_note:row.eligibility_note,stage_req:row.stage_req,fit_note:row.fit_note,
  benefit_kind:row.benefit_kind,project:row.project.join(", "),source_url:row.url,summary:"",humanChecked:false}
}
export function validateSourceUrl(value:string):boolean{
 try{const u=new URL(value);return ["http:","https:"].includes(u.protocol)&&u.hostname.includes(".")&&
  !u.username&&!u.password&&u.port===""&&u.href.length<1800}
 catch{return false}
}
/**
 * A *proposal*, not an automatic edit/merge. No account token is requested and
 * no browser-local personal notes, statuses or checklists are included.
 */
export function buildReviewProposal(row:OpportunityRow,draft:ReviewDraft,validProjects:readonly string[],now=new Date()) {
 const projects=[...new Set(draft.project.split(",").map(clean).filter(Boolean))]
 if(projects.some(x=>!validProjects.includes(x)))throw Error("Chọn tên dự án hợp lệ từ danh sách ERA Lab; phân tách bằng dấu phẩy.")
 if(!BENEFITS.has(draft.benefit_kind))throw Error("Loại quyền lợi không hợp lệ.")
 for(const key of ["eligibility_note","stage_req","fit_note"] as const){
  if(draft[key].length>2000)throw Error("Nội dung "+key+" vượt 2.000 ký tự.")
 }
 if(!validateSourceUrl(draft.source_url))throw Error("Nguồn chứng cứ phải là URL http(s) công khai hợp lệ.")
 const original={eligibility_note:row.eligibility_note,stage_req:row.stage_req,
  fit_note:row.fit_note,benefit_kind:row.benefit_kind,project:row.project}
 const next={eligibility_note:clean(draft.eligibility_note),stage_req:clean(draft.stage_req),
  fit_note:clean(draft.fit_note),benefit_kind:draft.benefit_kind,project:projects}
 const changes=Object.fromEntries(REVIEW_FIELDS.filter(key=>
  JSON.stringify(original[key])!==JSON.stringify(next[key])).map(key=>[key,{before:original[key],after:next[key]}]))
 if(!Object.keys(changes).length)throw Error("Hãy sửa ít nhất một trường trước khi xuất đề xuất.")
 const summary=clean(draft.summary)
 if(summary.length>1200)throw Error("Ghi chú bằng chứng tối đa 1.200 ký tự.")
 if(draft.humanChecked&&summary.length<8)throw Error("Cần ghi chú chứng cứ tối thiểu 8 ký tự khi xác nhận đã đối chiếu.")
 const review_evidence:ReviewEvidence[]=draft.humanChecked?
  (Object.keys(changes) as ReviewField[]).map(field=>({field,source_url:draft.source_url,
   checked_at:dateInVietnam(now),summary})): []
 return {
  kind:"opportunity-scout.editorial-proposal",version:1,created_at:now.toISOString(),
  record:{id:row.id,title:row.title,url:row.url},
  changes,review_evidence,
  needs_human_review:true,
  source_note:summary||"Chưa đính kèm chứng cứ thủ công.",
  verification_policy:"Không thay đổi verified_at hoặc trạng thái hồ sơ. Đề xuất chỉ có hiệu lực sau khi tạo và duyệt PR cho data/seen.json.",
 }
}
