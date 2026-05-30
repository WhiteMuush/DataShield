"use client"

import { useState } from "react"
import { Settings2, X, Plus, Check } from "lucide-react"
import { useWidgetConfig } from "@/hooks/useWidgetConfig"
import { cn } from "@/lib/utils"

type DataItem = { type: string; count: number; percentage: number }

interface DataTypeBreakdownProps {
  data: DataItem[]
}

type WidgetConfig = {
  trackedTypes: string[]
}

export function DataTypeBreakdown({ data }: DataTypeBreakdownProps) {
  const [config, setConfig] = useWidgetConfig<WidgetConfig>("data-type-breakdown", {
    trackedTypes: [],
  })
  const [showSettings, setShowSettings] = useState(false)
  const [newType, setNewType] = useState("")

  const addType = () => {
    const trimmed = newType.trim().toLowerCase()
    if (!trimmed || config.trackedTypes.includes(trimmed)) return
    setConfig({ ...config, trackedTypes: [...config.trackedTypes, trimmed] })
    setNewType("")
  }

  const removeType = (type: string) =>
    setConfig({ ...config, trackedTypes: config.trackedTypes.filter((t) => t !== type) })

  // Merge tracked types with actual breach data
  const breachMap = new Map(data.map((d) => [d.type, d]))
  const totalCount = data.reduce((sum, d) => sum + d.count, 0)

  const merged: DataItem[] = [
    ...config.trackedTypes.map((type) =>
      breachMap.get(type) ?? { type, count: 0, percentage: 0 }
    ),
    ...data.filter((d) => !config.trackedTypes.includes(d.type)),
  ].map((item) => ({
    ...item,
    percentage: totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0,
  }))

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-medium text-foreground">Exposed Data Types</h2>
          <p className="text-xs text-muted-foreground">
            Distribution of compromised data categories
          </p>
        </div>
        <button
          onClick={() => setShowSettings((s) => !s)}
          className={cn(
            "flex size-7 items-center justify-center rounded-md transition-colors",
            showSettings
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {showSettings ? <Check className="size-4" /> : <Settings2 className="size-4" />}
        </button>
      </div>

      {showSettings && (
        <div className="mb-4 space-y-3 rounded-lg border border-border bg-background p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Tracked data types
          </p>
          <div className="flex flex-wrap gap-1.5 min-h-[24px]">
            {config.trackedTypes.length === 0 ? (
              <p className="text-xs text-muted-foreground">No custom types added yet.</p>
            ) : (
              config.trackedTypes.map((type) => (
                <span
                  key={type}
                  className="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-foreground"
                >
                  {type.replace(/_/g, " ")}
                  <button
                    onClick={() => removeType(type)}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addType()}
              placeholder="ex: credit_card, ssn, contracts…"
              className="flex-1 rounded-md border border-input bg-card px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            <button
              onClick={addType}
              className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      )}

      {merged.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No data exposures detected
        </p>
      ) : (
        <div className="space-y-3">
          {merged.map(({ type, count, percentage }) => (
            <div key={type}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className={cn("text-sm capitalize", count === 0 ? "text-muted-foreground" : "text-foreground")}>
                  {type.replace(/_/g, " ")}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {count > 0 ? `${count} exposure${count > 1 ? "s" : ""} · ${percentage}%` : "not detected"}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    count === 0 ? "bg-border" : "bg-primary"
                  )}
                  style={{ width: count === 0 ? "100%" : `${percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
