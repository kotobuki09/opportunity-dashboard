import type { Opportunity } from "./opps"

export const REVIEW_PHASE_LABELS = {
  not_started:"Chưa phân công",
  checking:"Đang đối chiếu",
  waiting_source:"Chờ chứng cứ",
  proposal_ready:"Đã chuẩn bị đề xuất",
  needs_recheck:"Nguồn vừa thay đổi",
} as const
export type ReviewPhase=Exclude<keyof typeof REVIEW_PHASE_LABELS,"needs_recheck">
export type EffectiveReviewPhase=keyof typeof REVIEW_PHASE_LABELS

/**
 * Lightweight non-cryptographic change token for *personal review progress*.
 * Not evidence of authenticity and never used to assert eligibility.
 */
export function reviewRecordStamp(row:Pick<Opportunity,
  "title"|"url"|"deadline"|"deadline_iso"|"deadline_type"|"opens_iso"|
  "value_text"|"benefit_kind"|"eligibility_note"|"stage_req"|"fit_note"|"project"|"verified_at"|"review_evidence">):string{
 const value=JSON.stringify([row.title,row.url,row.deadline,row.deadline_iso,row.deadline_type,
   row.opens_iso,row.value_text,row.benefit_kind,row.eligibility_note,row.stage_req,row.fit_note,
   row.project,row.verified_at,row.review_evidence])
 let h=2166136261
 for(let i=0;i<value.length;i++){
  h=Math.imul(h^value.charCodeAt(i),16777619)
 }
 return (h>>>0).toString(16).padStart(8,"0")
}
export function effectiveReviewPhase(
 row:Parameters<typeof reviewRecordStamp>[0],
 personal:{reviewPhase?:ReviewPhase;reviewStamp?:string},
):EffectiveReviewPhase{
 const phase=personal.reviewPhase||"not_started"
 if(phase==="not_started")return phase
 if(personal.reviewStamp!==reviewRecordStamp(row))return "needs_recheck"
 return phase
}
export function phaseIsActive(phase:EffectiveReviewPhase):boolean{
 return phase==="checking"||phase==="waiting_source"||phase==="proposal_ready"
}
