# Public read-only demo (showcase clone)

Date: 2026-07-11
Status: approved

## Goal

A publicly accessible, interactive demo of DataShield so people can click
through the real product (dashboard, widgets, alerts) without creating an
account and without being able to change or extract anything. Target
audience: recruiters and the curious, reached via LinkedIn and the like.

## Non-goals

- Real breach detection (no HIBP key, no directory sync in the demo)
- Backups, scheduler, or any operational tooling
- Multi-tenant or per-visitor sandboxes
- Marketing landing page (may come later, separate effort)

## Approach

Clone the real codebase and add a thin demo layer, toggled by a single
environment variable `DEMO_MODE=1`. The demo stays faithful to the product
because it IS the product, minus writes.

Rejected alternatives: a static UI-only mockup (large decoupling effort,
drifts from the real app) and a guided video (not interactive).

## Structure

- New working folder `~/GitHub/datashield-demo`, shell copy of this repo
  at v1.0.1. No code is rewritten during the copy.
- Fresh git history: single initial commit. The user pushes it to a new
  GitHub repository (private recommended) and connects it to Vercel.
- Divergences from the main repo are limited to the demo layer, so future
  versions can be re-cloned with little effort.

## Demo layer

All behavior below activates only when `DEMO_MODE=1`; without the variable
the clone behaves exactly like the real app.

1. One-click entry. The login page replaces the credentials form with a
   single "Access the demo" button. Submitting it signs in server-side as a
   seeded demo account. Nobody types credentials; no registration.
2. Read-only guard. `src/middleware.ts` (which already handles CSP) gains a
   demo guard: any POST/PUT/PATCH/DELETE request to `/api/*` is rejected
   with HTTP 403 and a JSON body `{ "error": "Demo mode: read-only" }`,
   except `/api/auth/*` (required for the demo sign-in). This is a single
   server-side chokepoint; webhooks, SCIM, cron and register routes all
   fall under it. If any UI mutation path uses server actions instead of
   API routes, those actions get the same `DEMO_MODE` rejection.
3. Fixtures. Demo data (company, employees, alerts across severities and
   statuses, dashboard presets) seeded by reusing `prisma/seed.dev.ts`,
   extended only if the demo needs richer variety.
4. Integrations off. No HIBP or directory-sync secrets are configured in
   the demo environment; related UI shows the not-configured state.

## Deployment

- App on Vercel (native Next.js hosting; the CSP `force-dynamic` setup from
  #111/#113 is compatible).
- Database on Neon free tier (serverless PostgreSQL), `DATABASE_URL` set in
  Vercel project env vars alongside `DEMO_MODE=1` and the auth secret.
- Seed executed once from the developer machine against the Neon database.
- Source exposure note: a deployed Next.js app never serves its source code
  (visitors get rendered HTML plus minified bundles), so code privacy is
  handled by keeping the GitHub repo private, not by anything in the app.

## Verification

- Local run with `DEMO_MODE=1`: one-click entry lands on the dashboard;
  browse widgets and alerts; attempt at least one write from the UI and
  confirm the 403 rejection surfaces cleanly.
- `DEMO_MODE` unset: login form and writes behave as before.
- Existing test suite stays green in the clone.

## Risks

- Neon free tier cold starts may add latency to the first request. Accepted
  for a demo.
- Vercel serverless has no long-lived processes; anything scheduler-shaped
  is out of scope anyway.
- Demo drift: the clone is a snapshot of v1.0.1 and will not follow main
  automatically. Accepted; re-clone when worth it.
