# 003 - Replace in-memory profile count aggregation with DB-level COUNT queries

**Written against:** `05e69fd3395e4b36540c4f44c1ec900e9b063651`
**Scope:** `app/api/account/profile/route.ts` lines 17-64
**Out of scope:** profile UI, other account endpoints, auth logic
**Executor model:** any with Prisma knowledge

---

## Background

`app/api/account/profile/route.ts` currently:

1. Loads all matching orders with `prisma.customer_order.findMany`
2. Loads all collector sets with `prisma.collectorSet.findMany`
3. Loads all redeemed codes with `prisma.redemptionCode.findMany`
4. Loads all collector products with `prisma.product.findMany`
5. Counts and filters those arrays in JavaScript around lines 54-64

This means payload and memory usage grow linearly with account history and
collection size. A user with 500 orders transfers 500 order rows to compute a
small set of dashboard summary numbers.

Fix: replace each `findMany` used only for counting with `count()` or
database-level aggregation. Keep bounded `findMany` only where the route still
needs specific row data.

---

## Pre-flight

```bash
npm run type-check && npm test
Get-Content -LiteralPath "app/api/account/profile/route.ts"
```

Read the current route before editing and preserve its response shape:

```ts
return NextResponse.json({
  user: {
    id: user.id,
    email: user.email ?? "",
    role: user.role ?? "user",
  },
  stats: {
    orderCount,
    activeOrderCount,
    completedOrderCount,
    unlockedCollectionSlots,
    totalCollectionSlots,
    completedCollectionSets,
  },
});
```

---

## Steps

### Step 1 - Map current queries and downstream uses

In `app/api/account/profile/route.ts`, identify the current query block:

```ts
const [orders, sets, redemptionCodes] = await Promise.all([
  prisma.customer_order.findMany({ ... }),
  prisma.collectorSet.findMany({ ... }),
  prisma.redemptionCode.findMany({ ... }),
]);

const collectorProducts = await prisma.product.findMany({ ... });
```

Then identify which values are only used for counts:

- `orders.length` becomes `orderCount`
- `orders.filter(...)` becomes status-specific order counts
- `redemptionCodes.map(...)` becomes unlocked product IDs
- `sets.reduce(...)` becomes total slot count
- `sets.filter(...)` plus `collectorProducts.filter(...)` becomes completed set count

**STOP condition:** If the route has changed and now returns order, set, code, or
product rows directly to the client, do not delete those `findMany` calls.
Instead add `take` and narrow `select` to any query that must still return rows.

---

### Step 2 - Replace order array loading with count queries

Use the existing `orderWhere = getAccountOrderOwnershipWhere(user)`.

Create three parallel count queries:

```ts
const [orderCount, completedOrderCount, canceledOrderCount] = await Promise.all([
  prisma.customer_order.count({ where: orderWhere }),
  prisma.customer_order.count({
    where: {
      AND: [
        orderWhere,
        { status: { in: getStatusRawValues("delivered") ?? [] } },
      ],
    },
  }),
  prisma.customer_order.count({
    where: {
      AND: [
        orderWhere,
        { status: { in: getStatusRawValues("canceled") ?? [] } },
      ],
    },
  }),
]);

const activeOrderCount = Math.max(orderCount - completedOrderCount - canceledOrderCount, 0);
```

If `getStatusRawValues` is not currently imported in this file, import it from
`@/lib/accountOrders` next to `getAccountOrderOwnershipWhere` and
`normalizeAccountOrderStatus`. If using raw enum status values is clearer than
`getStatusRawValues`, update the import accordingly, but keep the same behavior
for legacy status normalization.

Delete the old full `orders` query and the JavaScript `.filter(...)` counts.

---

### Step 3 - Replace collection slot counting with aggregate/count queries

The route currently needs three collection stats:

- `totalCollectionSlots`
- `unlockedCollectionSlots`
- `completedCollectionSets`

Use database-level primitives where possible:

