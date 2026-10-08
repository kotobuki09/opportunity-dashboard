import * as React from "react"
import type { Opportunity, Status } from "@/lib/opps"
import { STATUSES } from "@/lib/opps"

/** Same key + shape as the earlier static dashboard, so old exports still import. */
const KEY = "oppScout.v1"
type Entry = { status?: Status; note?: string; updated?: string }
type Store = { items: Record<string, Entry>; [k: string]: unknown }

function load(): Store {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "{}")
    return { ...s, items: s.items || {} }
  } catch {
    return { items: {} }
  }
}

export function useLocalState(items: Opportunity[]) {
  const [store, setStore] = React.useState<Store>(load)
  React.useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(store)) } catch { /* storage blocked */ }
  }, [store])

  const statusOf = React.useCallback((it: Opportunity): Status => store.items[it.id]?.status || it.status || "mới", [store])
  const noteOf = React.useCallback((it: Opportunity) => store.items[it.id]?.note || "", [store])
  const patch = React.useCallback((id: string, e: Entry) => {
    setStore((s) => ({ ...s, items: { ...s.items, [id]: { ...s.items[id], ...e, updated: new Date().toISOString() } } }))
  }, [])

  const exportJson = React.useCallback(() => {
    const out = { app: "opportunity-scout", version: 1, exported_at: new Date().toISOString(), items: {} as Record<string, unknown> }
    for (const [id, v] of Object.entries(store.items)) {
      if (!v.status && !v.note) continue
      const it = items.find((x) => x.id === id)
      out.items[id] = { title: it?.title, url: it?.url, ...v }
    }
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }))
    a.download = `opportunity-state-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a); a.click(); a.remove()
    return Object.keys(out.items).length
  }, [store, items])

  const storeRef = React.useRef(store)
  React.useEffect(() => { storeRef.current = store }, [store])
  const importJson = React.useCallback(async (file: File) => {
    const src = (JSON.parse(await file.text()) || {}).items || {}
    const next = { ...storeRef.current.items }
    let n = 0
    for (const [id, v] of Object.entries<Entry & { url?: string }>(src)) {
      let key = id
      if (!items.some((x) => x.id === key) && v.url) key = items.find((x) => x.url === v.url)?.id ?? key
      const cur = next[key] || {}
      if (cur.updated && v.updated && v.updated < cur.updated) continue
      next[key] = {
        status: STATUSES.includes(v.status as Status) ? v.status : cur.status,
        note: typeof v.note === "string" ? v.note : cur.note,
        updated: v.updated || new Date().toISOString(),
      }
      n++
    }
    setStore((s) => ({ ...s, items: next }))
    return n
  }, [items])

  return { statusOf, noteOf, patch, exportJson, importJson }
}
