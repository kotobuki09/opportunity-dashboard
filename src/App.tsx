import * as React from "react"
import { toast } from "sonner"

import { AppSidebar } from "@/components/app-sidebar"
import { OpportunityDrawer } from "@/components/opportunity-drawer"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { qualityFor } from "@/lib/data-quality"
import { useLocalState } from "@/lib/local-state"
import { CATEGORIES, DATA, deriveRow, isAccepting, isDue, PROJECTS, TRACKING, type Status } from "@/lib/opps"

// Route-level code splitting keeps the initial dashboard responsive on mobile connections.
const WorkspaceHome = React.lazy(() => import("@/components/workspace-home").then((m) => ({ default: m.WorkspaceHome })))
const WorkflowBoard = React.lazy(() => import("@/components/workflow-board").then((m) => ({ default: m.WorkflowBoard })))
const DeadlineAgenda = React.lazy(() => import("@/components/deadline-agenda").then((m) => ({ default: m.DeadlineAgenda })))
const QualityReview = React.lazy(() => import("@/components/quality-review").then((m) => ({ default: m.QualityReview })))
const NzAcademicJobs = React.lazy(() => import("@/components/nz-academic-jobs").then((m) => ({ default: m.NzAcademicJobs })))
const DataTable = React.lazy(() => import("@/components/data-table").then((m) => ({ default: m.DataTable })))

const MAIN_VIEWS = ["overview", "explore", "academic-jobs", "board", "calendar", "shortlist", "quality"]
const VIEWS = [...MAIN_VIEWS, ...CATEGORIES]
const VIEW_LABELS: Record<string, string> = {
  overview: "Tổng quan", explore: "Khám phá cơ hội", board: "Pipeline hồ sơ",
  calendar: "Lịch hạn nộp", shortlist: "Đang theo đuổi", quality: "Kiểm tra dữ liệu", "academic-jobs": "Academic Jobs",
}
function readView() {
  try {
    const value = decodeURIComponent(window.location.hash.slice(1))
    // Preserve bookmarked links from before the tab was renamed.
    const normalized = value === "nz-jobs" ? "academic-jobs" : value
    return VIEWS.includes(normalized) ? normalized : "overview"
  } catch {
    return "overview"
  }
}

