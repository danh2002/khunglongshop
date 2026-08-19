# Plan 024: Remove blind-box allocation when admin revokes a redeemed code

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report - do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 17e6eac..HEAD -- prisma/schema.prisma app/api/admin/redemption-codes app/(dashboard)/admin/redemption-codes components/admin/DisableCodeButton.tsx lib/collectionOwnership.ts app/api/merch/my-collection/route.ts tests/unit`
>
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `17e6eac`, 2026-08-14

## Why this matters

Admins need to revoke collector unlocks cleanly. Today the admin disable API only
handles unused `ACTIVE` codes, so a `REDEEMED` code cannot be revoked from
`/admin/redemption-codes`; if another admin path later changes the code status
without touching the blind-box allocation, the user's account can retain the
drawn character. The app does not have a `BlindBoxResult` model; the equivalent
row is `BlindBoxAllocation`, linked from `RedemptionCode.allocationId`.
Revoking a redeemed code must update the code and delete the tied allocation in
one Prisma transaction.

## Current state

- `prisma/schema.prisma` defines the statuses and allocation relation:

```prisma
// prisma/schema.prisma:21-26
enum RedemptionCodeStatus {
  ACTIVE
  REDEEMED
  DISABLED
  CANCELLED
}

// prisma/schema.prisma:59-62
enum BlindBoxAllocationStatus {
  ACTIVE
  VOIDED
}
```

```prisma
// prisma/schema.prisma:188-209
model BlindBoxAllocation {
  id             String                   @id @default(cuid())
  allocationKey  String                   @unique
  orderId        String
  order          Customer_order           @relation(fields: [orderId], references: [id], onDelete: Restrict)
  orderItemId    String
  orderItem      customer_order_product   @relation(fields: [orderItemId], references: [id], onDelete: Restrict)
  unitIndex      Int
  userId         String
  user           User                     @relation(fields: [userId], references: [id], onDelete: Restrict)
  productId      String
  product        Product                  @relation(fields: [productId], references: [id], onDelete: Restrict)
  rarityTier     RarityTier
  poolVersionId  String
  poolVersion    BlindBoxPoolVersion      @relation(fields: [poolVersionId], references: [id], onDelete: Restrict)
  status         BlindBoxAllocationStatus @default(ACTIVE)
  drawnAt        DateTime                 @default(now())
  revealed       Boolean                  @default(false)
  voidedAt       DateTime?
  redemptionCode RedemptionCode?
}
```

```prisma
// prisma/schema.prisma:216-229
model RedemptionCode {
  id           String               @id @default(cuid())
  code         String               @unique
  productId    String
  product      Product              @relation(fields: [productId], references: [id], onDelete: Restrict)
  allocationId String?              @unique
  allocation   BlindBoxAllocation?  @relation(fields: [allocationId], references: [id], onDelete: Restrict)
  orderId      String?
  order        Customer_order?      @relation(fields: [orderId], references: [id], onDelete: SetNull)
  userId       String?
  user         User?                @relation(fields: [userId], references: [id], onDelete: SetNull)
  status       RedemptionCodeStatus @default(ACTIVE)
  isUsed       Boolean              @default(false)
  usedAt       DateTime?
  createdAt    DateTime             @default(now())
}
```

Important schema consequence: `RedemptionCode.allocationId` points to
`BlindBoxAllocation.id` with `onDelete: Restrict`, so deleting the allocation
requires first clearing `allocationId` on the code inside the same transaction.
There is no automatic cascade today.

- `app/api/admin/redemption-codes/[id]/disable/route.ts` currently only disables
  unused active codes:

```ts
// app/api/admin/redemption-codes/[id]/disable/route.ts:13-21
const result = await prisma.redemptionCode.updateMany({
  where: { id, status: "ACTIVE", usedAt: null },
  data: { status: "DISABLED", isUsed: false },
});
if (result.count !== 1) {
  return adminError(409, "CODE_NOT_ACTIVE", "Only unused ACTIVE codes can be disabled.");
}
return NextResponse.json({ success: true });
```

- `components/admin/DisableCodeButton.tsx` is the admin UI action. It posts to
  the disable route:

```tsx
// components/admin/DisableCodeButton.tsx:8-12
if (!window.confirm("Vo hieu hoa ma nay?")) return;
const response = await fetch(`/api/admin/redemption-codes/${id}/disable`, { method: "POST" });
```

- `app/(dashboard)/admin/redemption-codes/page.tsx` currently renders the button
  only for active codes:

```tsx
// app/(dashboard)/admin/redemption-codes/page.tsx:128
<AdminTd>{code.status === "ACTIVE" ? <DisableCodeButton id={code.id} /> : null}</AdminTd>
```

- User collection state is derived from redemption codes, not directly from
  allocations:

```ts
// lib/collectionOwnership.ts:15-27
export function summarizeProductOwnership<T extends RedemptionLike>(codes: T[]) {
  const ownership = new Map<string, ProductOwnership<T>>();

  for (const code of codes) {
    if (code.status !== "REDEEMED") continue;
    ...
  }
}
```

```ts
// app/api/merch/my-collection/route.ts:37-50
prisma.redemptionCode.findMany({
  where: { userId },
  orderBy: { createdAt: "desc" },
}),
...
const ownershipByProductId = summarizeProductOwnership(redemptionCodes);
```

Changing a revoked code away from `REDEEMED` removes it from the collection
aggregation; deleting the tied `BlindBoxAllocation` removes the blind-box result
row itself.

There is no current `app/api/admin/redemption-codes/[id]/route.ts` DELETE
endpoint. The only admin revoke control found during planning is the disable
POST route above.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Type check | `npm run type-check` | exit 0 |
| Focused tests | `npx vitest run tests/unit/adminRedemptionCodeRevocation.test.ts tests/unit/redemptionCodeSpecWiring.test.ts tests/unit/collectionOwnership.test.ts` | exit 0 |
| Full tests | `npx vitest run --exclude "tests/otp/**"` | exit 0 |
| Scope check | `git diff --stat -- app/api/admin/redemption-codes components/admin/DisableCodeButton.tsx app/(dashboard)/admin/redemption-codes tests/unit plans/README.md` | only in-scope files shown |

## Scope

**In scope** (the only files the executor may modify):

- `app/api/admin/redemption-codes/[id]/disable/route.ts`
- `app/(dashboard)/admin/redemption-codes/page.tsx`
- `components/admin/DisableCodeButton.tsx` only if needed for stable copy, disabled state, or confirmation text
- `tests/unit/adminRedemptionCodeRevocation.test.ts` (create)
- `tests/unit/redemptionCodeSpecWiring.test.ts` if a source-level guard is useful
- `tests/unit/collectionOwnership.test.ts` only if adding an edge case for disabled/revoked codes
- `plans/README.md` status row only

**Out of scope** (do not touch):

- `prisma/schema.prisma` and migrations. This plan must use the existing
  optional `RedemptionCode.allocationId` relation and must not change schema.
- Public redemption flow in `app/api/merch/redeem-code/route.ts` and
  `lib/collectorService.ts`.
- Order cancellation/restoration behavior in `lib/orderCancellation.ts` and
  `lib/orderRestoration.ts`.
- Account collection UI layout. The existing aggregation already ignores
  non-`REDEEMED` codes.
- Product, order, set reward, and inventory logic.
- Any hard-delete route for redemption codes unless it already exists after
  drift check. If such a route appears, stop and report before expanding scope.

## Git workflow

- Work on the current branch unless the operator instructs otherwise.
- Commit per logical unit if requested by the operator; otherwise leave changes
  uncommitted for review.
- Commit message style in recent history is short imperative, e.g.
  `Add Google Search Console verification`.
- Do not push or open a PR unless explicitly instructed.

## Steps

### Step 1: Confirm the live revoke surface and relation shape

Run the drift check first. Then confirm:

- `prisma/schema.prisma` still has `RedemptionCode.allocationId String? @unique`
  and `onDelete: Restrict`.
- The live admin action still posts to
  `/api/admin/redemption-codes/${id}/disable`.
- There is still no admin redemption-code DELETE route.
- The admin list still renders `<DisableCodeButton>` only for `ACTIVE` codes.

If these facts differ, stop and report. Do not invent a broader delete/revoke
design.

**Verify**: `rg -n "allocationId|redemptionCode\\?|onDelete: Restrict|DisableCodeButton|redemption-codes/\\$\\{id\\}/disable" prisma app components` -> output confirms the facts above.

### Step 2: Add route-level transaction behavior for ACTIVE and REDEEMED codes

Update `app/api/admin/redemption-codes/[id]/disable/route.ts` so the mutation is
a single `prisma.$transaction(async (tx) => { ... })`.

Required behavior:

- If the code is `ACTIVE` and `usedAt: null`, preserve current behavior:
  update only that code to `DISABLED`, keep `isUsed: false`, and do not touch
  `BlindBoxAllocation`.
- If the code is `REDEEMED`, revoke it atomically:
  1. Read the code by `id` inside the transaction, selecting at least `id`,
     `status`, `usedAt`, and `allocationId`.
  2. If `allocationId` is non-null, update the code with a compare-and-set
     condition `where: { id, status: "REDEEMED" }` and data that clears the
     allocation relation before deletion:

```ts
data: {
  status: "DISABLED",
  isUsed: false,
  usedAt: null,
  allocationId: null,
}
```

  3. Delete the allocation row with `tx.blindBoxAllocation.delete({ where: { id: allocationId } })`.
  4. If the compare-and-set update count is not exactly `1`, throw/return a
     conflict so the route returns the existing structured `adminError`.
- If the code is `REDEEMED` but `allocationId` is null, update the code away
  from `REDEEMED` in the same transaction and do not delete any allocation.
  This handles already-inconsistent legacy data without touching unrelated
  allocations.
- If the code is `DISABLED` or `CANCELLED`, return a 409 conflict and do not
  update or delete anything.
- If the code id does not exist, return a structured 404 or 409 error using
  existing `adminError` conventions. Prefer 404 `CODE_NOT_FOUND` if adding a
  new code, but do not change the success JSON shape.

Success response must remain exactly:

```ts
return NextResponse.json({ success: true });
```

Implementation hint: because `BlindBoxAllocation` has restrictive incoming
relations from orders/order items/users/products, deleting the allocation itself
should be possible after clearing `RedemptionCode.allocationId`. If Prisma
raises a restriction error from another relation, that means the assumption is
false; stop rather than changing schema.

**Verify**: `npm run type-check` -> exit 0.

### Step 3: Expose the existing admin action for REDEEMED codes

Update `app/(dashboard)/admin/redemption-codes/page.tsx` so a redeemed code can
also render the existing disable button:

```tsx
code.status === "ACTIVE" || code.status === "REDEEMED"
```

Do not render it for `DISABLED` or `CANCELLED`.

Do not change filters, table columns, pagination, data shape, or admin styling.
If the current `DisableCodeButton` copy already works for both ACTIVE and
REDEEMED, leave it unchanged. Only touch `components/admin/DisableCodeButton.tsx`
if tests or UX require neutral "revoke/disable" wording, and keep the same POST
URL and `{ success: true }` handling.

**Verify**: `npm run type-check` -> exit 0.

### Step 4: Add focused unit/source regression tests

Create `tests/unit/adminRedemptionCodeRevocation.test.ts` following the mocking
style in `tests/unit/adminUserApi.test.ts`: use `vi.hoisted` mocks for
`requireAdminApi`, `prisma.$transaction`, `redemptionCode.findUnique`,
`redemptionCode.updateMany`, and `blindBoxAllocation.delete`; import
`POST` from `@/app/api/admin/redemption-codes/[id]/disable/route`.

Tests to add:

1. ACTIVE unused code:
   - arrange `findUnique` returning `{ id: "code-1", status: "ACTIVE", usedAt: null, allocationId: null }`;
   - expect response 200 and `{ success: true }`;
   - expect `redemptionCode.updateMany` called with `status: "ACTIVE", usedAt: null`;
   - expect `blindBoxAllocation.delete` not called.
2. REDEEMED code with allocation:
   - arrange `findUnique` returning `{ id: "code-1", status: "REDEEMED", usedAt: new Date(...), allocationId: "allocation-1" }`;
   - expect response 200 and `{ success: true }`;
   - expect `redemptionCode.updateMany` called with `where: { id: "code-1", status: "REDEEMED" }` and data containing `status: "DISABLED"`, `isUsed: false`, `usedAt: null`, `allocationId: null`;
   - expect `blindBoxAllocation.delete` called with `where: { id: "allocation-1" }`.
3. REDEEMED code without allocation:
   - expect code update succeeds and no allocation delete occurs.
4. DISABLED or CANCELLED code:
   - expect 409 and no update/delete.
5. Compare-and-set conflict:
   - make `updateMany` return `{ count: 0 }`;
   - expect 409 and no success response.

Also update or add a source-level guard in
`tests/unit/redemptionCodeSpecWiring.test.ts` that confirms the admin page makes
`DisableCodeButton` available for both `ACTIVE` and `REDEEMED` statuses, and
that the disable route uses `prisma.$transaction` plus
`blindBoxAllocation.delete`.

If useful, add one `tests/unit/collectionOwnership.test.ts` case proving
`summarizeProductOwnership()` ignores `DISABLED` codes that still have
historical `userId`; this protects the account collection behavior after revoke.

**Verify**: `npx vitest run tests/unit/adminRedemptionCodeRevocation.test.ts tests/unit/redemptionCodeSpecWiring.test.ts tests/unit/collectionOwnership.test.ts` -> exit 0.

### Step 5: Run full verification and update plan status

Run the full command set:

1. `npm run type-check` -> exit 0
2. `npx vitest run --exclude "tests/otp/**"` -> exit 0
3. `git diff --stat -- app/api/admin/redemption-codes components/admin/DisableCodeButton.tsx app/(dashboard)/admin/redemption-codes tests/unit plans/README.md` -> no out-of-scope files

Then update this plan's row in `plans/README.md` from `TODO` to `DONE` only if
all done criteria are satisfied.

## Test plan

- New route unit tests in `tests/unit/adminRedemptionCodeRevocation.test.ts`
  cover active disable, redeemed revoke with allocation deletion, redeemed
  revoke without allocation, invalid status conflict, and update race conflict.
- Source-level guard in `tests/unit/redemptionCodeSpecWiring.test.ts` ensures
  the admin UI exposes the action for `ACTIVE` and `REDEEMED`, and the route
  uses a transaction plus allocation deletion.
- Optional aggregation edge test in `tests/unit/collectionOwnership.test.ts`
  proves disabled/revoked codes do not contribute to collection ownership.
- Full regression: `npx vitest run --exclude "tests/otp/**"` must pass.

## Done criteria

All must hold:

- [ ] Admin can click the existing disable action for a `REDEEMED` code in
      `/admin/redemption-codes`.
- [ ] ACTIVE unused code disable behavior remains unchanged and does not touch
      `BlindBoxAllocation`.
- [ ] REDEEMED code revoke is one Prisma transaction.
- [ ] REDEEMED code with `allocationId` clears `RedemptionCode.allocationId`
      and deletes exactly that `BlindBoxAllocation` row atomically.
- [ ] REDEEMED code without `allocationId` is handled without deleting unrelated
      allocations.
- [ ] DISABLED/CANCELLED codes still return conflict and do not mutate data.
- [ ] Success JSON remains exactly `{ success: true }`.
- [ ] `npm run type-check` exits 0.
- [ ] `npx vitest run --exclude "tests/otp/**"` exits 0.
- [ ] No files outside the in-scope list are modified.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back (do not improvise) if:

- The schema changed and `RedemptionCode.allocationId` is no longer an optional
  unique relation to `BlindBoxAllocation` with restrictive delete semantics.
- A real `BlindBoxResult` model exists in the live schema after drift check; this
  plan is written for `BlindBoxAllocation` as the equivalent result row.
- A DELETE route for admin redemption codes exists after drift check; the plan
  must be expanded deliberately rather than quietly changing an unreviewed path.
- Deleting a `BlindBoxAllocation` after clearing `RedemptionCode.allocationId`
  fails due to another required relation or business invariant.
- The fix requires schema/migration changes, order-history rewrites, inventory
  changes, or set reward revocation.
- A verification command fails twice after a reasonable fix attempt.

## Maintenance notes

Future admin revoke/delete paths for redemption codes must reuse the same
transactional behavior: code status change and allocation removal must not be
split across endpoints. If the product later needs historical blind-box result
auditing, do not reintroduce orphaned active allocations; add an explicit audit
record or a separate reviewed `VOIDED` result-retention design instead. Reviewers
should pay close attention to compare-and-set conditions on `updateMany` so
concurrent redemption/revocation cannot delete an allocation for a code whose
status changed under the transaction.
