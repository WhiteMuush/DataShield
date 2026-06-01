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
  const [containerW, setContainerW] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      setContainerW(entries[0].contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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

  const [draggingId, setDraggingId] = useState<string | null>(null)
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

  const onLayoutChange = (current: RglItem[]) => {
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

  return (
    <DashboardEditContext.Provider value={editing}>
      <DashboardConfigContext.Provider value={{ getTitle, setTitle, editing }}>
        <div className="flex h-full flex-col">

          {/* ── Toolbar ────────────────────────────────────────────────── */}
          <div className="flex shrink-0 items-center justify-end gap-2 border-b border-border px-6 py-3">
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

          {/* ── Widget visibility panel (edit mode only) ───────────────── */}
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

          {/* ── Scrollable grid ─────────────────────────────────────────── */}
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
