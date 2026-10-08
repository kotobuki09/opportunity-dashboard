import * as React from "react"
import {
  columnVisibilityFeature,
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  FlexRender,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnVisibilityState,
  type SortingState,
} from "@tanstack/react-table"
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Columns3Icon,
  EllipsisVerticalIcon,
  ExternalLinkIcon,
  SearchIcon,
  SearchXIcon,
  XIcon,
} from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import type { LocalApi } from "@/lib/local-state"
import { DataTableFacetedFilter } from "@/components/data-table-faceted-filter"
import { DeadlineBadge, STATUS_LABEL, StatusSelect } from "@/components/opportunity-bits"
import { OpportunityDrawer } from "@/components/opportunity-drawer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CATEGORIES,
  categoryColor,
  formatDate,
  formatDay,
  hasValue,
  inWindow,
  isExpired,
  isAccepting,
  money,
  PROJECTS,
  STATUSES,
  stripVi,
  TRACKING,
  WINDOWS,
  type OpportunityRow,
  type Status,
} from "@/lib/opps"

const features = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
})

const columnHelper = createColumnHelper<typeof features, OpportunityRow>()

const COLUMN_LABEL: Record<string, string> = {
  category: "Loại",
  project: "Dự án",
  deadline: "Hạn nộp",
  value: "Giá trị",
  status: "Trạng thái",
  first_seen: "Phát hiện",
}

type Facet = "cat" | "proj" | "win" | "status"
type Scope = "open" | "tracking" | "upcoming" | "expired" | "all"
const SCOPES: { value: Scope; label: string }[] = [
  { value: "open", label: "Đang mở" },
  { value: "tracking", label: "Đang theo đuổi" },
  { value: "upcoming", label: "Sắp mở" },
  { value: "expired", label: "Đã hết hạn" },
  { value: "all", label: "Tất cả" },
]

function useMediaQuery(query: string) {
  return React.useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", cb)
      return () => mql.removeEventListener("change", cb)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}

function SortButton({ label, sorted, onClick, align = "start" }: {
  label: string
  sorted: false | "asc" | "desc"
  onClick: ((e: unknown) => void) | undefined
  align?: "start" | "end"
}) {
  return (
    <div className={align === "end" ? "flex justify-end" : undefined}>
      <Button variant="ghost" size="sm" className="-mx-2" onClick={onClick}>
        {label}
        {sorted === "asc" ? (
          <ArrowUpIcon data-icon="inline-end" />
        ) : sorted === "desc" ? (
          <ArrowDownIcon data-icon="inline-end" />
        ) : (
          <ArrowUpDownIcon data-icon="inline-end" />
        )}
      </Button>
    </div>
  )
}

const stop = { onClick: (e: React.SyntheticEvent) => e.stopPropagation(), onKeyDown: (e: React.SyntheticEvent) => e.stopPropagation() }

