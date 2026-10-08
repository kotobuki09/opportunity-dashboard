import { ExternalLinkIcon } from "lucide-react"

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
import { formatDate, formatDay, hasValue, money, type OpportunityRow, type Status } from "@/lib/opps"

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
  onStatusChange,
  onNoteChange,
}: {
  item: OpportunityRow | null
  onOpenChange: (open: boolean) => void
  status: Status
  note: string
  onStatusChange: (s: Status) => void
  onNoteChange: (note: string) => void
}) {
  const isMobile = useIsMobile()

  return (
    <Drawer direction={isMobile ? "bottom" : "right"} open={!!item} onOpenChange={onOpenChange}>
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
                  <dt className="text-muted-foreground">Giá trị</dt>
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
              </FieldGroup>
            </div>
            <DrawerFooter>
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
