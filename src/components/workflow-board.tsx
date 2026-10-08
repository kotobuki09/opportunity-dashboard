import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { GripVerticalIcon, KanbanSquareIcon } from "lucide-react"
import { DeadlineBadge, STATUS_LABEL, StatusSelect } from "@/components/opportunity-bits"
import { Button } from "@/components/ui/button"
import { formatDate, type OpportunityRow, type Status } from "@/lib/opps"

const STAGES: Status[] = ["mới", "quan tâm", "đang làm hồ sơ", "đã nộp", "đã tham gia"]

function PipelineCard({ row, stage, onOpen, onStatusChange }: {
  row: OpportunityRow
  stage: Status
  onOpen: (id: string) => void
  onStatusChange: (id: string, status: Status) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: row.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform) }}
      className={"space-y-3 rounded-lg border bg-card p-3 shadow-xs transition-shadow hover:shadow-sm " + (isDragging ? "relative z-20 opacity-60" : "")}>
      <div className="flex items-start gap-2">
        <button type="button" className="min-w-0 flex-1 text-left text-sm font-medium leading-5 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          onClick={() => onOpen(row.id)}>{row.title}</button>
        <button type="button" {...attributes} {...listeners}
          className="shrink-0 cursor-grab rounded-md p-1 text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          aria-label={"Kéo cơ hội: " + row.title}><GripVerticalIcon className="size-4" /></button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <DeadlineBadge row={row} />
        {row.project[0] && <span className="truncate text-xs text-muted-foreground">{row.project[0]}</span>}
      </div>
      <div className="text-xs text-muted-foreground">
        {row.deadline_iso ? formatDate(row.deadline_iso) : row.state === "rolling" ? "Nhận liên tục" : row.label}
      </div>
      <StatusSelect id={"stage-" + row.id} value={stage} onChange={(next) => onStatusChange(row.id, next)} className="w-full" />
    </div>
  )
}

function PipelineLane({ stage, rows, statusOf, onOpen, onStatusChange }: {
  stage: Status
  rows: OpportunityRow[]
  statusOf: (row: OpportunityRow) => Status
  onOpen: (id: string) => void
  onStatusChange: (id: string, status: Status) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "stage:" + stage })
  const visible = rows.slice(0, 24)
  return (
    <section ref={setNodeRef} aria-label={STATUS_LABEL[stage]}
      className={"flex min-h-[420px] w-[276px] min-w-[276px] flex-col gap-3 rounded-xl border p-3 transition-colors " +
        (isOver ? "border-primary bg-primary/5" : "bg-muted/35")}>
      <div className="flex items-center justify-between gap-2 pb-1">
        <h3 className="text-sm font-semibold">{STATUS_LABEL[stage]}</h3>
        <span className="rounded-md bg-background px-2 py-1 text-xs font-medium tabular-nums">{rows.length}</span>
      </div>
      {visible.map((row) => (
        <PipelineCard key={row.id} row={row} stage={statusOf(row)} onOpen={onOpen} onStatusChange={onStatusChange} />
      ))}
      {rows.length > visible.length && (
        <p className="px-2 py-1 text-xs text-muted-foreground">
          +{rows.length - visible.length} cơ hội khác. Dùng Khám phá để xem đầy đủ.
        </p>
      )}
      {!rows.length && (
        <p className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">
          Kéo một cơ hội vào đây để cập nhật trạng thái.
        </p>
      )}
    </section>
  )
}

export function WorkflowBoard({ rows, statusOf, onOpen, onStatusChange }: {
  rows: OpportunityRow[]
  statusOf: (row: OpportunityRow) => Status
  onOpen: (id: string) => void
  onStatusChange: (id: string, status: Status) => void
}) {
  const onDragEnd = (event: DragEndEvent) => {
    const target = String(event.over?.id || "")
    if (!target.startsWith("stage:")) return
    const next = target.slice(6) as Status
    if (!STAGES.includes(next)) return
    const id = String(event.active.id)
    const row = rows.find((item) => item.id === id)
    if (row && statusOf(row) !== next) onStatusChange(id, next)
  }
  const groups = STAGES.map((stage) => ({
    stage, items: rows.filter((row) => statusOf(row) === stage).sort((a, b) => a.rank - b.rank),
  }))
  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold"><KanbanSquareIcon className="size-4" /> Tiến độ hồ sơ</h3>
          <p className="mt-1 text-sm text-muted-foreground">Kéo thẻ giữa các cột hoặc chọn trạng thái. Thay đổi lưu trên trình duyệt.</p>
        </div>
        <Button variant="outline" size="sm" asChild><a href="#explore">Tìm thêm cơ hội</a></Button>
      </div>
      <DndContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {groups.map(({ stage, items }) => (
            <PipelineLane key={stage} stage={stage} rows={items} statusOf={statusOf}
              onOpen={onOpen} onStatusChange={onStatusChange} />
          ))}
        </div>
      </DndContext>
      <p className="text-xs text-muted-foreground">Các mục "Bỏ qua" được ẩn khỏi pipeline; vẫn tìm được trong phạm vi "Tất cả" của bảng khám phá.</p>
    </div>
  )
}
