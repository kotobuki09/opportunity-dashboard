import * as React from "react"
import { toast } from "sonner"

import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { useLocalState } from "@/lib/local-state"
import { CATEGORIES, DATA, deriveRow, isAccepting, type OpportunityRow } from "@/lib/opps"

const VIEWS = ["overview", ...CATEGORIES]

function readView() {
  const h = decodeURIComponent(window.location.hash.slice(1))
  return VIEWS.includes(h) ? h : "overview"
}

export function App() {
  const [view, setView] = React.useState(readView)
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
  const rows = React.useMemo(() => DATA.items.map((it) => deriveRow(it, now)), [now])
  const viewRows = React.useMemo(
    () => (view === "overview" ? rows : rows.filter((r) => r.category === view)),
    [rows, view]
  )
  const counts = React.useMemo(() => {
    const open = rows.filter((r) => isAccepting(r) && local.statusOf(r) !== "đã tham gia" && local.statusOf(r) !== "bỏ qua")
    return Object.fromEntries([["overview", open.length], ...CATEGORIES.map((c) => [c, open.filter((r) => r.category === c).length])])
  }, [rows, local.statusOf])

  React.useEffect(() => {
    const onHash = () => setView(readView())
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])
  const changeView = (v: string) => {
    setView(v)
    history.replaceState(null, "", v === "overview" ? window.location.pathname : `#${encodeURIComponent(v)}`)
    window.scrollTo({ top: 0 })
  }
  const statusOf = local.statusOf as (r: OpportunityRow) => ReturnType<typeof local.statusOf>
  const builtAt = DATA.built_at.slice(11) + " " + DATA.built_at.slice(8, 10) + "/" + DATA.built_at.slice(5, 7)

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        view={view}
        onViewChange={changeView}
        categories={CATEGORIES}
        counts={counts}
        builtAt={builtAt}
        onExport={() => toast.success(`Đã xuất ${local.exportJson()} mục`)}
        onImport={() => fileRef.current?.click()}
      />
      <SidebarInset>
        <SiteHeader title={view === "overview" ? "Tổng quan" : view} builtAt={builtAt} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards rows={viewRows} statusOf={statusOf} />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive rows={viewRows} statusOf={statusOf} />
              </div>
              <DataTable rows={viewRows} showCategory={view === "overview"} local={local} />
            </div>
          </div>
        </div>
      </SidebarInset>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ""
          if (!f) return
          try {
            toast.success(`Đã nhập ${await local.importJson(f)} mục`)
          } catch {
            toast.error("File không hợp lệ")
          }
        }}
      />
      <Toaster />
    </SidebarProvider>
  )
}

export default App
