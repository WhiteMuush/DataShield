# Public Read-Only Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public, interactive, read-only demo of DataShield on Vercel + Neon, built as a clone of this repo with a thin demo layer.

**Architecture:** Shell-copy of the repo at v1.0.1 into `~/GitHub/datashield-demo` with fresh git history. A `NEXT_PUBLIC_DEMO_MODE=1` env var activates: a one-click demo sign-in on the login page (server action, credentials never reach the browser), and a middleware guard rejecting every mutating `/api/*` request with 403. Demo data comes from the existing dev seed plus a demo VIEWER account.

**Tech Stack:** Next.js 15 (App Router), next-auth v5 (credentials), Prisma 7 + PostgreSQL (Neon in prod), Vercel hosting, vitest + Playwright.

**Spec:** `docs/superpowers/specs/2026-07-11-public-demo-design.md`. One deviation: the spec names the flag `DEMO_MODE`; the plan uses `NEXT_PUBLIC_DEMO_MODE` as the single flag because the login page (client component) must also read it. `NEXT_PUBLIC_` vars are readable server-side too, so one variable serves both.

## Global Constraints

- All work happens in the clone at `~/GitHub/datashield-demo`, never in `~/GitHub/DataShield` (except this plan/spec doc).
- Repo hooks travel with the clone: no `console.log` in committed files, ASCII-only added lines, `eslint --max-warnings 0`, type-check on push.
- Without `NEXT_PUBLIC_DEMO_MODE=1` the app must behave exactly as before (guard inert, normal login form).
- Never write real connection strings or secrets into committed files; env vars only.
- Commit messages: Conventional Commits, no attribution trailers (repo compliance hook rejects them).

---

### Task 1: Clone the repo with fresh history

**Files:**
- Create: `~/GitHub/datashield-demo/` (full copy)

**Interfaces:**
- Produces: a working git repo where all later tasks run, baseline tests green.

- [ ] **Step 1: Copy the repo without git history or node_modules**

```bash
mkdir -p ~/GitHub/datashield-demo
rsync -a --exclude .git --exclude node_modules --exclude .next --exclude test-results --exclude backups ~/GitHub/DataShield/ ~/GitHub/datashield-demo/
```

- [ ] **Step 2: Fresh git init and install**

```bash
cd ~/GitHub/datashield-demo
git init -b main
npm install
```

- [ ] **Step 3: Verify baseline is green**

Run: `npm run lint && npm test`
Expected: eslint clean, vitest suite PASS.

- [ ] **Step 4: Initial commit**

```bash
git add -A
git commit -m "chore: initial demo fork of DataShield v1.0.1"
```

---

### Task 2: Read-only guard predicate (TDD)

