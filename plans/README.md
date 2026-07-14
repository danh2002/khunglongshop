# Improve Plan Index

## 2026-07-14 Full Audit Plans

**Audit default**: no interactive selection was available, so this index adds the four highest-leverage findings that were not already covered by an existing plan. Existing plan 004 already documents the remaining unbounded ownership-history limitation in the paginated collection endpoint; it was not duplicated.

| Priority | Plan | Status | Depends on |
|---|---|---|---|
| P1 | [013 - Retire credential-like docs and align operational documentation](013-retire-doc-secret-and-align-operational-docs.md) | READY | none |
| P1 | [014 - Use durable rate limits for serverless routes](014-use-durable-rate-limits-for-serverless-routes.md) | READY | none |
| P1 | [017 - Fix the false `/404` document prerender error](017-fix-html-import-outside-document.md) | DONE (`e3ac798`) | none |
| P1 | [015 - Remediate reachable dependency advisories](015-remediate-reachable-dependency-advisories.md) | DONE (`775dd7e`) | 017 |
| P1 | [016 - Enforce CI verification and migration boundaries](016-enforce-ci-verification-and-migration-boundaries.md) | READY | 015 |

Plans 017 and 015 are DONE at `e3ac798` and `775dd7e`, respectively. Plan 016
is now eligible to execute.

Plan 015's final production audit reports 12 reviewed residual advisories
(5 high, 7 moderate, 0 critical): Preact under the latest compatible NextAuth
v4 line, Express routing under `express-rate-limit`, and Tailwind build-tooling
paths through glob/minimatch/picomatch. DOMPurify and Prisma advisories were
cleared. Resolving the accepted paths requires an upstream-compatible release
or a separately planned major migration; no unsafe audit downgrade was used.

```text
013 (documentation and credential response)  ─┐
014 (durable limiting)                        ├─ independent implementation tracks
015 (dependency remediation) ────────────────► 016 (blocking CI gates)
```

### Considered and rejected in this audit

- Local Vercel Blob image optimization timeout: excluded because it is a confirmed known issue with an already planned development-only configuration change.
- TiDB P1001 connection drops: excluded because it is a confirmed known issue and public-homepage fallbacks already exist.
- Collection/codes history over-fetch: not duplicated because [plan 004](004-paginate-collection-and-codes.md) explicitly records the remaining ownership-pagination limitation; reassess after its manual smoke verification.
- Broad Next.js upgrade: not a standalone plan because audit remediation must be targeted and reviewed together with direct dependency advisories in plan 015.

