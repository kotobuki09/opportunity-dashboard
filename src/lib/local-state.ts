import * as React from "react"
import type { Opportunity, Status } from "@/lib/opps"
import { STATUSES } from "@/lib/opps"
import type { ReviewPhase } from "@/lib/editorial-progress"

/** Personal workspace data stays in this browser unless explicitly exported. */
const KEY = "oppScout.v1"
export type ChecklistTask = { id: string; text: string; done: boolean }
export type PersonalEntry = {
  status?: Status
  note?: string
  nextAction?: string
  /** Personal editorial workflow only; never source verification. */
  reviewPhase?: ReviewPhase
  reviewStamp?: string
  tasks?: ChecklistTask[]
  updated?: string
}
type Store = { items: Record<string, PersonalEntry> }
export type LocalApi = ReturnType<typeof useLocalState>
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value)

function cleanEntry(value: unknown): PersonalEntry {
  if (!isRecord(value)) return {}
  const out: PersonalEntry = {}
  if (typeof value.status === "string" && STATUSES.includes(value.status as Status)) out.status = value.status as Status
  if (typeof value.note === "string") out.note = value.note.slice(0, 10000)
  if (typeof value.nextAction === "string") out.nextAction = value.nextAction.slice(0, 500)
  if (["not_started", "checking", "waiting_source", "proposal_ready"].includes(String(value.reviewPhase))) out.reviewPhase = value.reviewPhase as ReviewPhase
  if (typeof value.reviewStamp === "string" && /^[a-f0-9]{8}$/.test(value.reviewStamp)) out.reviewStamp = value.reviewStamp
  if (Array.isArray(value.tasks)) {
    out.tasks = value.tasks.slice(0, 30).filter(isRecord).map((task, i) => ({
      id: typeof task.id === "string" ? task.id.slice(0, 60) : String(i),
      text: typeof task.text === "string" ? task.text.slice(0, 200) : "",
      done: task.done === true,
    })).filter((task) => task.text.length > 0)
  }
  if (typeof value.updated === "string" && Number.isFinite(Date.parse(value.updated))) out.updated = value.updated
  return out
}

function load(): Store {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) || "{}")
    if (!isRecord(parsed) || !isRecord(parsed.items)) return { items: {} }
    return { items: Object.fromEntries(Object.entries(parsed.items).map(([id, entry]) => [id, cleanEntry(entry)])) }
  } catch {
    return { items: {} }
  }
}

export function useLocalState(items: Opportunity[]) {
  const [store, setStore] = React.useState<Store>(load)
  React.useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(store)) } catch { /* localStorage can be disabled */ }
  }, [store])
  React.useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === KEY && event.storageArea === localStorage) setStore(load()) }
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [])

  const entryOf = React.useCallback((it: Opportunity): PersonalEntry => store.items[it.id] || {}, [store])
  const statusOf = React.useCallback((it: Opportunity): Status =>
    store.items[it.id]?.status || it.status || "mới", [store])
  const noteOf = React.useCallback((it: Opportunity): string => store.items[it.id]?.note || "", [store])
  const patch = React.useCallback((id: string, entry: Partial<PersonalEntry>) => {
    setStore((previous) => ({
      items: {
        ...previous.items,
        [id]: { ...previous.items[id], ...entry, updated: new Date().toISOString() },
      },
    }))
  }, [])
  const addTask = React.useCallback((id: string, text: string) => {
    const value = text.trim().slice(0, 200)
    if (!value) return
    setStore((previous) => {
      const old = previous.items[id] || {}
      const tasks = old.tasks || []
      if (tasks.length >= 30) return previous
      const task = { id: Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8), text: value, done: false }
      return { items: { ...previous.items, [id]: { ...old, tasks: [...tasks, task], updated: new Date().toISOString() } } }
    })
  }, [])
  const toggleTask = React.useCallback((id: string, taskId: string) => {
    setStore((previous) => {
      const old = previous.items[id] || {}
      return { items: {
        ...previous.items,
        [id]: { ...old, tasks: (old.tasks || []).map((task) => task.id === taskId ? { ...task, done: !task.done } : task), updated: new Date().toISOString() },
      } }
    })
  }, [])
  const removeTask = React.useCallback((id: string, taskId: string) => {
    setStore((previous) => {
      const old = previous.items[id] || {}
      return { items: {
        ...previous.items,
        [id]: { ...old, tasks: (old.tasks || []).filter((task) => task.id !== taskId), updated: new Date().toISOString() },
      } }
    })
  }, [])

  /** Reset one opportunity without disturbing other statuses or personal notes. */
  const clearEntry = React.useCallback((id: string) => {
    setStore((previous) => {
      const next = { ...previous.items }
      delete next[id]
      return { items: next }
    })
  }, [])

  const exportJson = React.useCallback(() => {
    const output = { app: "opportunity-scout", version: 2, exported_at: new Date().toISOString(), items: {} as Record<string, unknown> }
    const byId = new Map(items.map((item) => [item.id, item]))
    for (const [id, entry] of Object.entries(store.items)) {
      const item = byId.get(id)
      if (item && Object.keys(entry).some((key) => key !== "updated")) {
        output.items[id] = { title: item.title, url: item.url, ...entry }
      }
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(output, null, 2)], { type: "application/json" }))
    const link = document.createElement("a")
    link.href = url
    link.download = "opportunity-state-" + new Date().toISOString().slice(0, 10) + ".json"
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    return Object.keys(output.items).length
  }, [items, store])

  const importJson = React.useCallback(async (file: File) => {
    if (file.size > 2_000_000) throw new Error("File quá lớn")
    const parsed: unknown = JSON.parse(await file.text())
    if (!isRecord(parsed) || !isRecord(parsed.items) ||
      (parsed.app !== undefined && parsed.app !== "opportunity-scout") ||
      (parsed.version !== undefined && parsed.version !== 1 && parsed.version !== 2)) {
      throw new Error("Định dạng file không hợp lệ")
    }
    const byId = new Map(items.map((item) => [item.id, item]))
    const byUrl = new Map(items.map((item) => [item.url, item.id]))
    const imported: Record<string, PersonalEntry> = {}
    for (const [id, raw] of Object.entries(parsed.items)) {
      if (!isRecord(raw)) continue
      const key = byId.has(id) ? id : typeof raw.url === "string" ? byUrl.get(raw.url) : undefined
      if (!key) continue
      imported[key] = cleanEntry(raw)
    }
    setStore((previous) => {
      const next = { ...previous.items }
      for (const [key, value] of Object.entries(imported)) {
        const previousDate = next[key]?.updated || ""
        if (previousDate && value.updated && value.updated < previousDate) continue
        next[key] = { ...next[key], ...value, updated: value.updated || new Date().toISOString() }
      }
      return { items: next }
    })
    return Object.keys(imported).length
  }, [items])

  return { entryOf, statusOf, noteOf, patch, addTask, toggleTask, removeTask, clearEntry, exportJson, importJson }
}
