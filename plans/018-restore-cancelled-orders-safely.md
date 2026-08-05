# Plan 018: Restore cancelled orders safely to pending payment

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer says they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 37dbfa9..HEAD -- lib/orderCancellation.ts lib/orderTransitions.ts lib/orderRestoration.ts components/admin/OrderStatusForm.tsx app/api/admin/orders/[id]/cancel/route.ts app/api/admin/orders/[id]/status/route.ts app/api/admin/orders/[id]/restore/route.ts tests/unit/orderRestoration.test.ts tests/unit/adminOrderRestoreApi.test.ts tests/unit/orderTransitions.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding. Stop if
> the cancellation semantics or order data model no longer match this plan.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: HIGH
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `37dbfa9`, 2026-08-05

## Why this matters

Administrators currently cannot recover an accidentally cancelled order because
`CANCELLED` is terminal in both the server transition policy and the admin UI.
Cancellation is not merely a label change: it returns product stock and voids
blind-box allocations and active redemption codes. Restoration must therefore
reserve stock and reactivate the original blind-box records in one transaction,
or fail without changing anything. The approved product rule is to restore only
to `PENDING_PAYMENT`; administrators must confirm payment separately before the
order can become `PROCESSING`.

## Current state

- `lib/orderTransitions.ts:3-11` defines ordinary status transitions. Its
  relevant current entry is `CANCELLED: []`.
- `components/admin/OrderStatusForm.tsx:9-13` duplicates that transition map,
  also with `CANCELLED: []`. Lines 58-59 send cancellation to the dedicated
  `/cancel` endpoint and all other changes to `/status`.
- `app/(dashboard)/admin/orders/[id]/page.tsx:75` renders
  `OrderStatusForm`. The order list at `/admin/orders` links to this detail
  page, so restoration should use the existing detail-page status workflow.
- `app/api/admin/orders/[id]/status/route.ts:36-67` validates ordinary
  transitions and then directly updates `Customer_order.status`. Do not route
  restoration through that direct update because it has no inventory or
  blind-box side effects.
- `app/api/admin/orders/[id]/cancel/route.ts` is the endpoint exemplar: it
  calls `requireAdminApi`, delegates domain work to `cancelOrder`, maps typed
  domain errors to stable API errors, and supports `PATCH` and `POST`.
- `lib/orderCancellation.ts:22-88` runs at `RepeatableRead`. When cancelling,
  it changes active `BlindBoxAllocation` rows to `VOIDED`, sets `voidedAt`,
  changes active `RedemptionCode` rows to `CANCELLED`, increments each ordered
  product's `inStock`, changes the order to `CANCELLED`, and writes an
  `AdminAuditLog` action named `ORDER_CANCELLED`.
- Admin cancellation currently permits an order that already has a `REDEEMED`
  code. Cancellation leaves that code redeemed while voiding its allocation.
  Such an order must not be restored automatically.
- Relevant schema facts from `prisma/schema.prisma`:

  ```prisma
  enum RedemptionCodeStatus { ACTIVE REDEEMED DISABLED CANCELLED }
  enum OrderStatus { PENDING_PAYMENT PROCESSING COMPLETED CANCELLED }
  enum BlindBoxAllocationStatus { ACTIVE VOIDED }

  model BlindBoxAllocation {
    orderId        String
    orderItemId    String
    unitIndex      Int
    status         BlindBoxAllocationStatus @default(ACTIVE)
    voidedAt       DateTime?
    redemptionCode RedemptionCode?
    @@unique([orderItemId, unitIndex])
  }

  model RedemptionCode {
    allocationId String? @unique
    orderId      String?
    status       RedemptionCodeStatus @default(ACTIVE)
    isUsed       Boolean @default(false)
    usedAt       DateTime?
  }

  model Customer_order {
    status              OrderStatus @default(PENDING_PAYMENT)
    products            customer_order_product[]
    redemptionCodes     RedemptionCode[]
    blindBoxAllocations BlindBoxAllocation[]
  }
  ```

