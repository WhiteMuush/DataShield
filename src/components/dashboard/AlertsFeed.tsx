"use client"

import { useState } from "react"
import { useWidgetTitle } from "@/hooks/useWidgetTitle"
import { useDashboardEditing } from "@/contexts/DashboardEditContext"
import { cn } from "@/lib/utils"

type Alert = {
  id: string
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED"
  message: string
  createdAt: string
  employeeName: string | null
}

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "bg-severity-critical/10 text-severity-critical border-severity-critical/20",
  HIGH:     "bg-severity-high/10 text-severity-high border-severity-high/20",
  MEDIUM:   "bg-severity-medium/10 text-severity-medium border-severity-medium/20",
  LOW:      "bg-severity-low/10 text-severity-low border-severity-low/20",
}

const STATUS_STYLES: Record<string, string> = {
  OPEN:         "bg-severity-critical/10 text-severity-critical",
  ACKNOWLEDGED: "bg-severity-medium/10 text-severity-medium",
  RESOLVED:     "bg-severity-ok/10 text-severity-ok",
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open", ACKNOWLEDGED: "Ack.", RESOLVED: "Resolved",
}

export function AlertsFeed({ data }: { data: Alert[] }) {
  const editing = useDashboardEditing()
  const { title } = useWidgetTitle("alerts-feed", "Recent Alerts")
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "RESOLVED">("ALL")

  const filtered = data.filter((a) => filter === "ALL" || a.status === filter)

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-5">
      <div className="mb-3 shrink-0 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{data.length} alertes récentes</p>
        </div>
      </div>

      <div className="mb-3 shrink-0 flex gap-1.5">
        {(["ALL", "OPEN", "RESOLVED"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f === "ALL" ? "Tous" : f === "OPEN" ? "Ouverts" : "Résolus"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Aucune alerte</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
          {filtered.map((alert) => (
            <div key={alert.id} className={cn("rounded-lg border p-3", SEVERITY_STYLES[alert.severity])}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">{alert.severity}</span>
                    {alert.employeeName && (
                      <span className="text-[10px] text-muted-foreground">· {alert.employeeName}</span>
                    )}
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">{alert.message}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_STYLES[alert.status])}>
                    {STATUS_LABELS[alert.status]}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(alert.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
