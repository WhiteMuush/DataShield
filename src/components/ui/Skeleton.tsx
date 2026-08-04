import { cn } from "@/lib/utils"

// Ghost placeholder. Same idiom as the dashboard route skeleton
// (src/app/(dashboard)/loading.tsx): a pulsing muted block standing in for the
// content's own box, so the layout does not jump when the data lands.
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-muted", className)} />
}

// A list of placeholder rows sized like the real ones, framed by the same
// border the loaded list uses.
export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <ul className={cn("divide-y divide-border/60 rounded-lg border border-border/60", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center justify-between px-3 py-2.5">
          <Skeleton className="h-3.5 w-48" />
          <Skeleton className="h-3.5 w-24 bg-muted/70" />
        </li>
      ))}
    </ul>
  )
}
