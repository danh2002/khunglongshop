# Plan 019: Add an expiring VietQR payment flow with safe renewal and manual confirmation

> **Executor instructions**: Follow this plan step by step. Run every verification
> command and confirm the expected result before moving on. If a STOP condition
> occurs, stop and report it; do not improvise. When done, update this plan's row
> in `plans/README.md` unless a reviewer says they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat adc2b26..HEAD -- prisma app/api/orders app/api/account/orders app/api/admin/orders app/api/cron app/'(public)'/order-confirmation components lib tests/unit .env.example README.md vercel.json`
> If an in-scope file changed, compare the current-state excerpts below with the
> live code. A material mismatch is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L (multi-day, including migration review and payment race tests)
- **Risk**: HIGH (money state, inventory reservation, and concurrent expiry/confirmation)
- **Depends on**: none; coordinate with plan 005 if its pending migration has not been applied
- **Category**: direction / migration
- **Planned at**: commit `adc2b26`, 2026-08-06
- **Implementation status**: IMPLEMENTED; pending migration apply, database-backed build, and authenticated staging smoke tests

## Why this matters

Checkout currently reserves inventory and creates a `PENDING_PAYMENT` order, but
the confirmation page immediately tells the customer that fulfillment is being
prepared. There is no transfer reference, QR, payment deadline, authoritative
expiry, or atomic payment confirmation. This plan adds a five-minute VietQR
window, a customer countdown backed by server time, authenticated polling,
automatic expiry with inventory release, safe QR renewal, and an auditable manual
admin confirmation path.

VietQR Quick Link generates the payment image but does not itself prove payment.
The initial release therefore uses admin confirmation plus customer polling. A
provider webhook is deliberately deferred until the business chooses a bank/payOS/
Casso provider and supplies its signed webhook contract.

## Product decisions fixed by this plan

1. Keep the deployed Prisma status names: `PENDING_PAYMENT`, `PROCESSING`,
   `COMPLETED`, `CANCELLED`. `PENDING_PAYMENT` already means the proposed
   `AWAITING_PAYMENT`; adding both would create two indistinguishable states.
   Adding `SHIPPED` and `DELIVERED` or replacing `COMPLETED` is a separate order-
   fulfillment migration and is out of scope.
2. A new order is `PENDING_PAYMENT`. Manual confirmation atomically sets
   `paidAt` and moves it to `PROCESSING`.
3. The deadline is authoritative on the server. The browser countdown is only a
   display and polling trigger.
4. Expiry moves the order to `CANCELLED` and uses the existing cancellation
   invariants to restore stock and void blind-box allocations.
5. “Tạo mã QR mới” reuses the same cancelled order only if inventory can be
   reserved again. It issues a new reference and five-minute deadline. Failure
   leaves the order cancelled.
6. A late transfer with an obsolete reference is not auto-applied. Admins must
   reconcile it manually. Do not silently credit it to the renewed reference.

## Current state

- `prisma/schema.prisma:28-33` defines `PENDING_PAYMENT`, `PROCESSING`,
  `COMPLETED`, and `CANCELLED`; there is no payment metadata.
- `prisma/schema.prisma:281-313` defines `Customer_order`; `status` defaults to
  `PENDING_PAYMENT`, and checkout idempotency is unique per user.
- `app/api/orders/route.ts:246-284` creates the order and decrements inventory
  in one repeatable-read transaction. `loadOrderResponse` does not return payment
  data.
- `app/(public)/checkout/page.tsx:489-548` posts to `/api/orders`, clears the cart,
  then routes to `/order-confirmation/<id>`.
- `app/(public)/order-confirmation/[id]/page.tsx` is ownership-protected but says
  the order is already being prepared; it must become the payment surface.
- `lib/orderCancellation.ts:16-91` cancels in a transaction, voids allocations,
  restores stock, and sets `CANCELLED`. Its final update is not currently a
  compare-and-set, so it must be hardened before payment expiry races are added.
- `lib/orderRestoration.ts` already demonstrates safe stock re-reservation and
  blind-box restoration for admins. Customer payment renewal must share/extract
  those invariants rather than call the admin function or duplicate them.
- `app/api/admin/orders/[id]/status/route.ts` validates status transitions but
  does not set `paidAt` and performs its read/update without a transaction.
- `app/api/cron/otp-cleanup/route.ts` is the repository pattern for a
  `CRON_SECRET`-protected Vercel maintenance route.
- Tests use Vitest. `tests/unit/orderCancellation.test.ts` (if present at
  execution time), `tests/unit/orderRestoration.test.ts`,
  `tests/unit/orderTransitions.test.ts`, and `tests/unit/orderValidation.test.ts`
  are the closest patterns. Prefer behavior tests with mocked Prisma over source-
  string assertions for new payment rules.
- `AGENTS.md` requires integer VND, Vietnamese UI, App Router APIs, Prisma
  generation after schema edits, and reviewed TiDB-compatible SQL. The legacy
  `server/` tree is not production and must not be changed.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Generate client | `npm run db:generate` | exit 0 |
| Typecheck | `npm run type-check` | exit 0, no TypeScript errors |
| Focused tests | `npx vitest run tests/unit/payment*.test.ts tests/unit/orderCancellation.test.ts tests/unit/orderRestoration.test.ts tests/unit/orderTransitions.test.ts tests/unit/orderValidation.test.ts` | all selected tests pass |
| Non-DB suite | `npx vitest run --exclude "tests/otp/**"` | all tests pass |
| Diff hygiene | `git diff --check` | no output, exit 0 |
| Build | `npm run build` | exit 0 with an approved reachable database |

Do not run `npm run db:push`. Generate and review migration SQL locally, then use
the team's approved TiDB procedure against non-production before production.

## Scope

**In scope** (exact names may be created where noted):

- `prisma/schema.prisma`
- `prisma/migrations/20260806000000_add_bank_qr_payment/migration.sql` (create)
- `.env.example`, `README.md`, `vercel.json` (create `vercel.json` only if absent)
- `lib/payment.ts`, `lib/paymentExpiry.ts`, `lib/orderInventory.ts` (create)
- `lib/orderCancellation.ts`, `lib/orderRestoration.ts`, `lib/orderTransitions.ts`
- `app/api/orders/route.ts`
- `app/api/account/orders/[id]/payment/route.ts` (create: poll/status)
- `app/api/account/orders/[id]/payment/renew/route.ts` (create)
- `app/api/admin/orders/[id]/payment/confirm/route.ts` (create)
- `app/api/cron/payment-expiry/route.ts` (create)
- `app/(public)/order-confirmation/[id]/page.tsx`
- `components/PaymentQrPanel.tsx` (create)
- `components/admin/OrderStatusForm.tsx`
- `app/(dashboard)/admin/orders/[id]/page.tsx`
- `tests/unit/payment*.test.ts` (create) and directly affected order tests

**Out of scope**:

- `server/**` (legacy Express runtime)
- renaming `PENDING_PAYMENT` to `AWAITING_PAYMENT`
- adding `SHIPPED` or `DELIVERED`, or replacing `COMPLETED`
- an unauthenticated or unsigned webhook
- automatic provider reconciliation, refunds, partial/over-payments, and payment
  attempt history
- storing generated QR image bytes or secrets in the database
- exposing blind-box results before the existing business rule allows it

## Git workflow

- Branch: `advisor/019-bank-qr-payment-countdown`
- Use conventional commits consistent with `adc2b26`, for example
  `feat(payments): add expiring VietQR checkout flow`.
- Do not push, deploy, apply production SQL, or open a PR unless instructed.

## Steps

### Step 1: Add payment metadata and reviewed TiDB migration SQL

Add nullable fields to `Customer_order`:

```prisma
paymentRef       String?   @unique @db.VarChar(25)
paymentExpiresAt DateTime?
paidAt           DateTime?
paymentExpiredAt DateTime?
```

Also add `@@index([status, paymentExpiresAt])` for the expiry sweep and
`@@index([status, paymentExpiredAt])` for renewal eligibility queries, so
filtering `status = CANCELLED AND paymentExpiredAt IS NOT NULL` does not
full-scan the orders table. Keep the existing status enum unchanged. The
25-character bound matches VietQR's current `addInfo` constraint and forces
compact references.

`paymentExpiredAt` distinguishes an automatic timeout from customer/admin
cancellation, making customer renewal authorization deterministic.

Create explicit SQL that adds the four nullable columns, unique index on
`paymentRef`, and composite expiry index. Include both composite indexes in the
same migration. Do not backfill historical orders.
Verify the SQL syntax and index-name lengths against TiDB/MySQL. If plan 005's
`005_order_number_status` migration is not applied in the target database, STOP
and establish the actual migration baseline before applying this migration.

**Verify**: `npm run db:generate && npm run type-check` -> both exit 0.

### Step 2: Centralize payment reference, configuration, and QR construction

Create `lib/payment.ts` with pure, unit-tested helpers and constants:

- `PAYMENT_WINDOW_MS = 5 * 60 * 1000`.
- Validate server-only env vars `VIETQR_BANK_ID`, `VIETQR_ACCOUNT_NO`,
  `VIETQR_ACCOUNT_NAME`, and optional `VIETQR_TEMPLATE` (default `compact2`).
  Return a controlled configuration error; never log values.
- Generate a collision-resistant uppercase alphanumeric reference no longer than
  25 characters, prefixed `KLS-`. Do not derive it solely from a truncated order
  UUID. Retry Prisma unique conflicts up to **3 times**; on the third failure
  throw a typed error `PAYMENT_REF_EXHAUSTED` and let the checkout respond 500
  without creating a partial order.
- Build the official Quick Link with `URL`/`URLSearchParams`, integer `amount`,
  exact `paymentRef` in `addInfo`, and account name. Never concatenate raw query
  strings. Return the URL only from authenticated, ownership-checked APIs/pages.
- Add a response serializer containing only `orderId`, `status`, `total`,
  `paymentRef`, `paymentExpiresAt`, `paidAt`, `serverNow`, and `qrImageUrl` while
  pending. Do not return Prisma records wholesale.

Document env names (placeholders only) in `.env.example` and README. The official
Quick Link format is documented at `https://vietqr.io/danh-sach-api/link-tao-ma-nhanh/`.
Use a normal `<img>` for this fixed external QR URL so no arbitrary Next Image
host is added.

**Verify**: `npx vitest run tests/unit/paymentHelpers.test.ts` -> helper tests pass
for length/charset, URL encoding, integer amount, missing config, and no accidental
secret/config logging.

### Step 3: Issue the first payment window atomically at checkout

In `app/api/orders/route.ts`, generate `paymentRef` and `paymentExpiresAt` inside
the existing transaction when creating a new order. Persist them with status
`PENDING_PAYMENT`; leave `paidAt` null. Extend `loadOrderResponse` to return the
payment DTO and `serverNow` for both 201 creation and 200 idempotent replay.

An idempotent replay must return the existing reference/deadline, never extend the
window or create a second reference. If an old order matched by the same
idempotency key lacks payment metadata, return a stable conflict such as
`PAYMENT_SESSION_UNAVAILABLE`; do not silently mutate it.

**Verify**: `npx vitest run tests/unit/paymentCheckout.test.ts tests/unit/orderValidation.test.ts` -> tests prove initial issuance, five-minute deadline (fake clock), collision retry, stable idempotent replay, and no extension on replay.

### Step 4: Make confirmation and expiry mutually exclusive

First harden `lib/orderCancellation.ts`: accept an optional expected status and
reason/source metadata, and make the final status write an `updateMany` compare-
and-set whose predicate includes `status: PENDING_PAYMENT` and `paidAt: null` for
payment expiry. If the count is zero, throw a typed conflict so the transaction
rolls back all inventory/allocation changes. Preserve existing customer/admin
cancellation behavior and audit logging.

Create `lib/paymentExpiry.ts`:

- `expirePaymentOrder(orderId, now)` cancels only when status is
  `PENDING_PAYMENT`, `paidAt` is null, and `paymentExpiresAt <= now`; the same
  transaction records `paymentExpiredAt: now`.
- `expireDuePaymentOrders(now, batchSize)` selects a bounded batch ordered by
  expiry and calls the safe single-order operation. It reports counts without PII.
- Re-running either function is idempotent.

Create the admin-only confirm route. In a repeatable-read transaction, perform a
compare-and-set from an unexpired `PENDING_PAYMENT` order with `paidAt: null` to
`PROCESSING` with one shared `now` assigned to `paidAt`. Record an
`AdminAuditLog` with order id, reference, prior/next status, and timestamp. Never
accept amount, reference, or paid timestamp from the browser as authoritative.
Return 409 for expired/already-cancelled/already-paid races; an identical retry on
an already-paid order may return 200 with the existing state but must not create a
second audit record.

Keep the generic admin status endpoint from moving an unpaid/expired order to
`PROCESSING`; direct it to the confirm-payment endpoint instead.

**Verify**: `npx vitest run tests/unit/paymentConcurrency.test.ts tests/unit/orderCancellation.test.ts tests/unit/orderTransitions.test.ts` -> tests cover confirm-wins, expiry-wins, retry idempotency, stock restored exactly once, and audit created exactly once.

### Step 5: Add authenticated polling and lazy expiry

Create `GET /api/account/orders/[id]/payment`. Require the current session and use
the same ownership predicate as the account order API. If the order is due, call
the idempotent expiry service, reload it, then return the narrow payment DTO with
`Cache-Control: no-store`. Return 404 rather than leaking another user's order.
Rate-limit polling sensibly without blocking a normal five-second interval.

The endpoint must never accept status from the client and must never reveal other
orders, bank configuration for non-pending orders, or blind-box allocations.

**Verify**: `npx vitest run tests/unit/paymentStatusApi.test.ts` -> tests cover 401,
ownership-safe 404, pending, paid, expired lazy cancellation, and no-store header.

### Step 6: Add safe customer renewal of an expired QR

Extract `reserveInventoryForItems(items: OrderItem[], tx: PrismaTransaction):
Promise<void>` as a named export from `lib/orderInventory.ts` (create). Both
`lib/orderRestoration.ts` and the renewal handler must import and call this
shared function; neither may inline its own stock-update loop. The function
must throw a typed `INSUFFICIENT_STOCK` error on any line that cannot be
decremented, causing the caller's transaction to roll back atomically.

Create authenticated
`POST /api/account/orders/[id]/payment/renew` with ownership checks. In one
repeatable-read transaction:

- require `CANCELLED`, `paidAt: null`, and non-null `paymentExpiredAt`;
- reserve current inventory with conditional updates;
- restore valid voided allocations/codes using existing restoration invariants;
- generate a new unique reference and deadline from one server `now`;
- compare-and-set the order back to `PENDING_PAYMENT`, set
  `paymentExpiredAt: null`, and leave `paidAt` null.

Return 409 `INSUFFICIENT_STOCK` without partial writes. Concurrent renewal calls
must yield one success and one idempotent/conflict response, with inventory
decremented once. Do not allow renewal of an admin- or customer-cancelled order
merely because its status is `CANCELLED`; `paymentExpiredAt` is the authoritative
eligibility marker.

Record an `AdminAuditLog` entry on every successful renewal: `action:
"QR_RENEWED"`, `entityType: "Customer_order"`, `entityId: orderId`,
`metadata: { oldRef, newRef, newExpiresAt }`. Write it inside the same
transaction so a rolled-back renewal never produces a stale log entry. Tests
must assert the log is created on success and absent on rollback.

**Verify**: `npx vitest run tests/unit/paymentRenewal.test.ts tests/unit/orderRestoration.test.ts` -> tests cover ownership, only-expired eligibility, new reference/deadline, insufficient stock rollback, allocation restoration, and concurrent double-submit.

### Step 7: Build the QR/countdown UI and polling state machine

Replace the misleading fulfillment copy in the server confirmation page. Render a
new client `PaymentQrPanel` only for an active pending payment, passing serialized
payment data (never a Prisma object). The component must:

- show the QR, exact integer-VND total, bank/account name, copyable reference, and
  Vietnamese instructions;
- calculate remaining time using the formula
  `remainingMs = (paymentExpiresAt − serverNow) − (Date.now() − clientLoadTime)`
  where `clientLoadTime = Date.now()` is captured once when the component first
  renders the payload; update at one-second intervals and clean up timers on
  unmount;
- poll the authenticated payment endpoint every five seconds while visible and
  pending, with no overlapping requests and `AbortController` cleanup;
- switch to success when `paidAt`/`PROCESSING` arrives, stop all timers/polls, and
  provide a link to the account order;
- switch to expired/cancelled at zero or authoritative API response, stop polling,
  and show “Tạo mã QR mới”; disable it during renewal and render stock/conflict
  errors without losing the order page;
- handle QR image failure with textual bank transfer instructions;
- meet keyboard focus, alt text, readable contrast, and reduced-motion needs.

Do not trust the local timer to cancel the order; immediately fetch authoritative
status at zero. Do not call `router.refresh()` on every poll.

**Verify**: `npx vitest run tests/unit/paymentQrPanel.test.tsx` -> fake-timer tests
cover countdown, clock offset, paid transition, expiry, renewal, cleanup, no
overlap, and image fallback.

### Step 8: Schedule bounded expiry cleanup

Create `GET /api/cron/payment-expiry` matching the existing bearer
`CRON_SECRET` pattern and calling `expireDuePaymentOrders` with a bounded batch.
Add a Vercel Cron entry (for example every minute) without removing existing
cron configuration. Because Vercel Cron timing is not exact, lazy expiry in the
poll endpoint remains required.

Use structured counts only; do not log names, emails, phone numbers, account
numbers, or refs. A failed order must not prevent the whole batch from reporting
the failure count, but transaction conflicts must not be swallowed silently.

**Verify**: `npx vitest run tests/unit/paymentExpiryCron.test.ts` -> tests cover bad
secret, bounded selection, partial batch failure reporting, and idempotent rerun.

### Step 9: Run full verification and manual staging checks

Run generation, typecheck, focused tests, full non-OTP tests, and diff checks.
Apply the reviewed migration only to an approved non-production TiDB database,
then build. On staging, create a disposable normal-product order and verify QR
scan values, countdown, manual admin confirmation, polling success, expiry stock
restoration, and renewal. Repeat expiry/renewal with a blind-box order and verify
allocations are restored without exposing results.

**Verify**:

```powershell
npm run db:generate
npm run type-check
npx vitest run --exclude "tests/otp/**"
git diff --check
npm run build
```

Expected: every command exits 0. Build requires an approved reachable database.

## Test plan

At minimum, add these behavior suites:

- `paymentHelpers.test.ts`: config validation, ref constraints/collisions, URL encoding.
- `paymentCheckout.test.ts`: issuance and idempotent replay.
- `paymentConcurrency.test.ts`: payment/expiry compare-and-set races.
- `paymentStatusApi.test.ts`: auth, ownership, lazy expiry, response minimization.
- `paymentRenewal.test.ts`: eligibility, inventory rollback, concurrency.
- `paymentQrPanel.test.tsx`: fake-clock UI and request cleanup.
- `paymentExpiryCron.test.ts`: cron auth, batching, idempotency.

Retain and update all order cancellation/restoration/transition tests. No test may
make a real VietQR request or depend on wall-clock timing.

## Done criteria

- [ ] Migration adds nullable payment metadata (including the expiry-cause marker), unique reference, and expiry index; historical rows remain valid.
- [ ] New checkout returns one stable five-minute payment session across idempotent replay.
- [ ] QR includes exact VND amount and reference using encoded official Quick Link parameters.
- [ ] Confirmation and expiry are compare-and-set operations; race tests prove stock changes at most once.
- [ ] Customer polling is authenticated, ownership-safe, narrow, and `no-store`.
- [ ] Expiry cancels and restores inventory/allocations; renewal safely reserves them again with a new ref.
- [ ] Countdown/polling stops on success, expiry, and unmount.
- [ ] Generic admin status changes cannot mark an unpaid order processing.
- [ ] `npm run db:generate`, `npm run type-check`, full non-OTP tests, `git diff --check`, and approved-database build pass.
- [ ] No files outside Scope changed, except `package-lock.json` only if an explicitly approved dependency became necessary.
- [ ] `plans/README.md` row is updated.

## STOP conditions

Stop and report rather than improvising if:

- Product explicitly requires the enum names `AWAITING_PAYMENT`, `SHIPPED`, or
  `DELIVERED`; that is a broader data/UI/API migration than this payment feature.
- Automatic confirmation is required but no provider, signature scheme, replay
  rules, and example payload are supplied.
- The target database has not applied prerequisite order migrations or TiDB
  rejects reviewed DDL.
- Product rejects the `paymentExpiredAt` marker but still requires same-order
  renewal; cancellation reason cannot then be inferred safely.
- Existing cancellation/restoration invariants differ from the excerpts or tests
  expose stock/allocation behavior not represented here.
- A verification command fails twice after a reasonable correction.
- Production credentials or a production migration/deploy would be required.

## Maintenance notes

- A future signed webhook must call the same atomic confirmation service as the
  admin route and add provider event idempotency; it must not write status directly.
- If multiple QR attempts or late-payment reconciliation become common, replace
  mutable payment fields with an `OrderPaymentAttempt` table retaining every ref.
- Five-minute inventory reservation is aggressive for real bank-app switching;
  measure expiry/renewal rates and make the duration configurable only after the
  product owner confirms the operational trade-off.
- Reviewers should focus on compare-and-set predicates, transaction rollback,
  ownership filters, obsolete-reference handling, and timer/fetch cleanup.
- Vercel Hobby plan enforces a minimum cron interval of once per day; on Hobby
  the scheduled `payment-expiry` cron will not fire every minute. Lazy expiry
  inside the polling endpoint (`Step 5`) is therefore the primary expiry path
  on Hobby deployments. Document the plan tier in `README.md` and upgrade to
  Pro or add a separate keep-alive if sub-minute expiry accuracy is required.
