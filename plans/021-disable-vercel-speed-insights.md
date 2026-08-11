# Plan 021: Disable Vercel Speed Insights collection on the free-tier storefront

> **Executor instructions:** Follow this plan step by step. Run every verification command. If a STOP condition occurs, stop and report; do not improvise. When complete, update this plan's status in `plans/README.md`.
>
> **Drift check (run first):** `git diff --stat 2b604a5..HEAD -- app/layout.tsx package.json package-lock.json tests/unit`

## Status

- **Priority:** P1
- **Effort:** S
- **Risk:** LOW
- **Depends on:** none
- **Category:** perf
- **Planned at:** commit `2b604a5`, 2026-08-11
- **Vercel resources targeted:** Speed Insights Data Points

## Why this matters

Vercel reports 32K Speed Insights data points against a 10K free-tier allowance. The root layout mounts `<SpeedInsights />`, so its browser collector is included on every public, account, and admin route. Removing that collector stops future data-point usage immediately; it does not affect Next.js rendering, analytics, checkout, or application telemetry.

## Current state

- `app/layout.tsx` is the layout inherited by every App Router route.

```tsx
// app/layout.tsx:1-5, 45-47
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
...
<Analytics />
<SpeedInsights />
```

- `package.json` retains `@vercel/analytics` and `@vercel/speed-insights` as separate dependencies. The reported Web Analytics Events figure remains below its quota, so leave Analytics installed and mounted.

Project conventions: TypeScript is strict; use `npm`, Next.js App Router, and Vitest. The recent history uses concise imperative commits such as `Reduce homepage startup payload`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Dependency install after manifest edit | `npm install` | exit 0; only package manifest/lock changes |
| Type check | `npm run type-check` | exit 0, no TypeScript errors |
| Tests | `npx vitest run --exclude "tests/otp/**"` | exit 0 |
| Build | `npm run build` | exit 0 with a reachable `DATABASE_URL` |
| Source check | `rg -n "SpeedInsights|@vercel/speed-insights" app components lib package.json` | no output |

## Scope

**In scope:**

- `app/layout.tsx`
- `package.json`
- `package-lock.json`
- one focused source-inspection test under `tests/unit/`, if that test style is still used
- `plans/README.md` status row only

**Out of scope:**

- `@vercel/analytics` and `<Analytics />`; Web Analytics is not over quota.
- Any replacement third-party RUM product, consent UI, or analytics dashboard.
- Route layouts, middleware, product behavior, and Vercel billing-plan changes.

## Steps

### Step 1: Remove the root Speed Insights component

In `app/layout.tsx`, remove the `@vercel/speed-insights/next` import and the `<SpeedInsights />` element. Keep `<Analytics />` exactly where it is.

**Verify:** `rg -n "SpeedInsights|@vercel/speed-insights" app/layout.tsx` -> no output.

### Step 2: Remove the unused package cleanly

Run `npm uninstall @vercel/speed-insights`. Do not manually edit dependency versions or update unrelated packages. Confirm `package.json` and `package-lock.json` no longer contain the package.

**Verify:** `rg -n '"@vercel/speed-insights"' package.json package-lock.json` -> no output.

### Step 3: Add a narrow regression check if the repository still uses source-wiring tests

Use `tests/unit/shopStartupPayload.test.ts` or `tests/unit/routeLoading.test.ts` as the structural pattern. Add a test that reads `app/layout.tsx` and asserts it neither imports nor renders `SpeedInsights`; assert that `Analytics` remains present. Do not test dependency internals.

**Verify:** `npx vitest run tests/unit/<new-or-updated-test>.test.ts` -> exit 0.

### Step 4: Verify and deploy

Run the commands in the table. Deploy through the normal Vercel workflow. After production receives traffic, check the Vercel Usage page for a flat or near-flat Speed Insights data-point count; historical usage cannot be reversed.

**Verify:** `npm run type-check` and `npx vitest run --exclude "tests/otp/**"` -> exit 0.

## Test plan

- Source regression: root layout has no `SpeedInsights` import/component and still has `Analytics`.
- Manual production smoke: visit `/`, `/shop`, an account page while logged in, and `/admin` while logged in. Each must render normally.
- Vercel dashboard: record the date/time of deploy and compare the next usage interval. The target is no newly collected Speed Insights points from this deployment.

## Done criteria

- [ ] `rg -n "SpeedInsights|@vercel/speed-insights" app components lib package.json` returns no output.
- [ ] `@vercel/analytics` and `<Analytics />` remain in `app/layout.tsx`.
- [ ] `npm run type-check` exits 0.
- [ ] `npx vitest run --exclude "tests/otp/**"` exits 0.
- [ ] `npm run build` exits 0 with an approved reachable database, or its environment prerequisite is recorded.
- [ ] Production usage is rechecked after deployment.

## STOP conditions

- `SpeedInsights` is imported outside the scoped paths or a product requirement explicitly requires keeping paid Speed Insights collection.
- Removing the package requires a broad Next.js or lockfile upgrade.
- Any route loses analytics or fails to render after this minimal removal.

## Maintenance notes

If Speed Insights is re-enabled, make it an explicit product/operations decision with a paid quota or a bounded sampling strategy verified against the installed SDK. Do not re-add the root collector casually: the root layout covers every route.
