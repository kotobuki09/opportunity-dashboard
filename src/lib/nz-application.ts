import type { NzPersonalEntry } from "./nz-jobs"

export const NZ_APPLICATION_TASKS=[
 {id:"eligibility",label:"Kiểm tra điều kiện PhD và quyền làm việc",hint:"Đối chiếu nội dung tuyển dụng; không suy đoán visa"},
 {id:"cv",label:"CV học thuật và danh sách công bố",hint:"Nêu đóng góp trong nghiên cứu viễn thông, AI hoặc lĩnh vực liên quan"},
 {id:"letter",label:"Cover letter / research statement",hint:"Điều chỉnh với đúng đề tài, PI và trường"},
 {id:"referees",label:"Người giới thiệu và tài liệu bổ sung",hint:"Kiểm tra số lượng thư và biểu mẫu theo từng tin"},
 {id:"submit",label:"Kiểm tra hạn thực tế và nộp hồ sơ",hint:"Kiểm tra cổng tuyển dụng của trường trước khi hoàn tất"},
] as const
export type NzApplicationTaskId=typeof NZ_APPLICATION_TASKS[number]["id"]
const VALID_IDS=new Set<string>(NZ_APPLICATION_TASKS.map(task=>task.id))
export function validNzChecked(value:unknown):NzApplicationTaskId[]{
 if(!Array.isArray(value))return []
 return [...new Set(value.filter((v):v is NzApplicationTaskId=>typeof v==="string"&&VALID_IDS.has(v)))].slice(0,NZ_APPLICATION_TASKS.length)
}
export function nzChecklistProgress(entry:Pick<NzPersonalEntry,"checked">|undefined){
 const checked=validNzChecked(entry?.checked)
 return {done:checked.length,total:NZ_APPLICATION_TASKS.length,percentage:Math.round(checked.length/NZ_APPLICATION_TASKS.length*100)}
}
export function nzToggleChecklist(entry:NzPersonalEntry|undefined,id:NzApplicationTaskId):NzApplicationTaskId[]{
 const previous=validNzChecked(entry?.checked)
 return previous.includes(id)?previous.filter(task=>task!==id):[...previous,id]
}
export function safeNzPersonalEntry(raw:unknown):NzPersonalEntry|null{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null
 const value=raw as Record<string,unknown>
 if(!["new","saved","preparing","applied","dismissed"].includes(String(value.status)))return null
 return {
  status:value.status as NzPersonalEntry["status"],
  note:typeof value.note==="string"?value.note.slice(0,2000):"",
  next_step:typeof value.next_step==="string"?value.next_step.slice(0,250):"",
  checked:validNzChecked(value.checked),
  updated_at:typeof value.updated_at==="string"&&Number.isFinite(Date.parse(value.updated_at))?value.updated_at:"",
 }
}