| Plan | Status | Notes |
|---|---|---|
| [001 - Remove root-layout force-dynamic](001-remove-root-force-dynamic.md) | PENDING MANUAL BUILD | Executor completed in isolated worktree `khunglongshop-plan001-exec` on branch `codex-plan-001-exec-20260622150114`, commit `b18e4aa Restore static root layout`. Reviewer verified scope, diff, `npm run type-check`, `npx vitest run --exclude "tests/otp/**"` with a shell-only dummy `DATABASE_URL`, and layout string checks. Manual `npm run build` with a real database remains before marking DONE. |
| [002 - Replace notification poll with SSE](002-replace-notification-poll-with-sse.md) | PENDING MANUAL SMOKE | Executor completed in isolated worktree `khunglongshop-plan002-exec` on branch `codex-plan-002-exec-20260622154807`, commit `d78e7be Replace notification polling with SSE`. Reviewer verified scope, diff, `npm run type-check`, `npx vitest run --exclude "tests/otp/**"` with a shell-only dummy `DATABASE_URL`, no `setInterval` in `hooks/useNotifications.ts`, and `EventSource("/api/notifications/stream")` in place. Manual authenticated smoke test remains before marking DONE. |
| [003 - Replace profile in-memory counts](003-replace-profile-in-memory-counts.md) | PENDING MANUAL SMOKE | Executor completed in isolated worktree `khunglongshop-plan003-exec-main` on branch `codex-plan-003-exec-20260622181532`, commit `3ddf751 Replace profile history scans with bounded counts`. Reviewer verified scope, diff, `npm run db:generate`, `npm run type-check`, `npx vitest run --exclude "tests/otp/**"` with a shell-only dummy `DATABASE_URL`, and string checks for `customer_order.count` plus `redemptionCode.groupBy`. Manual profile smoke test remains before marking DONE. |
| [004 - Paginate collection and codes](004-paginate-collection-and-codes.md) | PENDING MANUAL SMOKE | Executor completed in isolated worktree `khunglongshop-plan004-exec` on branch `codex-plan-004-exec-20260624123204`, commits `8d65f59 Paginate merch collection endpoints` and `12b36f0 Harden merch pagination parsing`. Reviewer verified scope, diff, `npm run db:generate`, `npm run type-check`, `npx vitest run --exclude "tests/otp/**"` with a shell-only dummy `DATABASE_URL`, pagination string checks, and `git diff --check`. Manual authenticated endpoint/page smoke remains before marking DONE. |
| [005 - Order number and status cleanup](005-order-number-status-cleanup.md) | PENDING MANUAL DB/BUILD/SMOKE | Executor completed in isolated worktree `khunglongshop-plan005-exec` on branch `codex-plan-005-exec-20260624142746`, commit `23ded13 Implement short order numbers and order status cleanup`. Reviewer verified scope, diff, `npm run db:generate`, `npm run type-check`, `npx vitest run --exclude "tests/otp/**"` with a shell-only dummy `DATABASE_URL`, status scans, and `git diff --check`. Manual DB migration apply, `npm run build` with a real database, and order/admin smoke tests remain before marking DONE. |
| [006 - Email OTP registration](006-email-otp-registration.md) | PENDING MANUAL OTP DB/RESEND SMOKE | Executor completed in isolated worktree `khunglongshop-plan006-exec` on branch `codex-plan-006-exec-20260626124810`, commit `b0d9f12 Replace registration OTP with email`. Reviewer verified scope, diff, `npm run db:generate`, `npm run type-check`, `npx vitest run --exclude "tests/otp/**"` with a shell-only dummy `DATABASE_URL`, UTF-8/mojibake scans, no registration-page phone/SMS references, `resend` package/lock entries, and `git diff --check`. OTP DB tests require valid MySQL credentials and Resend registration smoke remains manual. |
| [007 - Homepage performance](007-homepage-performance.md) | DONE | Executor completed in isolated worktree `khunglongshop-plan007-exec` on branch `advisor/007-homepage-performance`, commit `e7a1c7b Reduce homepage startup payload`, then applied to the main checkout as commit `4a7ac5e Reduce homepage startup payload`. Reviewer verified scope, diff, `npm run type-check`, `npx vitest run --exclude "tests/otp/**"` with dummy `DATABASE_URL`, `git diff --check`, no remaining `svgmap` import, and `npm run build` with real env loaded without printing secrets. Build shows `/` as `○ /` with `Revalidate 1m` and First Load JS `152 kB`. Production deploy `dpl_AD8jSWguNTNzw6bXHgkbx7CmcDCM` is Ready on alias `https://khunglongshop-kappa.vercel.app`; post-deploy snapshot improved from `318248` to `241972` compressed JS/CSS bytes, scripts `23` to `19`, CSS `3` to `2`. Header split was deferred by the plan fallback; image recompression was audit-only. |

## Next Action

For plan 001, manually apply/review commit `b18e4aa` from worktree `khunglongshop-plan001-exec`, then run `npm run type-check`, `npx vitest run --exclude "tests/otp/**"`, and `npm run build` in the main checkout with the real `DATABASE_URL`. Confirm `/` is Static/ISR before marking DONE.

For plan 002, manually apply/review commit `d78e7be` from worktree `khunglongshop-plan002-exec`, then log in and verify the notification bell receives unread-count updates without the old 30-second client polling loop.

