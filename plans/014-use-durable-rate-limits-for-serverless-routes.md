# Plan 014: Replace process-local abuse limits with a durable serverless limiter

> **Executor instructions**: Follow this plan exactly. Run each verification gate. If a STOP condition occurs, stop and report; do not choose an external vendor or schema design on your own.
>
> **Drift check (run first)**: `git diff --stat 4370999..HEAD -- utils/authOptions.ts utils/validation.ts lib/rateLimit.ts app/api/register/route.ts app/api/game/redeem/route.ts app/api/orders/route.ts app/api/merch/redeem-code/route.ts prisma/schema.prisma tests`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security, correctness
- **Planned at**: commit `4370999`, 2026-07-14

## Why this matters

Login, registration, game redemption, checkout, and redemption-code protection currently rely partly on mutable `Map` objects in process memory. Vercel serverless instances do not share that memory and can be replaced at any time, so the effective limit varies with instance count and cold starts. Two limiters also never evict unique keys, which creates an avoidable memory-growth path on long-lived development or self-hosted processes.

## Current state

- `utils/authOptions.ts:11-30` uses `loginBuckets = new Map` to limit credential attempts by email.
- `utils/validation.ts:56-74` uses another in-memory map; `app/api/register/route.ts:46-50` uses it for registration.
- `lib/rateLimit.ts:8-42` explicitly documents that its in-memory store is not shared across replicas. It is used by account mutations such as checkout/redemption.
- `app/api/game/redeem/route.ts:4-29` declares a third local limiter with no cleanup and uses it at lines 38-42.
- OTP is different: `lib/otp/otpService.ts:188-313` persists its reservation and window events through Prisma; preserve its behavior.
- Existing test style: `tests/unit/rateLimit.test.ts` tests the helper directly; `tests/unit/redemptionCodeSpecWiring.test.ts` performs route wiring checks.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Generate Prisma client if schema changes | `npm run db:generate` | Exit 0 |
| Typecheck | `npm run type-check` | Exit 0 |
| Focused tests | `npx vitest run tests/unit/rateLimit.test.ts tests/unit/redemptionCodeSpecWiring.test.ts` | All pass |
| Non-DB regression suite | `npx vitest run --exclude "tests/otp/**"` | All pass |
| Scope review | `git diff --check` | No output |

## Scope

**In scope**:

- `utils/authOptions.ts`
- `utils/validation.ts`
- `lib/rateLimit.ts`
- `app/api/register/route.ts`
- `app/api/game/redeem/route.ts`
- Current callers of `isRateLimited` found by `rg -n "isRateLimited|checkRateLimit" app lib utils`
- `prisma/schema.prisma` and a new reviewed migration only if the selected durable backend is TiDB
- Relevant tests under `tests/unit/`
- `.env.example` only if a selected provider needs an environment-variable name

**Out of scope**:

- OTP persistence/rate-limit semantics in `lib/otp/otpService.ts`.
- Password policy, NextAuth session duration, or product/business authorization rules.
- Changing the game API authentication contract (`x-game-api-key`).
- Adding global rate limits to every read-only catalog endpoint.

## Decision gate

Before implementation, the operator must choose one backend:

1. **Managed Redis/KV** with atomic increment + TTL, recommended for high-volume edge/serverless traffic.
2. **TiDB-backed limiter** using an append-only, TTL-cleaned event model or another atomic SQL design, recommended only when no managed KV is available and expected traffic is modest.

Record the selected backend, its failure policy, and its environment-variable names in the pull request. For credentials/session endpoints use **fail closed** when the limiter is unavailable; for checkout, decide explicitly whether availability or strict abuse control wins. Do not silently fall back to a local `Map` in production.

## Steps

### Step 1: Characterize existing limits and call sites

List every `isRateLimited` and `checkRateLimit` call. Capture for each one: route/action, key composition, maximum attempts, window, and current expected status code. Create a focused table in the pull request description, not a runtime endpoint.

**Verify**: `rg -n "isRateLimited|checkRateLimit" app lib utils` has no unclassified production call site.

### Step 2: Add one durable limiter interface

Create a single server-only module in `lib/` with a small typed contract, for example a function returning `{ limited, retryAfterSeconds }`. It must accept a named policy, an already-normalized key, a max count, and a window. Keep provider-specific code behind that module.

For the selected provider, use its atomic increment/TTL primitive or a TiDB transaction that cannot allow concurrent calls to exceed the policy. Never implement the final logic as read-count-then-write without concurrency control.

**Verify**: a new unit test proves that two concurrent attempts around the limit cannot both be allowed; `npm run type-check` exits 0.

### Step 3: Migrate the credential and registration paths

Replace `loginBuckets` in `utils/authOptions.ts` and `commonValidations.rateLimit` in `utils/validation.ts` with the shared limiter. Normalize email keys consistently and use a privacy-preserving keyed hash if keys are sent to an external provider. Replace `app/api/register/route.ts` with the same service; keep its current 429 response contract.

Remove obsolete local-map helpers only after all callers move.

**Verify**: tests cover limit reached, window expiry, and two distinct email/IP identities. `rg -n "loginBuckets|commonValidations\.rateLimit|checkRateLimit" utils app/api/register` returns no live production use.

### Step 4: Migrate financial and game mutation paths

Replace the local map in `app/api/game/redeem/route.ts` and every `lib/rateLimit.ts` caller with the shared limiter. Preserve existing authenticated identities when available; do not make a user-controlled body field the sole rate-limit key. Keep checkout idempotency as a separate guarantee.

**Verify**: `rg -n "new Map<string, RateBucket>|const rateBuckets|const loginBuckets" app lib utils` returns no production limiter implementation; focused route tests preserve 429 behavior.

### Step 5: Configure deployment and observability

Add placeholder-only environment variable documentation if the chosen backend needs it. Add structured server logs or metrics for backend-unavailable, limited, and allowed outcomes without logging full emails, authorization values, OTPs, or game keys.

**Verify**: a Preview deployment with the provider configured returns 429 after the chosen threshold, and logs contain no credential/PII values beyond approved opaque identifiers.

## Test plan

- Unit-test the common limiter: first request allowed, boundary request allowed, next request limited, expiry resets, concurrent boundary behavior, unavailable backend behavior.
- Add wiring tests for login, registration, game redemption, checkout, and redemption code callers.
- Manually verify a Vercel Preview invocation across at least two cold starts/instances if the platform exposes them.

## Done criteria

- [ ] No production endpoint uses a process-local `Map` as its only rate-limit authority.
- [ ] One typed limiter interface owns policy enforcement.
- [ ] Login, registration, game redemption, checkout, and code redemption use named durable policies.
- [ ] The selected failure policy is documented and tested.
- [ ] `npm run db:generate` passes if a schema migration was added.
- [ ] `npm run type-check` passes.
- [ ] `npx vitest run --exclude "tests/otp/**"` passes.
- [ ] `git diff --check` has no output.

## STOP conditions

- Stop if the operator has not selected KV versus TiDB; this decision changes durability, cost, and failure behavior.
- Stop if a TiDB transaction cannot provide atomic enforcement at the desired contention level; do not ship a check-then-insert limiter.
- Stop if any migration would delete production data or requires copying a secret into a tracked file.

## Maintenance notes

All future mutation routes should declare a named policy at the boundary. Keep policy thresholds in one server-only configuration location and review them as product/security decisions, not scattered numeric literals.
