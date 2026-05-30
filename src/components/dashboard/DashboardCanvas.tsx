"use client"

import { useState, useCallback, useEffect, useRef, type ReactNode } from "react"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ResponsiveGridLayout } = require("react-grid-layout")
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import { Settings2, Check, Pencil, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DashboardEditContext } from "@/contexts/DashboardEditContext"
import { DashboardConfigContext } from "@/contexts/DashboardConfigContext"
import type { GridItemLayout, WidgetMeta, SavedDashboardConfig } from "@/types/dashboard"

export type WidgetEntry = {
  instanceId: string
  type: string
  defaultTitle: string
  content: ReactNode
  defaultSize: { w: number; h: number }
  defaultPosition?: { x: number; y: number }
  minSize: { w: number; h: number }
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
    return s ?? {
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

function RenameOverlay({
  title,
  onChange,
}: {
  title: string
  onChange: (t: string) => void
}) {
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

export function DashboardCanvas({
  widgets,
  initialConfig,
}: {
  widgets: WidgetEntry[]
  initialConfig: SavedDashboardConfig | null
}) {
  const [editing, setEditing] = useState(false)

  const [layout, setLayout] = useState<GridItemLayout[]>(() =>
    initialConfig?.layout
      ? mergeLayout(initialConfig.layout, widgets)
      : buildDefaultLayout(widgets)
  )

  const [meta, setMeta] = useState<WidgetMeta[]>(() =>
    initialConfig?.widgets
      ? mergeMeta(initialConfig.widgets, widgets)
      : buildDefaultMeta(widgets)
  )

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const persistConfig = useCallback((nextLayout: GridItemLayout[], nextMeta: WidgetMeta[]) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      fetch("/api/dashboard/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout: nextLayout, widgets: nextMeta } satisfies SavedDashboardConfig),
      })
    }, 800)
  }, [])

  const onLayoutChange = (current: ReactGridLayoutItem[]) => {
    const next = current.map((item) => ({
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: item.minW,
      minH: item.minH,
    }))
    setLayout(next)
    persistConfig(next, meta)
  }

  const toggleVisible = (instanceId: string) => {
    const next = meta.map((m) =>
      m.instanceId === instanceId ? { ...m, visible: !m.visible } : m
    )
    setMeta(next)
    persistConfig(layout, next)
  }

  const setTitle = useCallback(
    (instanceId: string, title: string) => {
      const next = meta.map((m) =>
        m.instanceId === instanceId ? { ...m, title } : m
      )
      setMeta(next)
      persistConfig(layout, next)
    },
    [meta, layout, persistConfig]
  )

  const getTitle = useCallback(
    (instanceId: string, defaultTitle: string) => {
      const m = meta.find((m) => m.instanceId === instanceId)
      return m?.title ?? defaultTitle
    },
    [meta]
  )

  const visibleWidgets = widgets.filter((w) => {
    const m = meta.find((m) => m.instanceId === w.instanceId)
    return editing || m?.visible !== false
  })

  const gridRef = useRef<HTMLDivElement>(null)
  const [gridWidth, setGridWidth] = useState(0)

  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    setGridWidth(el.clientWidth)
    const ro = new ResizeObserver(() => setGridWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <DashboardEditContext.Provider value={editing}>
      <DashboardConfigContext.Provider value={{ getTitle, setTitle, editing }}>
        <div>
          <div className="mb-4 flex items-center justify-end gap-2">
            {editing && (
              <p className="mr-auto text-xs text-muted-foreground">
                Drag to reorder · Resize from corners · Click a title to rename
              </p>
            )}
            {editing ? (
              <Button size="sm" onClick={() => setEditing(false)} className="gap-1.5">
                <Check className="size-3.5" />
                Done
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
                <Settings2 className="size-3.5" />
                Customize
              </Button>
            )}
          </div>

          {editing && (
            <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-border bg-card p-3">
              <p className="w-full text-xs font-medium text-muted-foreground mb-1">Widget visibility</p>
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

          <div ref={gridRef}>
          {gridWidth > 0 && <ResponsiveGridLayout
            className="layout"
            width={gridWidth}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
            cols={{ lg: 12, md: 12, sm: 6, xs: 4 }}
            rowHeight={80}
            isDraggable={editing}
            isResizable={editing}
            onLayoutChange={onLayoutChange}
            margin={[16, 16]}
            containerPadding={[0, 0]}
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
                    editing && "cursor-grab rounded-xl outline outline-2 outline-primary/30 active:cursor-grabbing"
                  )}
                >
                  {editing && (
                    <RenameOverlay
                      title={title}
                      onChange={(t) => setTitle(w.instanceId, t)}
                    />
                  )}
                  <div className="h-full">
                    {w.content}
                  </div>
                </div>
              )
            })}
          </ResponsiveGridLayout>}
          </div>
        </div>
      </DashboardConfigContext.Provider>
    </DashboardEditContext.Provider>
  )
}

// Internal type alias for react-grid-layout item
type ReactGridLayoutItem = {
  i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number
}