export function App() {
  const [view, setView] = React.useState(readView)
  const [project, setProject] = React.useState(() => {
    try {
      const saved = localStorage.getItem("oppScout.project.v1")
      return saved && PROJECTS.includes(saved) ? saved : "all"
    } catch { return "all" }
  })
  React.useEffect(() => {
    try { localStorage.setItem("oppScout.project.v1", project) } catch { /* optional browser preference */ }
  }, [project])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const local = useLocalState(DATA.items)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [now, setNow] = React.useState(() => new Date())
  React.useEffect(() => {
    const update = () => setNow(new Date())
    const timer = window.setInterval(update, 60_000)
    document.addEventListener("visibilitychange", update)
    window.addEventListener("focus", update)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", update)
      window.removeEventListener("focus", update)
    }
  }, [])
  const rows = React.useMemo(() => DATA.items.map((item) => deriveRow(item, now)), [now])
  const viewRows = React.useMemo(() => rows.filter((row) =>
    (MAIN_VIEWS.includes(view) || row.category === view) &&
    (project === "all" || row.project.includes(project))
  ), [rows, view, project])
  const counts = React.useMemo(() => {
    const open = rows.filter((row) =>
      (project === "all" || row.project.includes(project)) &&
      isAccepting(row) && !["bỏ qua", "đã tham gia"].includes(local.statusOf(row)))
    const tracking = open.filter((row) => TRACKING.includes(local.statusOf(row)))
    return Object.fromEntries([
      ["overview", open.length], ["tracking", tracking.length],
      ["quality", rows.filter((row) => (project === "all" || row.project.includes(project)) && qualityFor(row, now).findings.length > 0).length],
      ["due30", open.filter((row) => isDue(row, 30)).length],
      ...CATEGORIES.map((category) => [category, open.filter((row) => row.category === category).length]),
    ]) as Record<string, number>
  }, [rows, local, project, now])
  React.useEffect(() => {
    const onHash = () => setView(readView())
    window.addEventListener("hashchange", onHash)
    window.addEventListener("popstate", onHash)
    return () => {
      window.removeEventListener("hashchange", onHash)
      window.removeEventListener("popstate", onHash)
    }
  }, [])
  const changeView = (next: string) => {
    if (!VIEWS.includes(next) || next === view) return
    setView(next)
    history.pushState(null, "", next === "overview" ? window.location.pathname + window.location.search : "#" + encodeURIComponent(next))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const builtAt = DATA.built_at.slice(11) + " " + DATA.built_at.slice(8, 10) + "/" + DATA.built_at.slice(5, 7)
  const selected = rows.find((row) => row.id === selectedId) ?? null
  const updateStatus = (id: string, value: Status) => local.patch(id, { status: value })

  return (
    <SidebarProvider style={{
      "--sidebar-width": "calc(var(--spacing) * 70)",
      "--header-height": "calc(var(--spacing) * 14)",
    } as React.CSSProperties}>
      <AppSidebar
        variant="inset"
        view={view}
        onViewChange={changeView}
        categories={CATEGORIES}
        counts={counts}
        builtAt={builtAt}
        onExport={() => toast.success("Đã xuất " + local.exportJson() + " mục")}
        onImport={() => fileRef.current?.click()}
      />
      <SidebarInset>
        <SiteHeader title={VIEW_LABELS[view] || view} builtAt={builtAt} />
        <main className="@container/main flex flex-1 flex-col gap-5 pb-12">
          <div className="flex flex-col gap-3 px-4 pt-6 sm:flex-row sm:items-center sm:justify-between lg:px-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{VIEW_LABELS[view] || view}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{view === "academic-jobs" ? "PhD · Postdoc · Research Fellow · Lecturer — Telecommunications, AI và các hướng gần tại New Zealand." : "Ưu tiên những cơ hội phù hợp và chuẩn bị hồ sơ đúng hạn."}</p>
            </div>
            {view !== "academic-jobs" && <div className="flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground sm:inline">Dự án</span>
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger aria-label="Lọc toàn bộ dashboard theo dự án" className="w-full min-w-44 sm:w-56">
                  <SelectValue placeholder="Tất cả dự án" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả dự án</SelectItem>
                  {PROJECTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>}
          </div>
          {view !== "quality" && view !== "academic-jobs" && <SectionCards rows={viewRows} statusOf={local.statusOf} onNavigate={changeView} now={now} />}
          <React.Suspense fallback={<div role="status" className="mx-4 rounded-xl border bg-muted/30 p-8 text-sm text-muted-foreground lg:mx-6">Đang tải giao diện...</div>}>
          {view === "overview" ? (
            <WorkspaceHome rows={viewRows} statusOf={local.statusOf} project={project === "all" ? null : project}
              onOpen={setSelectedId} onNavigate={changeView} onStatusChange={updateStatus} now={now} />
          ) : view === "board" ? (
            <WorkflowBoard rows={viewRows} statusOf={local.statusOf} onOpen={setSelectedId} onStatusChange={updateStatus} />
          ) : view === "calendar" ? (
            <DeadlineAgenda rows={viewRows} statusOf={local.statusOf} onOpen={setSelectedId} />
          ) : view === "quality" ? (
            <QualityReview rows={viewRows} onOpen={setSelectedId} now={now} local={local} />
          ) : view === "academic-jobs" ? (
            <NzAcademicJobs now={now} />
          ) : (
            <DataTable key={view + ":" + project} rows={viewRows} showCategory={MAIN_VIEWS.includes(view)}
              defaultScope={view === "shortlist" ? "tracking" : "open"} local={local} />
          )}
          </React.Suspense>
        </main>
      </SidebarInset>
      <OpportunityDrawer
        item={selected}
        onOpenChange={(open) => { if (!open) setSelectedId(null) }}
        status={selected ? local.statusOf(selected) : "mới"}
        note={selected ? local.noteOf(selected) : ""}
        entry={selected ? local.entryOf(selected) : {}}
        onStatusChange={(value) => selected && local.patch(selected.id, { status: value })}
        onNoteChange={(value) => selected && local.patch(selected.id, { note: value })}
        onNextActionChange={(value) => selected && local.patch(selected.id, { nextAction: value })}
        onAddTask={(value) => selected && local.addTask(selected.id, value)}
        onToggleTask={(value) => selected && local.toggleTask(selected.id, value)}
        onRemoveTask={(value) => selected && local.removeTask(selected.id, value)}
        onClearPersonal={() => selected && local.clearEntry(selected.id)}
      />
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={async (event) => {
        const file = event.target.files?.[0]
        event.target.value = ""
        if (!file) return
        try { toast.success("Đã nhập " + await local.importJson(file) + " mục") }
        catch (error) { toast.error(error instanceof Error ? error.message : "File không hợp lệ") }
      }} />
      <Toaster />
    </SidebarProvider>
  )
}

export default App
