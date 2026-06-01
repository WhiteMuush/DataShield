"use client"

import { useState, useCallback, useEffect, useRef, type ReactNode } from "react"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ResponsiveGridLayout } = require("react-grid-layout")
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import { Settings2, Check, Pencil, Eye, EyeOff, Plus, Trash2, Building2, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DashboardEditContext } from "@/contexts/DashboardEditContext"
import { DashboardConfigContext } from "@/contexts/DashboardConfigContext"
import type { GridItemLayout, WidgetMeta, DashboardPreset } from "@/types/dashboard"

const COLS = 12

export type WidgetEntry = {
  instanceId: string
  type: string
  defaultTitle: string
  content: ReactNode
  defaultSize: { w: number; h: number }
  defaultPosition?: { x: number; y: number }
  minSize: { w: number; h: number }
  centerContent?: boolean
}

function buildDefaultLayout(widgets: WidgetEntry[]): GridItemLayout[] {
  let cursor = 0
  return widgets.map((w) => {
    const y = w.defaultPosition?.y ?? cursor
    const x = w.defaultPosition?.x ?? 0
    if (!w.defaultPosition) cursor += w.defaultSize.h
    return {
      i: w.instanceId,
      x,
      y,
      w: w.defaultSize.w,
      h: w.defaultSize.h,
      minW: w.minSize.w,
      minH: w.minSize.h,
    }
  })
}

function buildDefaultMeta(widgets: WidgetEntry[]): WidgetMeta[] {
  return widgets.map((w) => ({
    instanceId: w.instanceId,
    title: null,
    visible: true,
  }))
}

function mergeLayout(saved: GridItemLayout[], widgets: WidgetEntry[]): GridItemLayout[] {
  return widgets.map((w) => {
    const s = saved.find((l) => l.i === w.instanceId)
    if (s) {
      return {
        ...s,
        w: Math.max(s.w, w.minSize.w),
        h: Math.max(s.h, w.minSize.h),
        minW: w.minSize.w,
        minH: w.minSize.h,
      }
    }
    return {
      i: w.instanceId,
      x: 0,
      y: Infinity,
      w: w.defaultSize.w,
      h: w.defaultSize.h,
      minW: w.minSize.w,
      minH: w.minSize.h,
    }
  })
}

function mergeMeta(saved: WidgetMeta[], widgets: WidgetEntry[]): WidgetMeta[] {
  return widgets.map((w) => {
    const s = saved.find((m) => m.instanceId === w.instanceId)
    return s ?? { instanceId: w.instanceId, title: null, visible: true }
  })
}

function RenameOverlay({ title, onChange }: { title: string; onChange: (t: string) => void }) {
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renaming) {
      setDraft(title)
      setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 10)
    }
  }, [renaming, title])

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed) onChange(trimmed)
    setRenaming(false)
  }

  return (
    <div
      className="absolute top-2 left-2 z-20"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {renaming ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") setRenaming(false)
          }}
          className="h-6 w-40 rounded border border-primary bg-card px-2 text-xs font-medium text-foreground shadow focus:outline-none"
        />
      ) : (
        <button
          onClick={() => setRenaming(true)}
          className="flex items-center gap-1 rounded bg-background/80 px-1.5 py-0.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:text-foreground"
        >
          <Pencil className="size-3" />
          Rename
        </button>
      )}
    </div>
  )
}

