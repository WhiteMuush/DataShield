import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <p className="text-7xl font-semibold tracking-tight text-primary">404</p>
      <h1 className="mt-4 text-xl font-semibold text-foreground">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
        The page you are looking for does not exist or may have been moved.
      </p>
      <Link
        href="/dashboard"
        className={buttonVariants({ size: "lg", className: "mt-6" })}
      >
        Back to dashboard
      </Link>
    </div>
  )
}