- `tests/unit/adminUserApi.test.ts` is the repository's useful Vitest pattern
  for hoisted Prisma mocks, executing a mocked `$transaction` callback, testing
  API responses, and asserting `RepeatableRead`.
- `tests/integration/helpers/transaction.ts` provides `withRollback` for tests
  that have an explicitly configured non-production test database. Do not point
  it at production.
- `tests/unit/orderTransitions.test.ts:18` already verifies
  `CANCELLED -> PROCESSING` is forbidden; preserve and extend this invariant.
- No Prisma schema or migration change is required.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused tests | `npx vitest run tests/unit/orderRestoration.test.ts tests/unit/adminOrderRestoreApi.test.ts tests/unit/orderTransitions.test.ts` | exit 0; all named tests pass |
| Typecheck | `npm run type-check` | exit 0; no TypeScript errors |
| Test suite | `npx vitest run --exclude "tests/otp/**"` | exit 0; all non-OTP tests pass |
| Production build | `npm run build` | exit 0 with a reachable real database; expected route generation completes |
| Diff validation | `git diff --check` | exit 0; no whitespace errors |

The build reads real application data during route generation. If no approved
non-production/production-like database connection is available, do not invent
credentials or use a dummy URL; report the build as a manual verification gate.

## Suggested executor toolkit

- Use the `fix-bug` skill if it is available; this is a state-consistency bug.
- Read `lib/orderCancellation.ts` and
  `app/api/admin/orders/[id]/cancel/route.ts` in full before implementation so
  restoration remains the exact inverse of supported cancellation effects.

## Scope

**In scope** (the only source/test files you should modify or create):

- `lib/orderRestoration.ts` (create)
- `lib/orderTransitions.ts`
- `components/admin/OrderStatusForm.tsx`
- `app/api/admin/orders/[id]/restore/route.ts` (create)
- `tests/unit/orderRestoration.test.ts` (create)
- `tests/unit/adminOrderRestoreApi.test.ts` (create)
- `tests/unit/orderTransitions.test.ts`
- `plans/README.md` (status only after implementation)

**Read-only exemplars** (do not modify):

- `lib/orderCancellation.ts`
- `app/api/admin/orders/[id]/cancel/route.ts`
- `app/api/admin/orders/[id]/status/route.ts`
- `app/(dashboard)/admin/orders/[id]/page.tsx`
- `prisma/schema.prisma`
- `tests/unit/adminUserApi.test.ts`

**Out of scope**:

- Bulk restoration or an inline restore action in the `/admin/orders` table.
  Use its existing `Chi tiết` link and status form for this safety-sensitive
  action.
- Restoring directly to `PROCESSING` or `COMPLETED`.
- Re-drawing a blind box or issuing a replacement redemption code when the
  original allocation/code data is missing or inconsistent.
- Restoring an order with any `REDEEMED` or `DISABLED` redemption code.
- Changing cancellation behavior, public/customer APIs, schema, migrations,
  or historical production data.

## Git workflow

- Branch: `advisor/018-restore-cancelled-orders-safely`
- Use conventional commits, matching current history; suggested final message:
  `fix(orders): safely restore cancelled orders`
- Do not push or open a pull request unless the operator explicitly asks.

## Steps

### Step 1: Add a transactional order-restoration domain service

Create `lib/orderRestoration.ts` and export a typed
`OrderRestorationError` plus:

```ts
restoreCancelledOrder(input: {
  orderId: string;
  adminActorId: string;
}): Promise<Customer_order>
```

Follow the database import, typed error, and `RepeatableRead` transaction
patterns in `lib/orderCancellation.ts`. Within one transaction:

1. Load the order by `id`, including every order item with
   `product.isBlindBox`, its quantity/product ID, its blind-box allocations,
   and each allocation's redemption code. Also load order-level redemption
   codes so orphaned or historical rows are detectable.