For plan 003, manually apply/review commit `3ddf751` from worktree `khunglongshop-plan003-exec-main`, then log in as a user with orders and redeemed collection items. Confirm the account profile stats still match previous behavior and inspect Prisma/database logs to verify the request uses count/grouped queries instead of full history transfers.

For plan 004, manually apply/review commits `8d65f59` and `12b36f0` from worktree `khunglongshop-plan004-exec`, then log in and verify `/account/collection` loads the first page, `Tải thêm` appears when more than 10 sets exist, and `GET /api/merch/my-codes?page=1&limit=5` plus `GET /api/merch/my-collection?page=1&limit=5` return pagination envelopes with bounded result lengths.

For plan 005, manually apply/review commit `23ded13` from worktree `khunglongshop-plan005-exec`, then apply `prisma/migrations/005_order_number_status/migration.sql` against a real database, run `npm run db:generate`, `npm run type-check`, `npx vitest run --exclude "tests/otp/**"`, and `npm run build`. Smoke test placing an order, admin status transition to `COMPLETED`, `#orderNumber` display, and hidden blind-box reveal on user order detail.

For plan 006, manually apply/review commit `b0d9f12` from worktree `khunglongshop-plan006-exec`, then run OTP tests with a real test MySQL `DATABASE_URL` and smoke `/register` with real `RESEND_API_KEY` / `RESEND_FROM_EMAIL`. Confirm the email arrives, the 6-digit OTP verifies, and registration redirects to `/login`.

Plan 007 is deployed and verified on production. Future homepage performance work should target the deferred header boundary split and image recompression as separate plans.

## New Admin Performance Plans

| Plan | Status | Notes |
|---|---|---|
| [008 - Split admin from public root chrome](008-split-admin-from-public-chrome.md) | DONE IN WORKTREE | Executor completed in isolated worktree `khunglongshop-plan008-exec` on branch `codex-plan-008-exec-20260706141300`, commits `66b48f1 Split admin from public root chrome` and `7f0b8c3 Update route path tests for public group`. Reviewer verified scope, diff, `npm run type-check`, `npx vitest run --exclude "tests/otp/**"` with dummy `DATABASE_URL`, `git diff --check`, source search showing public chrome only in `app/(public)/layout.tsx`, and `npm run build` with real env loaded without printing secrets. Build shows `/admin` as Dynamic with First Load JS `106 kB`; production Speed Insights re-measure remains after applying/deploying the commits. |
| [009 - Slim admin sidebar hydration and icon cost](009-slim-admin-sidebar-hydration.md) | READY | Execute after 008 or independently as a smaller admin-shell cleanup. Reduces sidebar client JS and `react-icons` cost. |
| [010 - Lazy-load heavy admin route editors](010-lazy-load-heavy-admin-editors.md) | READY | Execute after `/admin` root metrics are improved. Targets admin child-route editor chunks, not dashboard root LCP. |
| [011 - Featured products homepage sections](011-featured-products-homepage-sections.md) | TODO | Implements GitHub issue #9: DB-backed CMS featured collector products, admin/public APIs, `/admin/featured-products`, and homepage section reorder/rename. This is independent of admin performance plans, but executors should start from a clean tree because it touches Prisma, homepage, API, admin UI, and tests. |

## New Shop Performance Plan

| Plan | Status | Notes |
|---|---|---|
| [012 - Reduce /shop client startup and LCP cost](012-shop-performance-client-boundary-lcp.md) | DONE IN WORKTREE | Executor completed in isolated worktree `khunglongshop-plan012-exec` on branch `advisor/012-shop-performance-client-boundary-lcp`, commit `5010f02 Reduce shop startup payload`. Reviewer verified scope, diff, `npm run db:generate`, `npm run type-check`, `npx vitest run --exclude "tests/otp/**"` with dummy `DATABASE_URL`, `git diff --check`, source scans, and `npm run build` with real env loaded without printing secrets. Build shows `/shop/[[...slug]]` as SSG with `/shop` revalidate `1m` and First Load JS `125 kB`. Production Speed Insights re-measure remains after applying/deploying the commit. |