```ts
const [sets, unlockedProductGroups] = await Promise.all([
  prisma.collectorSet.findMany({
    select: { id: true, totalSlots: true },
  }),
  prisma.redemptionCode.groupBy({
    by: ["productId"],
    where: {
      userId: user.id,
      status: "REDEEMED",
    },
  }),
]);

const unlockedProductIds = new Set(unlockedProductGroups.map((group) => group.productId));
const totalCollectionSlots = sets.reduce((sum, set) => sum + set.totalSlots, 0);
```

Then fetch only the collector product IDs and set IDs needed for completion math:

```ts
const collectorProducts = await prisma.product.findMany({
  where: {
    isCollector: true,
    setId: { in: sets.map((set) => set.id) },
  },
  select: {
    id: true,
    setId: true,
  },
});
```

This still fetches collector product identity rows, but not full product records
or redemption-code rows. That keeps the change mechanical while removing the
largest user-history dependency.

Compute:

```ts
const unlockedCollectionSlots = collectorProducts.filter((product) => unlockedProductIds.has(product.id)).length;

const productsBySetId = new Map<string, typeof collectorProducts>();
for (const product of collectorProducts) {
  if (!product.setId) continue;
  productsBySetId.set(product.setId, [...(productsBySetId.get(product.setId) ?? []), product]);
}

const completedCollectionSets = sets.filter((set) => {
  const productsInSet = productsBySetId.get(set.id) ?? [];
  return productsInSet.length === set.totalSlots && productsInSet.every((product) => unlockedProductIds.has(product.id));
}).length;
```

**Optional stronger version:** use SQL/grouping for completed-set calculation as
a follow-up if collection sizes become large. Do not jump to raw SQL in this
plan unless Prisma cannot express the needed bounded query shape.

---

### Step 4 - Preserve response shape

Return the same JSON keys the profile page already consumes:

```ts
return NextResponse.json({
  user: {
    id: user.id,
    email: user.email ?? "",
    role: user.role ?? "user",
  },
  stats: {
    orderCount,
    activeOrderCount,
    completedOrderCount,
    unlockedCollectionSlots,
    totalCollectionSlots,
    completedCollectionSets,
  },
});
```

Do not change profile UI code unless TypeScript proves the response shape has
changed. This plan should be route-only.

---

### Step 5 - Add or update a focused test

Look for existing route or account profile tests:

```bash
rg -n "account/profile|activeOrderCount|completedCollectionSets" tests app lib
```

If there is already a focused test for profile stats, update it to cover:

- total order count
- active order count excludes delivered and canceled
- completed order count includes delivered statuses
- duplicate redeemed codes for the same product count as one unlocked slot

If no route-level test harness exists, add a lightweight wiring test that reads
`app/api/account/profile/route.ts` and asserts:

- the route uses `prisma.customer_order.count`
- the route does not call `.length` on `orders`
- the route uses `redemptionCode.groupBy` or another bounded aggregation for redeemed product IDs

Follow the style of `tests/unit/redemptionCodeSpecWiring.test.ts` for file
content wiring assertions.

---

## Verification

```bash
npm run type-check
npm test
```

Manual smoke test:

1. Log in as a user with at least one order and one redeemed collection item.
2. Open the account profile page.
3. Confirm the displayed stats match the previous behavior.
4. Temporarily enable Prisma query logging or inspect database logs and confirm
   the profile request uses `COUNT`/bounded queries rather than full order and
   redemption-code history transfers.

---

## Done criteria

- [ ] No `.length` on a full `orders` `findMany` result in `app/api/account/profile/route.ts`
- [ ] Order stats use `prisma.customer_order.count`
- [ ] Redeemed-code ownership uses `groupBy`, `count`, or another bounded aggregation instead of fetching every code row
- [ ] Response shape is unchanged for the profile UI
- [ ] `npm run type-check` passes
- [ ] `npm test` passes
- [ ] Manual test: profile page loads without full history transfer
