# Improve Plan Index

| Plan | Status | Notes |
|---|---|---|
| [001 - Remove root-layout force-dynamic](001-remove-root-force-dynamic.md) | PENDING MANUAL BUILD | Executor completed in isolated worktree `D:\Đảo khủng long shop\khunglongshop-plan001-exec` on branch `codex-plan-001-exec-20260622150114`, commit `b18e4aa Restore static root layout`. Reviewer verified scope, diff, `npm run type-check`, `npx vitest run --exclude "tests/otp/**"` with a shell-only dummy `DATABASE_URL`, and layout string checks. Manual `npm run build` with a real database remains before marking DONE. |
| [002 - Replace notification poll with SSE](002-replace-notification-poll-with-sse.md) | TODO | Not executed. |
| [003 - Replace profile in-memory counts](003-replace-profile-in-memory-counts.md) | TODO | Not executed. |

## Next Action

For plan 001, manually apply/review commit `b18e4aa` from `D:\Đảo khủng long shop\khunglongshop-plan001-exec`, then run `npm run type-check`, `npx vitest run --exclude "tests/otp/**"`, and `npm run build` in the main checkout with the real `DATABASE_URL`. Confirm `/` is Static/ISR before marking DONE.