2. Return `ORDER_NOT_FOUND` when absent. Require current status
   `CANCELLED`; otherwise throw `ORDER_NOT_CANCELLED`. Do not make a second
   request decrement stock again.
3. Reject the entire restoration with `ORDER_HAS_REDEEMED_CODE` if any
   order-linked code is `REDEEMED`, or `ORDER_HAS_DISABLED_CODE` if any is
   `DISABLED`.
4. Validate blind-box integrity before any write:
   - for each blind-box order item, allocation count equals item quantity;
   - every allocation is `VOIDED` and has non-null `voidedAt`;
   - every allocation has exactly its one linked redemption code, the code is
     linked to this order, and its status is `CANCELLED`;
   - a non-blind-box item has no blind-box allocations;
   - there are no extra order-level codes or allocations outside the item
     graph.
   Throw `ORDER_RESTORATION_DATA_INVALID` on any mismatch. Never create a new
   allocation, draw, or code during restoration.
5. Reserve inventory atomically for each item with a conditional update such
   as `product.updateMany({ where: { id: productId, inStock: { gte: quantity } }, data: { inStock: { decrement: quantity } } })`.
   Require `count === 1`; otherwise throw `INSUFFICIENT_STOCK`. Because all
   writes are in the transaction, any earlier decrement must roll back.
6. Reactivate only validated rows: allocations `VOIDED -> ACTIVE` with
   `voidedAt: null`, and linked codes `CANCELLED -> ACTIVE` with
   `isUsed: false` and `usedAt: null`. Use conditional `updateMany` calls and
   require updated counts to equal the validated record counts.
7. Change the order with a conditional update whose `where` includes
   `{ id: orderId, status: "CANCELLED" }`, setting only
   `status: "PENDING_PAYMENT"`. Require `count === 1`; otherwise throw a
   conflict so a concurrent request cannot reserve stock twice.
8. Write `AdminAuditLog` action `ORDER_RESTORED`, with `entityType: "ORDER"`,
   the order ID, actor ID, and metadata containing old/new status and counts of
   restored inventory lines, allocations, and codes. Do not log redemption
   code values or customer PII.
9. Return the refreshed order.

Use explicit error codes for all expected conflicts so the endpoint can map
them without parsing messages. If Prisma raises a write conflict such as
`P2034`, translate it into a stable restoration conflict or retry the whole
transaction using an existing repository helper if one safely fits; never
retry only part of the mutation.

**Verify**:
`npx vitest run tests/unit/orderRestoration.test.ts` → exit 0 after Step 4 adds
the focused tests; until then run `npm run type-check` → exit 0.

### Step 2: Add the admin-only restore endpoint

Create `app/api/admin/orders/[id]/restore/route.ts`, modeled on the sibling
`cancel/route.ts`:

- Require `requireAdminApi()` and use its actor ID.
- Accept `PATCH`; optionally export `POST = PATCH` only to match the cancellation
  route convention.
- Call `restoreCancelledOrder({ orderId, adminActorId })` with no client-supplied
  target status.
- Return the restored order/status on success.
- Map `ORDER_NOT_FOUND` to 404. Map not-cancelled, insufficient-stock,
  redeemed/disabled-code, invalid-data, and concurrency conflicts to 409 with
  stable `error.code` values and actionable Vietnamese admin messages.
- Keep unexpected failures as the existing generic 500 admin error shape; do
  not leak stack traces, stock counts, codes, or customer data.

Do not modify `app/api/admin/orders/[id]/status/route.ts`: the generic status
endpoint must never perform a direct `CANCELLED -> PENDING_PAYMENT` update.

**Verify**:
`npx vitest run tests/unit/adminOrderRestoreApi.test.ts` → exit 0 and endpoint
auth/error mapping tests pass.

### Step 3: Expose only the safe restore transition in the admin UI

