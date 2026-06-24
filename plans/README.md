# Improve Plan Index

| Plan | Status | Notes |
|---|---|---|
| [001 - Remove root-layout force-dynamic](001-remove-root-force-dynamic.md) | PENDING MANUAL BUILD | Executor completed in isolated worktree `khunglongshop-plan001-exec` on branch `codex-plan-001-exec-20260622150114`, commit `b18e4aa Restore static root layout`. Reviewer verified scope, diff, `npm run type-check`, `npx vitest run --exclude "tests/otp/**"` with a shell-only dummy `DATABASE_URL`, and layout string checks. Manual `npm run build` with a real database remains before marking DONE. |
| [002 - Replace notification poll with SSE](002-replace-notification-poll-with-sse.md) | PENDING MANUAL SMOKE | Executor completed in isolated worktree `khunglongshop-plan002-exec` on branch `codex-plan-002-exec-20260622154807`, commit `d78e7be Replace notification polling with SSE`. Reviewer verified scope, diff, `npm run type-check`, `npx vitest run --exclude "tests/otp/**"` with a shell-only dummy `DATABASE_URL`, no `setInterval` in `hooks/useNotifications.ts`, and `EventSource("/api/notifications/stream")` in place. Manual authenticated smoke test remains before marking DONE. |
| [003 - Replace profile in-memory counts](003-replace-profile-in-memory-counts.md) | PENDING MANUAL SMOKE | Executor completed in isolated worktree `khunglongshop-plan003-exec-main` on branch `codex-plan-003-exec-20260622181532`, commit `3ddf751 Replace profile history scans with bounded counts`. Reviewer verified scope, diff, `npm run db:generate`, `npm run type-check`, `npx vitest run --exclude "tests/otp/**"` with a shell-only dummy `DATABASE_URL`, and string checks for `customer_order.count` plus `redemptionCode.groupBy`. Manual profile smoke test remains before marking DONE. |
| [004 - Paginate collection and codes](004-paginate-collection-and-codes.md) | PENDING MANUAL SMOKE | Executor completed in isolated worktree `khunglongshop-plan004-exec` on branch `codex-plan-004-exec-20260624123204`, commits `8d65f59 Paginate merch collection endpoints` and `12b36f0 Harden merch pagination parsing`. Reviewer verified scope, diff, `npm run db:generate`, `npm run type-check`, `npx vitest run --exclude "tests/otp/**"` with a shell-only dummy `DATABASE_URL`, pagination string checks, and `git diff --check`. Manual authenticated endpoint/page smoke remains before marking DONE. |

## Next Action

For plan 001, manually apply/review commit `b18e4aa` from worktree `khunglongshop-plan001-exec`, then run `npm run type-check`, `npx vitest run --exclude "tests/otp/**"`, and `npm run build` in the main checkout with the real `DATABASE_URL`. Confirm `/` is Static/ISR before marking DONE.

For plan 002, manually apply/review commit `d78e7be` from worktree `khunglongshop-plan002-exec`, then log in and verify the notification bell receives unread-count updates without the old 30-second client polling loop.

For plan 003, manually apply/review commit `3ddf751` from worktree `khunglongshop-plan003-exec-main`, then log in as a user with orders and redeemed collection items. Confirm the account profile stats still match previous behavior and inspect Prisma/database logs to verify the request uses count/grouped queries instead of full history transfers.

For plan 004, manually apply/review commits `8d65f59` and `12b36f0` from worktree `khunglongshop-plan004-exec`, then log in and verify `/account/collection` loads the first page, `Tải thêm` appears when more than 10 sets exist, and `GET /api/merch/my-codes?page=1&limit=5` plus `GET /api/merch/my-collection?page=1&limit=5` return pagination envelopes with bounded result lengths.
