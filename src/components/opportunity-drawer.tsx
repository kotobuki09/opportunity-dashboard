import * as React from "react"
import { CalendarPlusIcon, ExternalLinkIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { downloadCalendar } from "@/lib/calendar"
import type { PersonalEntry } from "@/lib/local-state"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

import { useIsMobile } from "@/hooks/use-mobile"
import { DeadlineBadge, StatusSelect } from "@/components/opportunity-bits"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { BENEFIT_LABELS, formatDate, formatDay, hasValue, money, type OpportunityRow, type Status } from "@/lib/opps"
import { qualityFor } from "@/lib/data-quality"

const TYPE_LABEL: Record<string, string> = {
  fixed: "Hạn cố định",
  rolling: "Rolling, nhận liên tục",
  rolling_cutoff: "Rolling, có cut-off theo đợt",
  opens_later: "Chưa mở, sẽ mở sau",
  unknown: "Chưa rõ",
}

export function OpportunityDrawer({
  item,
  onOpenChange,
  status,
  note,
  entry,
  onStatusChange,
  onNoteChange,
  onNextActionChange,
  onAddTask,
  onToggleTask,
  onRemoveTask,
  onClearPersonal,
}: {
  item: OpportunityRow | null
  onOpenChange: (open: boolean) => void
  status: Status
  note: string
  entry?: PersonalEntry
  onStatusChange: (s: Status) => void
  onNoteChange: (note: string) => void
  onNextActionChange?: (value: string) => void
  onAddTask?: (text: string) => void
  onToggleTask?: (id: string) => void
  onRemoveTask?: (id: string) => void
  onClearPersonal?: () => void
}) {
  const isMobile = useIsMobile()
  const [taskText, setTaskText] = React.useState("")
  const [confirmClear, setConfirmClear] = React.useState(false)
  const quality = item ? qualityFor(item) : null

  return (
    <Drawer direction={isMobile ? "bottom" : "right"} open={!!item} onOpenChange={(open) => { if (!open) setConfirmClear(false); onOpenChange(open) }}>
      <DrawerContent>
        {item && (
          <>
            <DrawerHeader className="gap-1">
              <DrawerTitle>{item.title}</DrawerTitle>
              <DrawerDescription>{item.category}</DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <DeadlineBadge row={item} />
                <Badge variant="outline" className="text-muted-foreground">{TYPE_LABEL[item.deadline_type] ?? item.deadline_type}</Badge>
              </div>
              <dl className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Hạn nộp (giờ VN)</dt>
                  <dd className="font-medium">
                    {item.deadline_iso ? formatDate(item.deadline_iso) : item.opens_iso ? `Mở ${formatDay(item.opens_iso)}` : item.deadline || "—"}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Giá trị · {BENEFIT_LABELS[item.benefit_kind]}</dt>
                  <dd className="font-medium">
                    {hasValue(item) ? item.value_text : <span className="text-muted-foreground">không rõ</span>}
                    {item.value_rank_approx && item.value_rank_usd != null && (
                      <span className="text-muted-foreground"> (≈ {money(item.value_rank_usd, "USD")})</span>
                    )}
                  </dd>
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <dt className="text-muted-foreground">Hạn theo nguồn</dt>
                  <dd>{item.deadline || "—"}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Phát hiện</dt>
                  <dd>{item.first_seen ? formatDay(item.first_seen) : "—"}</dd>
                </div>
                {item.verified_at && (
                  <div className="flex flex-col gap-1">
                    <dt className="text-muted-foreground">Kiểm tra lần cuối</dt>
                    <dd>{formatDay(item.verified_at)}</dd>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Dự án ERA Lab</dt>
                  <dd className="flex flex-wrap gap-1">
                    {item.project.length ? item.project.map((p) => <Badge key={p} variant="secondary">{p}</Badge>) : "—"}
                  </dd>
                </div>
                {item.stage_req && (
                  <div className="col-span-2 flex flex-col gap-1">
                    <dt className="text-muted-foreground">Yêu cầu giai đoạn</dt>
                    <dd>{item.stage_req}</dd>
                  </div>
                )}
              </dl>
              <Separator />
              <div className="flex flex-col gap-1">
                <div className="font-medium">Vì sao phù hợp</div>
                <p className="text-muted-foreground">{item.fit_note || "Chưa có ghi chú."}</p>
              </div>
              <div className="flex flex-col gap-1">
                <div className="font-medium">Điều kiện và lưu ý</div>
                <p className="text-muted-foreground">{item.eligibility_note || "Chưa có ghi chú."}</p>
              </div>
              <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Tình trạng chuẩn hoá & kiểm định</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">{quality?.needsVerification ? "Nguồn cần đối chiếu" : "Có ngày xác minh gần đây"}</Badge>
                  <Badge variant="outline">{quality?.needsNormalization ? "Metadata cần hoàn thiện" : "Metadata đã đủ"}</Badge>
                  {quality?.needsDeadlineReview && <Badge variant="outline">Trạng thái nộp chưa rõ</Badge>}
                </div>
                {quality?.findings.length ? (
                  <ul className="space-y-1.5">
                    {quality.findings.slice(0, 5).map((finding) => (
                      <li key={finding.code}><span className="font-medium text-foreground">{finding.label}:</span> {finding.action}</li>
                    ))}
                    {quality.findings.length > 5 && <li>… và {quality.findings.length - 5} vấn đề khác trong trung tâm chất lượng dữ liệu.</li>}
                  </ul>
                ) : <p>Không phát hiện thiếu metadata theo quy tắc; vẫn cần tự xác nhận tư cách ứng tuyển.</p>}
                <p>{item.verified_at
                  ? `Ngày kiểm tra được ghi: ${formatDay(item.verified_at)}. Không đồng nghĩa bạn đủ điều kiện.`
                  : "Chưa ghi nhận ngày kiểm tra thủ công. HTTP 200 hoặc AI rà soát không được coi là đã xác minh."}</p>
              </div>
              <Separator />
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="drawer-status">Trạng thái</FieldLabel>
                  <StatusSelect id="drawer-status" value={status} onChange={onStatusChange} className="w-full" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="drawer-note">Ghi chú riêng</FieldLabel>
                  <Textarea
                    id="drawer-note"
                    value={note}
                    onChange={(e) => onNoteChange(e.target.value)}
                    placeholder="Ví dụ: cần hỏi thư giới thiệu, chuẩn bị CV…"
                  />
                  <FieldDescription>Chỉ lưu trên trình duyệt này. Dùng Xuất/Nhập để chuyển máy.</FieldDescription>
                </Field>
                {onNextActionChange && (
                  <Field>
                    <FieldLabel htmlFor="drawer-next-action">Bước tiếp theo</FieldLabel>
                    <Input id="drawer-next-action" value={entry?.nextAction || ""}
                      onChange={(event) => onNextActionChange(event.target.value)}
                      placeholder="Ví dụ: chuẩn bị CV, xin thư giới thiệu..." />
                  </Field>
                )}
                {onAddTask && (
                  <Field>
                    <FieldLabel>Checklist hồ sơ</FieldLabel>
                    <div className="space-y-2">
                      {(entry?.tasks || []).map((task) => (
                        <div key={task.id} className="flex items-center gap-2 rounded-md border p-2">
                          <Checkbox checked={task.done} onCheckedChange={() => onToggleTask?.(task.id)}
                            aria-label={"Đánh dấu hoàn thành: " + task.text} />
                          <span className={"min-w-0 flex-1 text-sm " + (task.done ? "text-muted-foreground line-through" : "")}>{task.text}</span>
                          <Button type="button" size="icon" variant="ghost"
                            onClick={() => onRemoveTask?.(task.id)} aria-label={"Xóa công việc: " + task.text}>
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        </div>
                      ))}
                      <form className="flex gap-2" onSubmit={(event) => {
                        event.preventDefault()
                        if (!taskText.trim()) return
                        onAddTask(taskText)
                        setTaskText("")
                      }}>
                        <Input value={taskText} maxLength={200} onChange={(event) => setTaskText(event.target.value)}
                          aria-label="Công việc mới" placeholder="Thêm một công việc..." />
                        <Button type="submit" variant="outline" size="icon" disabled={!taskText.trim()} aria-label="Thêm công việc">
                          <PlusIcon className="size-4" />
                        </Button>
                      </form>
                    </div>
                    <FieldDescription>Ghi chú và checklist chỉ lưu trong trình duyệt, có thể xuất JSON để sao lưu.</FieldDescription>
                  </Field>
                )}
              </FieldGroup>
            </div>
            <DrawerFooter>
              {onClearPersonal && (entry?.status || entry?.note || entry?.nextAction || (entry?.tasks?.length || 0) > 0) && (
                confirmClear ? (
                  <div className="rounded-lg border border-destructive/40 p-3">
                    <p className="mb-3 text-xs text-muted-foreground">
                      Xóa ghi chú, checklist và trạng thái riêng của cơ hội này? Không thể hoàn tác nếu chưa sao lưu.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" onClick={() => { onClearPersonal(); setConfirmClear(false) }}>
                        Xác nhận xóa
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setConfirmClear(false)}>Hủy</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="ghost" onClick={() => setConfirmClear(true)} className="text-muted-foreground">
                    <Trash2Icon /> Xóa dữ liệu riêng của mục này
                  </Button>
                )
              )}
              {item.deadline_iso && (
                <Button variant="outline" onClick={() => downloadCalendar([item], "deadline-" + item.id + ".ics")}>
                  <CalendarPlusIcon /> Thêm hạn nộp vào lịch
                </Button>
              )}
              <Button asChild>
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  Mở trang chính thức
                  <ExternalLinkIcon data-icon="inline-end" />
                </a>
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Đóng</Button>
              </DrawerClose>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}