Update `lib/orderTransitions.ts` without turning restoration into an ordinary
direct status transition. Keep `ORDER_STATUS_TRANSITIONS.CANCELLED` empty and
add an explicit helper such as:

```ts
export function canRestoreCancelledOrder(status: OrderStatus) {
  return status === "CANCELLED";
}
```

Update `components/admin/OrderStatusForm.tsx`:

- For a cancelled order, enable `PENDING_PAYMENT` as the only selectable target;
  keep `PROCESSING`, `COMPLETED`, and `CANCELLED` disabled.
- When that option is submitted, show a confirmation explaining that stock and
  the original blind-box allocation/code will be reserved/reactivated and that
  the order returns to “Chờ thanh toán”.
- Send this case to `PATCH /api/admin/orders/${orderId}/restore`. Preserve the
  existing `/cancel` and `/status` branches for all ordinary transitions.
- Display the API's conflict message (especially insufficient stock or a used
  code), leave the status unchanged on failure, and call `router.refresh()` on
  success.
- Avoid duplicating restoration eligibility in a second untested transition
  map where practical. It is acceptable for the UI to special-case only
  `status === "CANCELLED" && nextStatus === "PENDING_PAYMENT"` while continuing
  to use the current ordinary map for all other options.

**Verify**:
`npx vitest run tests/unit/orderTransitions.test.ts tests/unit/adminOrderRestoreApi.test.ts` →
exit 0; cancelled orders cannot directly transition to processing/completed,
and restore wiring targets the dedicated endpoint.

### Step 4: Add regression coverage for transaction invariants

Create `tests/unit/orderRestoration.test.ts` using the hoisted Prisma mock and
mocked transaction-callback style in `tests/unit/adminUserApi.test.ts`. Cover:

1. A cancelled normal-product order reserves stock, becomes
   `PENDING_PAYMENT`, and writes `ORDER_RESTORED`.
2. A valid cancelled blind-box order reactivates the original allocation and
   code, clearing `voidedAt`/`usedAt` without generating replacements.
3. Insufficient stock throws `INSUFFICIENT_STOCK`; no status/audit success write
   occurs. The mock cannot prove rollback, so assert all operations are inside
   the single transaction and document that true rollback/concurrency needs an
   approved test DB.
4. Any `REDEEMED` or `DISABLED` code rejects before inventory writes.
5. Missing/extra allocation, missing code, wrong code status, wrong order link,
   or allocation count not matching quantity rejects as invalid data.
6. A non-cancelled order rejects before inventory writes.
7. A conditional order update count of zero is surfaced as a concurrency
   conflict and never writes the success audit record.
8. The transaction is invoked with
   `Prisma.TransactionIsolationLevel.RepeatableRead`.

Create `tests/unit/adminOrderRestoreApi.test.ts` covering unauthorized access,
success, 404, each 409 class, and unexpected 500 behavior. Mock the service so
the route test is independent from Prisma mutation mechanics.

Extend `tests/unit/orderTransitions.test.ts` to assert explicitly:

- ordinary `canTransitionOrderStatus("CANCELLED", "PENDING_PAYMENT")` remains
  false because restoration must use the domain service;
- cancelled to processing/completed remains false;
- `canRestoreCancelledOrder("CANCELLED")` is true and false for every other
  status.

If an approved non-production test database is available, add a rollback-based
integration test in a separately agreed file to run two restoration attempts
and prove stock is decremented exactly once. Do not make this optional test a
hidden requirement and never run it against production.

**Verify**:
`npx vitest run tests/unit/orderRestoration.test.ts tests/unit/adminOrderRestoreApi.test.ts tests/unit/orderTransitions.test.ts` →
exit 0; all named scenarios pass.

### Step 5: Run full verification and update the plan index

Run, in order:

1. `npm run type-check`
2. `npx vitest run --exclude "tests/otp/**"`
3. `npm run build` with an approved reachable database
4. `git diff --check`
5. `git status --short`