function PresetTab({
  preset,
  active,
  canDelete,
  canRename,
  onClick,
  onRename,
  onDelete,
}: {
  preset: DashboardPreset
  active: boolean
  canDelete: boolean
  canRename: boolean
  onClick: () => void
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(preset.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renaming) {
      setDraft(preset.name)
      setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 10)
    }
  }, [renaming, preset.name])

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== preset.name) onRename(trimmed)
    setRenaming(false)
  }

  return (
    <div
      className={cn(
        "group flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors cursor-pointer select-none",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      onClick={onClick}
    >
      {preset.scope === "COMPANY" ? (
        <Building2 className="size-3 shrink-0 opacity-70" />
      ) : (
        <User className="size-3 shrink-0 opacity-60" />
      )}

      {renaming ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") setRenaming(false)
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-24 bg-transparent outline-none"
        />
      ) : (
        <span className="max-w-[120px] truncate">{preset.name}</span>
      )}

      {active && !renaming && (
        <div className="ml-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {canRename && (
            <button
              onClick={(e) => { e.stopPropagation(); setRenaming(true) }}
              className="rounded p-0.5 hover:bg-white/20"
            >
              <Pencil className="size-2.5" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="rounded p-0.5 hover:bg-white/20"
            >
              <Trash2 className="size-2.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function DashboardCanvas({
  widgets,
  presets: initialPresets,
  activePresetId: initialActivePresetId,
  userRole,
}: {
  widgets: WidgetEntry[]
  presets: DashboardPreset[]
  activePresetId: string | null
  userRole: string
}) {
  const [editing, setEditing] = useState(false)
  const [containerW, setContainerW] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const [presets, setPresets] = useState<DashboardPreset[]>(initialPresets)
  const [activePresetId, setActivePresetId] = useState<string | null>(initialActivePresetId)

  const activePreset = presets.find((p) => p.id === activePresetId) ?? presets[0] ?? null

  const initLayout = useCallback((preset: DashboardPreset | null) => {
    if (!preset || !preset.layout?.length) return buildDefaultLayout(widgets)
    return mergeLayout(preset.layout, widgets)
  }, [widgets])

  const initMeta = useCallback((preset: DashboardPreset | null) => {
    if (!preset || !preset.widgets?.length) return buildDefaultMeta(widgets)
    return mergeMeta(preset.widgets, widgets)
  }, [widgets])

  const [layout, setLayout] = useState<GridItemLayout[]>(() => initLayout(activePreset))
  const [meta, setMeta] = useState<WidgetMeta[]>(() => initMeta(activePreset))
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => setContainerW(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const persistPreset = useCallback((id: string, nextLayout: GridItemLayout[], nextMeta: WidgetMeta[]) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      fetch(`/api/dashboard/presets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout: nextLayout, widgets: nextMeta }),
      })
    }, 800)
  }, [])

  const switchPreset = useCallback((preset: DashboardPreset) => {
    setActivePresetId(preset.id)
    setLayout(initLayout(preset))
    setMeta(initMeta(preset))
    fetch(`/api/dashboard/presets/${preset.id}/activate`, { method: "PATCH" })
  }, [initLayout, initMeta])

  const createPreset = useCallback(async (scope: "PERSONAL" | "COMPANY") => {
    const name = scope === "COMPANY" ? "Company View" : `View ${presets.filter((p) => p.scope === "PERSONAL").length + 1}`
    const res = await fetch("/api/dashboard/presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, scope, layout: buildDefaultLayout(widgets), widgets: buildDefaultMeta(widgets) }),
    })
    if (!res.ok) return
    const created: DashboardPreset = await res.json()
    setPresets((prev) => [...prev, created])
    switchPreset(created)
  }, [presets, widgets, switchPreset])

  const renamePreset = useCallback(async (id: string, name: string) => {
    await fetch(`/api/dashboard/presets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    setPresets((prev) => prev.map((p) => p.id === id ? { ...p, name } : p))
  }, [])

  const deletePreset = useCallback(async (id: string) => {
    await fetch(`/api/dashboard/presets/${id}`, { method: "DELETE" })
    setPresets((prev) => {
      const next = prev.filter((p) => p.id !== id)
      if (activePresetId === id) {
        const fallback = next[0] ?? null
        setActivePresetId(fallback?.id ?? null)
        setLayout(initLayout(fallback))
        setMeta(initMeta(fallback))
      }
      return next
    })
  }, [activePresetId, initLayout, initMeta])

  const onLayoutChange = (current: RglItem[]) => {
    const next = current.map((item) => ({
      i: item.i, x: item.x, y: item.y, w: item.w, h: item.h, minW: item.minW, minH: item.minH,
    }))
    setLayout(next)
    if (activePreset) persistPreset(activePreset.id, next, meta)
  }

  const toggleVisible = (instanceId: string) => {
    const next = meta.map((m) => m.instanceId === instanceId ? { ...m, visible: !m.visible } : m)
    setMeta(next)
    if (activePreset) persistPreset(activePreset.id, layout, next)
  }

  const setTitle = useCallback((instanceId: string, title: string) => {
    const next = meta.map((m) => m.instanceId === instanceId ? { ...m, title } : m)
    setMeta(next)
    if (activePreset) persistPreset(activePreset.id, layout, next)
  }, [meta, layout, activePreset, persistPreset])

  const getTitle = useCallback((instanceId: string, defaultTitle: string) => {
    const m = meta.find((m) => m.instanceId === instanceId)
    return m?.title ?? defaultTitle
  }, [meta])

  const visibleWidgets = widgets.filter((w) => {
    const m = meta.find((m) => m.instanceId === w.instanceId)
    return editing || m?.visible !== false
  })

  const isAdmin = userRole === "ADMIN"
  const canEditPreset = activePreset
    ? activePreset.scope === "PERSONAL" || isAdmin
    : false

  return (
    <DashboardEditContext.Provider value={editing}>
      <DashboardConfigContext.Provider value={{ getTitle, setTitle, editing }}>
        <div className="flex h-full flex-col">

          {/* ── Toolbar ─────────────────────────────────────────────────── */}
          <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2">

            {/* Preset tabs */}
            <div className="flex flex-1 items-center gap-1.5 overflow-x-auto scrollbar-none">
              {presets.map((p) => (
                <PresetTab
                  key={p.id}
                  preset={p}
                  active={p.id === activePreset?.id}
                  canDelete={presets.length > 1 && (p.scope === "PERSONAL" || isAdmin)}
                  canRename={p.scope === "PERSONAL" || isAdmin}
                  onClick={() => switchPreset(p)}
                  onRename={(name) => renamePreset(p.id, name)}
                  onDelete={() => deletePreset(p.id)}
                />
              ))}

              {/* New preset button */}
              <div className="relative group/add">
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Add preset"
                >
                  <Plus className="size-3.5" />
                </button>
                <div className="absolute left-0 top-full z-50 mt-1 hidden min-w-[160px] rounded-md border border-border bg-popover shadow-md group-hover/add:block">
                  <button
                    onClick={() => createPreset("PERSONAL")}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted"
                  >
                    <User className="size-3.5" />
                    Personal preset
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => createPreset("COMPANY")}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted"
                    >
                      <Building2 className="size-3.5" />
                      Company preset
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right side */}
            <div className="flex shrink-0 items-center gap-2">
              {editing && (
                <p className="text-xs text-muted-foreground">
                  Drag · Resize · Rename
                </p>
              )}
              {editing ? (
                <Button size="sm" onClick={() => setEditing(false)} className="gap-1.5">
                  <Check className="size-3.5" />
                  Done
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  disabled={!canEditPreset}
                  className="gap-1.5"
                >
                  <Settings2 className="size-3.5" />
                  Customize
                </Button>
              )}
            </div>
          </div>

          {/* ── Widget visibility panel (edit mode only) ────────────────── */}
          {editing && (
            <div className="flex shrink-0 flex-wrap gap-2 border-b border-border bg-card px-6 py-3">
              <p className="w-full text-xs font-medium text-muted-foreground">Widget visibility</p>
              {widgets.map((w) => {
                const m = meta.find((m) => m.instanceId === w.instanceId)
                const visible = m?.visible !== false
                const title = getTitle(w.instanceId, w.defaultTitle)
                return (
                  <button
                    key={w.instanceId}
                    onClick={() => toggleVisible(w.instanceId)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      visible
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                    {title}
                  </button>
                )
              })}
            </div>
          )}

          {/* ── Scrollable grid ──────────────────────────────────────────── */}
          <div
            ref={containerRef}
            className={cn(
              "flex-1 overflow-y-auto overflow-x-hidden",
              editing
                ? "select-none [&_.react-grid-item]:cursor-grab [&_.react-grid-item:active]:cursor-grabbing"
                : "[&_.react-resizable-handle]:hidden [&_.react-grid-item]:cursor-auto"
            )}
            style={{
              backgroundImage: "radial-gradient(circle, oklch(var(--border)) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          >
            {containerW > 0 && (
              <ResponsiveGridLayout
                className="layout"
                width={containerW}
                breakpoints={{ lg: 0 }}
                cols={{ lg: COLS }}
                rowHeight={50}
                isDraggable={editing}
                isResizable={editing}
                compactType="vertical"
                preventCollision={false}
                onLayoutChange={onLayoutChange}
                onDragStart={(_l: unknown, item: RglItem) => setDraggingId(item.i)}
                onDragStop={() => setDraggingId(null)}
                margin={[16, 16]}
                containerPadding={[16, 16]}
                draggableCancel="button,input,a,select,textarea"
              >
                {visibleWidgets.map((w) => {
                  const item = layout.find((l) => l.i === w.instanceId) ?? {
                    i: w.instanceId,
                    x: 0,
                    y: Infinity,
                    w: w.defaultSize.w,
                    h: w.defaultSize.h,
                    minW: w.minSize.w,
                    minH: w.minSize.h,
                  }
                  const title = getTitle(w.instanceId, w.defaultTitle)
                  return (
                    <div
                      key={w.instanceId}
                      data-grid={item}
                      className={cn(
                        "relative h-full",
                        editing && "rounded-xl outline outline-2 outline-primary/30",
                        draggingId === w.instanceId && "drag-glow"
                      )}
                    >
                      {editing && (
                        <RenameOverlay
                          title={title}
                          onChange={(t) => setTitle(w.instanceId, t)}
                        />
                      )}
                      <div className={cn("h-full", w.centerContent && "flex items-center [&>*]:w-full")}>
                        {w.content}
                      </div>
                    </div>
                  )
                })}
              </ResponsiveGridLayout>
            )}
          </div>

        </div>
      </DashboardConfigContext.Provider>
    </DashboardEditContext.Provider>
  )
}

type RglItem = {
  i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number
}
