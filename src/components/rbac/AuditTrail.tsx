"use client"

import { useEffect, useState } from "react"
import { SkeletonRows } from "@/components/ui/Skeleton"

type Entry = {
  id: string
  action: string
  targetType: string
  targetId: string | null
  createdAt: string
  actor: { email: string } | null
}

const PAGE = 20

export function AuditTrail() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  // Unlike the other two lists this one is re-armed on every page change,
  // because paging swaps the whole set: showing placeholders is the feedback
  // that the page actually turned.
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/audit?take=${PAGE}&skip=${skip}`)
        if (res.ok) {
          const data = (await res.json()) as { entries: Entry[]; total: number }
          setEntries(data.entries)
          setTotal(data.total)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [skip])

  return (
    <div className="space-y-2">
      {loading ? (
        <SkeletonRows rows={6} />
      ) : (
      <ul className="divide-y divide-border/60 rounded-lg border border-border/60 text-xs">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center justify-between px-3 py-2">
            <span className="text-foreground">{e.action}</span>
            <span className="text-muted-foreground">
              {e.actor?.email ?? "system"} - {new Date(e.createdAt).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{loading ? "Loading events..." : `${total} event(s)`}</span>
        <div className="flex gap-2">
          <button
            disabled={loading || skip === 0}
            onClick={() => setSkip((s) => Math.max(0, s - PAGE))}
            className="disabled:opacity-40"
          >
            Prev
          </button>
          <button
            disabled={loading || skip + PAGE >= total}
            onClick={() => setSkip((s) => s + PAGE)}
            className="disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