Review `git status --short`: only files in this plan's Scope plus the status row
in `plans/README.md` may be changed. Mark plan 018 `DONE` only after every gate,
including the build and an authenticated manual smoke test, passes. Otherwise
use a precise status such as `PENDING MANUAL BUILD/SMOKE`.

Manual smoke test:

1. Use a disposable cancelled normal-product order with sufficient stock.
2. Open `/admin/orders`, click `Chi tiết`, choose `PENDING_PAYMENT`, and confirm
   restoration. Verify the list/detail status and product stock.
3. Repeat with a disposable cancelled blind-box order whose allocation/code are
   voided/cancelled. Verify the same allocation and code IDs become active; do
   not expose the code in the customer's order UI.
4. Verify an insufficient-stock order and an order with a redeemed code show a
   conflict and remain fully cancelled.
5. Verify the restored order still requires the normal admin confirmation to
   move from `PENDING_PAYMENT` to `PROCESSING`.

## Test plan

- Domain unit tests: `tests/unit/orderRestoration.test.ts`, covering success,
  stock conflict, blind-box integrity, sensitive code states, and concurrent
  conditional-update failure.
- API unit tests: `tests/unit/adminOrderRestoreApi.test.ts`, covering admin auth
  and stable response mapping.
- Policy tests: `tests/unit/orderTransitions.test.ts`, preserving the separation
  between ordinary transitions and restoration.
- Full regression: `npx vitest run --exclude "tests/otp/**"` → all pass.
- Manual authenticated smoke test on disposable orders → all five cases in
  Step 5 pass without exposing blind-box results/codes to the user.

## Done criteria

- [ ] Only `CANCELLED -> PENDING_PAYMENT` is available as restoration.
- [ ] Restoration uses a dedicated admin endpoint and one `RepeatableRead`
      transaction; the generic status endpoint cannot bypass its side effects.
- [ ] Stock reservation, allocation/code reactivation, order status, and audit
      record succeed together or roll back together.
- [ ] Redeemed, disabled, or structurally inconsistent blind-box orders are
      rejected without writes.
- [ ] A concurrent/repeated restore cannot decrement stock twice.
- [ ] No blind-box draw or redemption code is regenerated.
- [ ] `npm run type-check` exits 0.
- [ ] `npx vitest run --exclude "tests/otp/**"` exits 0.
- [ ] `npm run build` exits 0 with an approved reachable database.
- [ ] `git diff --check` exits 0.
- [ ] No file outside Scope is modified.
- [ ] Authenticated manual smoke tests pass and `plans/README.md` is updated.

## STOP conditions

Stop and report back without improvising if:

- Cancellation no longer increments stock or no longer voids the same
  allocation/code records described above.
- Historical cancelled orders are found with missing/extra allocations or
  codes and the operator wants them automatically repaired. That needs a
  separate data-repair policy and migration plan.
- The operator wants to restore an order containing a `REDEEMED` or `DISABLED`
  code. Reversing consumed rewards requires a separate business decision.
- The requested destination changes from `PENDING_PAYMENT` to `PROCESSING` or
  `COMPLETED`.
- Atomic stock reservation requires a schema change, database lock syntax, or
  isolation level unsupported by the configured TiDB/MySQL deployment.
- The conditional product/order update cannot distinguish a concurrent restore
  from missing data.
- A required verification fails twice after one reasonable correction.
- Implementation requires touching a source file outside Scope.

## Maintenance notes

- Keep cancellation and restoration inverse effects aligned. Any future field
  added to cancellation must be reviewed for a corresponding restoration rule.
- Reviewers should scrutinize transaction boundaries, conditional update
  counts, code-state guards, and the absence of code/PII in logs.
- Bulk restore and inline list actions are deferred intentionally: restoration
  can fail per order for stock or code-integrity reasons and deserves an
  explicit detail-page confirmation.
- Do not expose restored blind-box results or redemption codes on customer order
  pages; restoration changes fulfillment state, not the storefront disclosure
  policy.
