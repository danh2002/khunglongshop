# Plan 022: Keep maintenance middleware off static and image-optimizer requests

> **Executor instructions:** Follow this plan step by step. Run every verification command. If a STOP condition occurs, stop and report; do not improvise. When complete, update this plan's status in `plans/README.md`.
>
> **Drift check (run first):** `git diff --stat 2b604a5..HEAD -- middleware.ts lib/maintenance.ts app/api/public/settings/route.ts tests/unit`

## Status

- **Priority:** P1
- **Effort:** S
- **Risk:** MED
- **Depends on:** none
- **Category:** perf
- **Planned at:** commit `2b604a5`, 2026-08-11
- **Vercel resources targeted:** Fluid Active CPU, Edge Requests, Function Invocations, Fast Origin Transfer

## Why this matters

The Vercel dashboard reports 5h23m Fluid Active CPU against a 4h allowance and 663K Edge Requests. `middleware.ts` matches every path and, before deciding whether the route is protected, calls `getMaintenanceMode`. That helper makes a no-store internal request to `/api/public/settings`, whose handler performs a Prisma `upsert`; image optimizer requests and repository static assets do not need that database-backed maintenance decision. Narrowing the matcher removes this recursive work from static, image, favicon, and robots/sitemap traffic without changing maintenance behavior for HTML pages or application APIs.

## Current state

```ts
// middleware.ts:42-71
export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const pathname = req.nextUrl.pathname;
  ...
  if (!internalMaintenanceCheck && !isMaintenanceBypassPath(pathname) &&
      (await getMaintenanceMode(req.url))) {
    return createMaintenanceResponse(pathname);
  }
  ...
}

export const config = { matcher: ["/:path*"] };
```

```ts
// lib/maintenance.ts:37-43
export async function getMaintenanceMode(requestUrl: string) {
  const settingsUrl = new URL("/api/public/settings", requestUrl);
  const response = await fetch(settingsUrl, {
    cache: "no-store",
    headers: { [MAINTENANCE_CHECK_HEADER]: "1" },
  });
```

```ts
// app/api/public/settings/route.ts:4-20
export const dynamic = "force-dynamic";
const settings = await prisma.siteSettings.upsert({ ... });
return NextResponse.json(settings, {
  headers: { "Cache-Control": "no-store, max-age=0" },
});
```

This plan deliberately retains the runtime database setting and the internal-check header, because they make the admin maintenance toggle effective without redeployment. `middleware.ts` uses NextAuth and route protection, so retain it for navigation and API paths.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Type check | `npm run type-check` | exit 0 |
| Tests | `npx vitest run --exclude "tests/otp/**"` | exit 0 |
| Build | `npm run build` | exit 0 with a reachable `DATABASE_URL` |
| Matcher review | `Get-Content middleware.ts | Select-String 'matcher|_next|images|favicon|robots|sitemap'` | shows explicit exclusions |

## Scope

**In scope:**

- `middleware.ts`
- `tests/unit/` focused middleware/source tests
- `plans/README.md` status row only

**Out of scope:**

- `lib/maintenance.ts` and `app/api/public/settings/route.ts`; do not change the database-backed maintenance contract in this small plan.
- Authentication/authorization rules, redirect destinations, maintenance-page HTML, Vercel cron routes, and image component markup.
- Moving site settings to Vercel Edge Config or environment variables; that is a separate architecture decision.

## Steps

### Step 1: Establish the routes that must and must not enter middleware

Before editing, list the active route classes. Middleware must still cover `/`, `/shop`, `/account/**`, `/admin/**`, and `/api/**`. It must not run for `/_next/static/**`, `/_next/image/**`, `/images/**`, `/favicon.ico`, `/robots.txt`, `/sitemap.xml`, or `/icon.png`.

Use an anchored negative-lookahead matcher accepted by the installed Next.js 15 middleware configuration. Keep it as a single documented matcher rather than scattered early returns; the request must avoid entering the Edge function at all.

**Verify:** run the focused matcher tests added in Step 3 before and after the edit; expected current test proves the intended route table.

### Step 2: Replace the catch-all matcher with the audited exclusion matcher

In `middleware.ts`, replace `matcher: ["/:path*"]` with a Next.js-compatible negative-lookahead matcher excluding the exact paths from Step 1. Preserve all application routes, including `/api/auth/**`, because NextAuth needs its current behavior. Do not add an exclusion for all `/api/**`.

Use the established Next.js matcher syntax; do not attempt to parse paths inside middleware as a substitute for matcher-level exclusions.

**Verify:** `npm run type-check` -> exit 0.

### Step 3: Add route-matcher regression coverage

Create a focused unit/source test following `tests/unit/routeLoading.test.ts` style. It must assert that the configured matcher excludes each static/image path from Step 1 and does not exclude `/`, `/shop`, `/account/orders`, `/admin`, or `/api/products`. Prefer testing the matcher regexp/string directly; do not instantiate database access or NextAuth.

**Verify:** `npx vitest run tests/unit/<middleware-matcher-test>.test.ts` -> exit 0.

### Step 4: Build and production verification

Run the commands in the table, deploy normally, then inspect Vercel Function/Edge logs and Usage for one representative public navigation. Confirm that its document request can still run the maintenance check, while an optimized image request and a `/_next/static/**` request do not create middleware/maintenance activity.

**Verify:** `npx vitest run --exclude "tests/otp/**"` -> exit 0.

## Test plan

- Automated: matcher includes application documents and APIs, excludes all named static/image paths.
- Manual logged-out: `/`, `/shop`, and an image URL load; enable maintenance mode through the existing approved admin flow and verify public document pages show the maintenance response.
- Manual authenticated: `/account` and `/admin` retain their sign-in/role behavior.
- Vercel: compare Fluid Active CPU and edge/function traces after a similar traffic interval. Image and static asset requests must no longer call `/api/public/settings` through middleware.

## Done criteria

- [ ] `middleware.ts` no longer uses the unconstrained `matcher: ["/:path*"]`.
- [ ] Static, optimizer, favicon, image, robots, sitemap, and icon paths are excluded by configuration.
- [ ] `/`, `/shop`, `/account/**`, `/admin/**`, and `/api/**` remain covered.
- [ ] `npm run type-check` exits 0.
- [ ] `npx vitest run --exclude "tests/otp/**"` exits 0.
- [ ] `npm run build` exits 0 with an approved reachable database, or its environment prerequisite is recorded.
- [ ] Production confirms maintenance behavior for documents and no maintenance fetch for excluded assets.

## STOP conditions

- The installed Next.js version rejects the proposed matcher syntax.
- A public asset actually must be blocked during maintenance for a documented legal/security reason.
- The first deployment shows `/api/auth/**`, cron, protected routes, or the admin maintenance toggle no longer works.
- Eliminating the remaining page/API maintenance lookup is required to reach the quota target; stop and propose a separate cached configuration/Edge Config plan rather than changing its semantics here.

## Maintenance notes

Any newly introduced public static namespace must be added to the matcher exclusion review. The remaining per-document maintenance lookup is intentional scope: it preserves live maintenance toggling. If CPU remains high after this plan, measure its share before replacing that contract.