**Files:**
- Create: `src/lib/demoGuard.ts`
- Test: `src/lib/__tests__/demoGuard.test.ts` (follow the repo's existing vitest test location convention; if tests live elsewhere, e.g. `test/` or alongside as `demoGuard.test.ts`, match it)

**Interfaces:**
- Produces: `isDemoBlockedRequest(pathname: string, method: string, demoMode: string | undefined): boolean`. Task 3 imports it in middleware.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest"
import { isDemoBlockedRequest } from "@/lib/demoGuard"

describe("isDemoBlockedRequest", () => {
  it("blocks POST to api routes in demo mode", () => {
    expect(isDemoBlockedRequest("/api/employees", "POST", "1")).toBe(true)
  })

  it("blocks PUT, PATCH and DELETE in demo mode", () => {
    for (const method of ["PUT", "PATCH", "DELETE"]) {
      expect(isDemoBlockedRequest("/api/alerts/abc", method, "1")).toBe(true)
    }
  })

  it("allows GET in demo mode", () => {
    expect(isDemoBlockedRequest("/api/employees", "GET", "1")).toBe(false)
  })

  it("allows auth routes so demo sign-in works", () => {
    expect(
      isDemoBlockedRequest("/api/auth/callback/credentials", "POST", "1")
    ).toBe(false)
  })

  it("ignores non-api paths", () => {
    expect(isDemoBlockedRequest("/dashboard", "POST", "1")).toBe(false)
  })

  it("is inert when demo mode is off", () => {
    expect(isDemoBlockedRequest("/api/employees", "DELETE", undefined)).toBe(false)
    expect(isDemoBlockedRequest("/api/employees", "DELETE", "0")).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/demoGuard.test.ts`
Expected: FAIL, cannot resolve `@/lib/demoGuard`.

- [ ] **Step 3: Write the implementation**

```ts
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

export function isDemoBlockedRequest(
  pathname: string,
  method: string,
  demoMode: string | undefined
): boolean {
  if (demoMode !== "1") return false
  if (!pathname.startsWith("/api/")) return false
  if (pathname.startsWith("/api/auth/")) return false
  return MUTATING_METHODS.has(method.toUpperCase())
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/demoGuard.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/demoGuard.ts src/lib/__tests__/demoGuard.test.ts
git commit -m "feat: add demo mode read-only request predicate"
```

---

### Task 3: Wire the guard into middleware

**Files:**
- Modify: `src/middleware.ts`
- Modify: `src/auth.config.ts:7-11` (authorized callback)

**Interfaces:**
- Consumes: `isDemoBlockedRequest` from Task 2.
- Produces: mutating `/api/*` requests return 403 JSON `{ "error": "Demo mode: read-only" }` when `NEXT_PUBLIC_DEMO_MODE=1`.

Background for the implementer: today the middleware matcher EXCLUDES `/api`,
so API routes never pass through middleware and do their own `auth()` checks.
To intercept API writes we must include `/api` in the matcher. That makes the
next-auth `authorized` callback apply to API requests, and it currently
redirects anonymous requests to `/login`, which would turn API 401s into 302s.
So the callback must whitelist `/api` (route handlers keep enforcing their own
auth, unchanged).

- [ ] **Step 1: Update the authorized callback in `src/auth.config.ts`**

Replace the `authorized` callback with:

```ts
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname
      if (path === "/login" || path.startsWith("/login/")) return true
      // API routes enforce their own auth in each handler; the middleware
      // matcher now includes /api only for the demo read-only guard.
      if (path.startsWith("/api/")) return true
      return !!auth?.user
    },
```

- [ ] **Step 2: Update `src/middleware.ts`**

```ts
import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { authConfig } from "@/auth.config"
import { buildCsp } from "@/lib/csp"
import { isDemoBlockedRequest } from "@/lib/demoGuard"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  if (
    isDemoBlockedRequest(
      req.nextUrl.pathname,
      req.method,
      process.env.NEXT_PUBLIC_DEMO_MODE
    )
  ) {
    return NextResponse.json({ error: "Demo mode: read-only" }, { status: 403 })
  }

  const nonce = btoa(crypto.randomUUID())
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development")

  // Next.js reads the nonce from the request CSP header and stamps it on
  // its own inline scripts; without this the response header would block them.
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("content-security-policy", csp)

  const res = NextResponse.next({ request: { headers: requestHeaders } })
  res.headers.set("Content-Security-Policy", csp)
  return res
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts|.*\\..*).*)"],
}
```

(The only matcher change: `api|` removed from the negative lookahead.)

- [ ] **Step 3: Run the full unit suite and typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 4: Manual smoke without demo mode (regression)**

Start the dev stack (`npm run db:up`, `npm run dev`), then:

Run: `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/alerts`
Expected: whatever the route returned before (401/4xx from its own auth), NOT 403 with the demo body, and NOT a 302 redirect to /login.

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health`
Expected: 200.

- [ ] **Step 5: Manual smoke with demo mode**

Restart dev with the flag: `NEXT_PUBLIC_DEMO_MODE=1 npm run dev`

Run: `curl -s -X POST http://localhost:3000/api/alerts`
Expected: `{"error":"Demo mode: read-only"}` with status 403.

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health`
Expected: 200 (GET stays open).

- [ ] **Step 6: Commit**

```bash
git add src/middleware.ts src/auth.config.ts
git commit -m "feat: enforce read-only API in demo mode via middleware"
```

---

### Task 4: One-click demo sign-in

**Files:**
- Create: `src/app/(auth)/login/demoSignIn.ts`
- Modify: `src/app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: seeded demo account (Task 5 creates it; env `DEMO_EMAIL` / `DEMO_PASSWORD`).
- Produces: `/login` in demo mode shows a single "Access the demo" button; credentials stay server-side.

- [ ] **Step 1: Create the server action**

```ts
"use server"

import { signIn } from "@/auth"

export async function demoSignIn() {
  await signIn("credentials", {
    email: process.env.DEMO_EMAIL,
    password: process.env.DEMO_PASSWORD,
    redirectTo: "/dashboard",
  })
}
```

- [ ] **Step 2: Branch the login page**

In `src/app/(auth)/login/page.tsx`, add the import and render the demo
variant instead of the credentials form when the flag is set. Keep the
existing component intact; add at the top of the file:

```ts
import { demoSignIn } from "./demoSignIn"

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "1"
```

Inside the JSX, replace the `<form onSubmit={handleSubmit} ...>` block with:

```tsx
        {isDemo ? (
          <form action={demoSignIn} className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Read-only demo with fictional data. No account needed.
            </p>
            <Button type="submit" className="w-full" size="lg">
              Access the demo
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* existing fields unchanged */}
          </form>
        )}
```

(`NEXT_PUBLIC_` vars are inlined into client bundles at build time, so the
flag works in this "use client" component; the password does not appear
anywhere client-side because the server action runs on the server.)

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 4: Manual verify both modes**

With `NEXT_PUBLIC_DEMO_MODE=1 DEMO_EMAIL=demo@datashield.dev DEMO_PASSWORD=<pick one> npm run dev` (demo user must exist, run Task 5 seed first if needed): `/login` shows the single button, clicking lands on `/dashboard`.
Without the flag: normal email/password form, login works as before.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/login/demoSignIn.ts" "src/app/(auth)/login/page.tsx"
git commit -m "feat: one-click demo sign-in on login page"
```

---

### Task 5: Demo seed

**Files:**
- Create: `prisma/seed.demo.ts`
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: base seed (`prisma/seed.ts`) and dev fixtures (`prisma/seed.dev.ts`), which create the company `datashield.dev`, breaches, employees, alerts.
- Produces: demo VIEWER user (`DEMO_EMAIL` / `DEMO_PASSWORD`) that Task 4 signs in as.

- [ ] **Step 1: Write `prisma/seed.demo.ts`**

```ts
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

// Demo account for the public read-only demo. Requires the base seed and
// dev fixtures to have run first (company + data must exist).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const demoEmail = process.env.DEMO_EMAIL ?? "demo@datashield.dev"
const demoPassword = process.env.DEMO_PASSWORD

async function main() {
  if (!demoPassword) throw new Error("DEMO_PASSWORD env var is required")

  const company = await prisma.company.findUniqueOrThrow({
    where: { domain: "datashield.dev" },
  })

  const hashedPassword = await bcrypt.hash(demoPassword, 12)
  await prisma.user.upsert({
    where: { email: demoEmail },
    update: { hashedPassword },
    create: {
      email: demoEmail,
      hashedPassword,
      role: "VIEWER",
      companyId: company.id,
    },
  })
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
```

(VIEWER role: defense in depth on top of the middleware guard, and the UI
hides admin-only affordances.)

- [ ] **Step 2: Add the npm script**

In `package.json` scripts, next to the existing `seed` entry, add:

```json
    "seed:demo": "dotenv -e .env.local -- tsx prisma/seed.demo.ts",
```

- [ ] **Step 3: Run the full demo seed chain locally**

```bash
npm run db:up
npm run db:migrate
npm run seed
dotenv -e .env.local -- tsx prisma/seed.dev.ts
DEMO_EMAIL=demo@datashield.dev DEMO_PASSWORD=<pick one> npm run seed:demo
```

Expected: no errors; demo user present (verify: sign in via Task 4 button).

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.demo.ts package.json
git commit -m "feat: add demo account seed"
```

---

### Task 6: Demo e2e spec (local)

**Files:**
- Create: `e2e/demo.spec.ts`

**Interfaces:**
- Consumes: running app with `NEXT_PUBLIC_DEMO_MODE=1` and seeded demo data.

- [ ] **Step 1: Write the spec**

```ts
import { expect, test } from "@playwright/test"

// Requires the app running with NEXT_PUBLIC_DEMO_MODE=1 and the demo seed
// applied. Not wired into CI; run locally before each demo deploy.
test("demo entry is one click and read-only", async ({ page }) => {
  await page.goto("/login")
  await page.getByRole("button", { name: "Access the demo" }).click()
  await page.waitForURL("**/dashboard")

  const res = await page.request.post("/api/employees", { data: {} })
  expect(res.status()).toBe(403)
  expect((await res.json()).error).toContain("Demo mode")
})
```

- [ ] **Step 2: Run it**

Run: `NEXT_PUBLIC_DEMO_MODE=1 npx playwright test e2e/demo.spec.ts`
Expected: PASS. (Check `playwright.config.ts` for how the existing smoke
boots the app; reuse the same mechanism.)

- [ ] **Step 3: Commit**

```bash
git add e2e/demo.spec.ts
git commit -m "test: add demo mode e2e spec"
```

---

### Task 7: Deploy (Neon + Vercel runbook)

**Files:** none (operations). User does the console parts.

- [ ] **Step 1: Create the Neon database**

In the Neon console: new project (region close to Europe), copy the pooled
connection string.

- [ ] **Step 2: Push the repo to GitHub (private) and create the Vercel project**

```bash
cd ~/GitHub/datashield-demo
gh repo create datashield-demo --private --source . --push
```

In Vercel: import the GitHub repo. Framework preset: Next.js. Before the
first deploy, set env vars (Production):

- `DATABASE_URL` = Neon pooled connection string
- `AUTH_SECRET` = output of `openssl rand -base64 32`
- `NEXT_PUBLIC_DEMO_MODE` = `1`
- `DEMO_EMAIL` = `demo@datashield.dev`
- `DEMO_PASSWORD` = a long random value (visitors never see or type it)

No HIBP or directory-sync secrets: integrations stay unconfigured by design.

- [ ] **Step 3: Migrate and seed Neon from the local machine**

```bash
DATABASE_URL="<neon url>" npx prisma migrate deploy
DATABASE_URL="<neon url>" npx tsx prisma/seed.ts
DATABASE_URL="<neon url>" npx tsx prisma/seed.dev.ts
DATABASE_URL="<neon url>" DEMO_EMAIL=demo@datashield.dev DEMO_PASSWORD=<same as Vercel> npx tsx prisma/seed.demo.ts
```

- [ ] **Step 4: Deploy and verify production**

Trigger the Vercel deploy (push or dashboard). Then:

Run: `curl -s -X POST https://<demo-domain>/api/employees`
Expected: `{"error":"Demo mode: read-only"}`, status 403.

Browser: `/login` shows "Access the demo", one click lands on the dashboard
with fictional data; widgets and alerts browsable; no CSP violations in the
console.

---

## Self-review notes

- Spec coverage: structure (Task 1), one-click entry (Task 4), read-only
  guard (Tasks 2-3), fixtures (Task 5), integrations off (Task 7 env),
  Vercel+Neon (Task 7), verification (Tasks 3-4-6-7). Covered.
- Flag rename vs spec documented in header.
- Names consistent: `isDemoBlockedRequest`, `demoSignIn`, `seed:demo`,
  `NEXT_PUBLIC_DEMO_MODE`, `DEMO_EMAIL`, `DEMO_PASSWORD`.