export function DataTable({
  rows,
  showCategory,
  local,
  defaultScope = "open",
}: {
  rows: OpportunityRow[]
  showCategory: boolean
  local: LocalApi
  defaultScope?: Scope
}) {
  const isMobile = useIsMobile()
  const isWide = useMediaQuery("(min-width: 1536px)")
  const { statusOf, noteOf, patch } = local
  const [scope, setScope] = React.useState<Scope>(defaultScope)
  const [query, setQuery] = React.useState("")
  const [pickedCats, setCats] = React.useState<Set<string>>(new Set())
  const cats = React.useMemo(() => (showCategory ? pickedCats : new Set<string>()), [showCategory, pickedCats])
  const [windows, setWindows] = React.useState<Set<string>>(new Set())
  const [statuses, setStatuses] = React.useState<Set<string>>(new Set())
  const [projects, setProjects] = React.useState<Set<string>>(new Set())
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "deadline", desc: false }])
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({})
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 20 })
  const [selectedId, setSelectedId] = React.useState<string | null>(null)


  const inScope = React.useCallback(
    (r: OpportunityRow, s: Scope) =>
      s === "all" ? true
        : s === "upcoming" ? r.state === "opens_later"
        : s === "expired" ? isExpired(r)
        : s === "tracking" ? TRACKING.includes(statusOf(r)) && !isExpired(r)
        : isAccepting(r) && statusOf(r) !== "đã tham gia" && statusOf(r) !== "bỏ qua",
    [statusOf]
  )
  const matches = React.useCallback(
    (r: OpportunityRow, skip?: Facet) => {
      if (skip !== "cat" && cats.size && !cats.has(r.category)) return false
      if (skip !== "proj" && projects.size && !r.project.some((p) => projects.has(p))) return false
      if (skip !== "win" && windows.size && ![...windows].some((w) => inWindow(r, w))) return false
      const st = statusOf(r)
      if (skip !== "status") {
        if (statuses.size && !statuses.has(st)) return false
        if (!statuses.size && scope === "open" && st === "bỏ qua") return false
      }
      if (query) {
        const hay = stripVi([r.title, r.category, ...r.project, r.stage_req, r.fit_note, r.eligibility_note, r.value_text, r.deadline, noteOf(r), st].join(" "))
        if (!stripVi(query).split(/\s+/).filter(Boolean).every((w) => hay.includes(w))) return false
      }
      return true
    },
    [cats, projects, windows, statuses, query, scope, statusOf, noteOf]
  )

  const scoped = React.useMemo(() => rows.filter((r) => inScope(r, scope)), [rows, scope, inScope])
  const data = React.useMemo(() => scoped.filter((r) => matches(r)), [scoped, matches])
  const scopeCounts = React.useMemo(
    () => Object.fromEntries(SCOPES.map((s) => [s.value, rows.filter((r) => inScope(r, s.value)).length])) as Record<Scope, number>,
    [rows, inScope]
  )
  const facet = (skip: Facet, test: (r: OpportunityRow) => boolean) =>
    scoped.filter((r) => matches(r, skip) && test(r)).length
  const filtersActive = query !== "" || cats.size > 0 || projects.size > 0 || windows.size > 0 || statuses.size > 0
  const resetFilters = () => {
    setQuery("")
    setCats(new Set())
    setProjects(new Set())
    setWindows(new Set())
    setStatuses(new Set())
  }

  const columns = React.useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("title", {
          header: "Cơ hội",
          enableHiding: false,
          enableSorting: false,
          cell: ({ row }) => (
            <div className="flex max-w-[16rem] flex-col gap-0.5 xl:max-w-[20rem] 2xl:max-w-[30rem]">
              <span className="truncate font-medium">{row.original.title}</span>
              <span className="truncate text-xs text-muted-foreground">
                {row.original.fit_note || row.original.eligibility_note || row.original.url.replace(/^https?:\/\//, "")}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {row.original.verified_at ? `Xác minh ${formatDay(row.original.verified_at)}` : "Chưa ghi nhận xác minh"}
              </span>
            </div>
          ),
        }),
        columnHelper.accessor("category", {
          header: "Loại",
          enableSorting: false,
          cell: ({ row }) => (
            <Badge variant="outline" className="px-1.5 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: categoryColor(row.original.category) }} aria-hidden />
              {row.original.category}
            </Badge>
          ),
        }),
        columnHelper.accessor((r) => r.project.join(", "), {
          id: "project",
          header: "Dự án",
          enableSorting: false,
          cell: ({ row }) =>
            row.original.project.length ? (
              <div className="flex max-w-40 flex-wrap gap-1">
                {row.original.project.map((p) => (
                  <Badge key={p} variant="secondary" className="px-1.5">{p}</Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
        }),
        columnHelper.accessor((r) => r.rank, {
          id: "deadline",
          sortDescFirst: false,
          header: ({ column }) => (
            <SortButton label="Hạn nộp" sorted={column.getIsSorted()} onClick={column.getToggleSortingHandler()} />
          ),
          cell: ({ row }) => (
            <div className="flex flex-col items-start gap-1">
              <DeadlineBadge row={row.original} />
              <span className="text-xs text-muted-foreground tabular-nums">
                {row.original.deadline_iso
                  ? formatDate(row.original.deadline_iso)
                  : row.original.opens_iso
                    ? `Mở ${formatDay(row.original.opens_iso)}`
                    : "Không có hạn cố định"}
              </span>
            </div>
          ),
        }),
        columnHelper.accessor((r) => r.value_rank_usd ?? -1, {
          id: "value",
          sortDescFirst: true,
          header: ({ column }) => (
            <SortButton label="Giá trị" align="end" sorted={column.getIsSorted()} onClick={column.getToggleSortingHandler()} />
          ),
          cell: ({ row }) => (
            <div className="ml-auto w-44 text-right whitespace-normal 2xl:w-56">
              {hasValue(row.original) ? (
                <span className="line-clamp-2">
                  {row.original.value_text}
                  {row.original.value_rank_approx && row.original.value_rank_usd != null && (
                    <span className="text-muted-foreground"> ≈ {money(row.original.value_rank_usd, "USD")}</span>
                  )}
                </span>
              ) : (
                <span className="text-muted-foreground">không rõ</span>
              )}
            </div>
          ),
        }),
        columnHelper.accessor((r) => STATUSES.indexOf(statusOf(r)), {
          id: "status",
          header: ({ column }) => (
            <SortButton label="Trạng thái" sorted={column.getIsSorted()} onClick={column.getToggleSortingHandler()} />
          ),
          cell: ({ row }) => (
            <div {...stop}>
              <Label htmlFor={`${row.original.id}-status`} className="sr-only">Trạng thái</Label>
              <StatusSelect
                id={`${row.original.id}-status`}
                value={statusOf(row.original)}
                onChange={(s) => patch(row.original.id, { status: s })}
                className="w-36"
              />
            </div>
          ),
        }),
        columnHelper.accessor((r) => r.first_seen, {
          id: "first_seen",
          sortDescFirst: true,
          header: ({ column }) => (
            <SortButton label="Phát hiện" sorted={column.getIsSorted()} onClick={column.getToggleSortingHandler()} />
          ),
          cell: ({ row }) => (
            <span className="text-muted-foreground tabular-nums">
              {row.original.first_seen ? formatDay(row.original.first_seen) : "—"}
            </span>
          ),
        }),
        columnHelper.display({
          id: "actions",
          cell: ({ row }) => (
            <div {...stop}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex size-8 text-muted-foreground data-[state=open]:bg-muted" size="icon">
                    <EllipsisVerticalIcon />
                    <span className="sr-only">Mở menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => setSelectedId(row.original.id)}>Xem chi tiết</DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href={row.original.url} target="_blank" rel="noopener noreferrer">
                        Trang chính thức
                        <ExternalLinkIcon className="ml-auto" />
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => patch(row.original.id, { status: "quan tâm" })}>Đánh dấu quan tâm</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => patch(row.original.id, { status: "bỏ qua" })}>
                      Bỏ qua
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ),
        }),
      ]),
    [statusOf, patch]
  )

  const table = useTable({
    features,
    data,
    columns,
    state: {
      sorting,
      columnVisibility: {
        ...(isMobile ? { category: false, project: false, value: false, first_seen: false } : isWide ? {} : { first_seen: false }),
        ...columnVisibility,
        ...(showCategory ? {} : { category: false }),
      },
      pagination: pagination.pageIndex * pagination.pageSize < data.length ? pagination : { ...pagination, pageIndex: 0 },
    },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  })

  const selected = rows.find((r) => r.id === selectedId) ?? null
  const visibleColumnCount = table.getVisibleLeafColumns().length

  return (
    <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)} className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between gap-2 px-4 lg:px-6">
        <Label htmlFor="view-selector" className="sr-only">
          Phạm vi
        </Label>
        <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
          <SelectTrigger className="flex w-fit @4xl/main:hidden" size="sm" id="view-selector">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {SCOPES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label} ({scopeCounts[s.value]})
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <TabsList className="hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1 @4xl/main:flex">
          {SCOPES.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>
              {s.label} <Badge variant="secondary">{scopeCounts[s.value]}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns3Icon data-icon="inline-start" />
              <span className="hidden lg:inline">Tuỳ chỉnh cột</span>
              <span className="lg:hidden">Cột</span>
              <ChevronDownIcon data-icon="inline-end" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuGroup>
              {table
                .getAllColumns()
                .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
                .filter((column) => showCategory || column.id !== "category")
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {COLUMN_LABEL[column.id] ?? column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" />
            <Input
              placeholder="Tìm tên, chương trình, ghi chú…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 w-full pl-9"
              aria-label="Tìm cơ hội"
            />
          </div>
          {showCategory && (
            <DataTableFacetedFilter
              title="Loại"
              selected={cats}
              onChange={setCats}
              options={CATEGORIES.map((c) => ({ value: c, label: c, count: facet("cat", (r) => r.category === c) }))}
            />
          )}
          {PROJECTS.length > 0 && (
            <DataTableFacetedFilter
              title="Dự án"
              selected={projects}
              onChange={setProjects}
              options={PROJECTS.map((p) => ({ value: p, label: p, count: facet("proj", (r) => r.project.includes(p)) }))}
            />
          )}
          <DataTableFacetedFilter
            title="Hạn nộp"
            selected={windows}
            onChange={setWindows}
            options={WINDOWS.map((w) => ({ value: w.value, label: w.label, count: facet("win", (r) => inWindow(r, w.value)) }))}
          />
          <DataTableFacetedFilter
            title="Trạng thái"
            selected={statuses}
            onChange={setStatuses}
            options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s], count: facet("status", (r) => statusOf(r) === s) }))}
          />
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Xoá lọc
              <XIcon data-icon="inline-end" />
            </Button>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{data.length} cơ hội khớp · {scopeCounts[scope]} trong phạm vi</span>
          <span>{filtersActive ? "Đang áp dụng bộ lọc" : "Chọn bộ lọc để thu hẹp kết quả"}</span>
        </div>
        {isMobile ? (
          <div className="space-y-3">
            {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
              <button type="button" key={row.id} onClick={() => setSelectedId(row.original.id)}
                className="block w-full space-y-2 rounded-xl border bg-card p-4 text-left shadow-xs focus-visible:outline-2 focus-visible:outline-ring">
                <span className="block text-sm font-semibold leading-5">{row.original.title}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <DeadlineBadge row={row.original} />
                  {row.original.project[0] && <Badge variant="secondary">{row.original.project[0]}</Badge>}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {row.original.deadline_iso ? formatDate(row.original.deadline_iso) : row.original.deadline}
                  {" · " + STATUS_LABEL[statusOf(row.original)]}
                </span>
                <span className="block line-clamp-2 text-xs text-muted-foreground">
                  {row.original.fit_note || row.original.eligibility_note || row.original.value_text}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {row.original.verified_at ? "Kiểm tra " + formatDay(row.original.verified_at) : "Chưa ghi nhận xác minh"}
                </span>
              </button>
            )) : <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Không tìm thấy cơ hội. Hãy thử điều chỉnh phạm vi hoặc bộ lọc.
            </div>}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder ? null : <FlexRender header={header} />}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    tabIndex={0}
                    className="cursor-pointer"
                    data-state={row.original.id === selectedId ? "selected" : undefined}
                    onClick={() => setSelectedId(row.original.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setSelectedId(row.original.id)
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        <FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={visibleColumnCount} className="p-0">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <SearchXIcon />
                        </EmptyMedia>
                        <EmptyTitle>Không có cơ hội nào khớp</EmptyTitle>
                        <EmptyDescription>Thử bỏ bớt bộ lọc, đổi từ khoá hoặc chọn phạm vi khác.</EmptyDescription>
                      </EmptyHeader>
                      {filtersActive && (
                        <EmptyContent>
                          <Button variant="outline" size="sm" onClick={resetFilters}>Xoá bộ lọc</Button>
                        </EmptyContent>
                      )}
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
          </div>
        )}
        <div className="flex items-center justify-between px-4">
          <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
            {data.length} / {scoped.length} cơ hội khớp bộ lọc
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Số dòng mỗi trang
              </Label>
              <Select value={`${table.state.pagination.pageSize}`} onValueChange={(value) => table.setPageSize(Number(value))}>
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue placeholder={table.state.pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectGroup>
                    {[10, 20, 30, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Trang {table.state.pagination.pageIndex + 1} / {Math.max(table.getPageCount(), 1)}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button variant="outline" className="hidden size-8 p-0 lg:flex" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                <span className="sr-only">Trang đầu</span>
                <ChevronsLeftIcon />
              </Button>
              <Button variant="outline" className="size-8" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                <span className="sr-only">Trang trước</span>
                <ChevronLeftIcon />
              </Button>
              <Button variant="outline" className="size-8" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                <span className="sr-only">Trang sau</span>
                <ChevronRightIcon />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Trang cuối</span>
                <ChevronsRightIcon />
              </Button>
            </div>
          </div>
        </div>
      </div>
      <OpportunityDrawer
        item={selected}
        onOpenChange={(open) => !open && setSelectedId(null)}
        status={selected ? statusOf(selected) : "mới"}
        note={selected ? noteOf(selected) : ""}
        onStatusChange={(s) => selected && patch(selected.id, { status: s })}
        onNoteChange={(n) => selected && patch(selected.id, { note: n })}
        entry={selected ? local.entryOf(selected) : {}}
        onNextActionChange={(value) => selected && patch(selected.id, { nextAction: value })}
        onAddTask={(value) => selected && local.addTask(selected.id, value)}
        onToggleTask={(taskId) => selected && local.toggleTask(selected.id, taskId)}
        onRemoveTask={(taskId) => selected && local.removeTask(selected.id, taskId)}
      />
    </Tabs>
  )
}
