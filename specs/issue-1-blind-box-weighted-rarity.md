# Issue #1: Blind Box With Versioned Weighted Rarity

Sources:

- Issue: https://github.com/danh2002/khunglongshop/issues/1
- Comment: https://github.com/danh2002/khunglongshop/issues/1#issuecomment-4669505526
- Related spec: `specs/issue-1-product-code-unlock-collection.md`

## Overview

The sellable product is a physical blind-box SKU. A Vanie blind box resolves to one of 10 Vanie collector variants using a server-side weighted draw.

The fulfillment model is hybrid:

1. An authenticated customer submits checkout.
2. The server validates products, stock, prices, ownership, and the active blind-box pool version.
3. In one Prisma transaction, the server creates the order and order items, transitions the order from `PENDING` to `PROCESSING`, performs one weighted draw per blind-box unit, stores immutable allocations, creates redemption codes, and reserves stock.
4. The committed response includes the drawn characters so the customer sees the result on the order confirmation page.
5. Warehouse staff see the same allocation on the admin order detail page and pack the specified physical keychains within two business days.
6. Redemption codes retain the existing collection mechanic. Redeeming a code records the corresponding allocation as collected; it does not reroll the result.

The order status flow is:

```text
PENDING -> PROCESSING -> SHIPPED -> DELIVERED
                 \-> CANCELLED
PENDING ----------------> CANCELLED
```

`PROCESSING` means payment has been confirmed and blind-box allocations have been created. `OrderStatus.PROCESSING` already exists in the current Prisma schema and must remain present.

## Locked Decisions

### Fulfillment

- The draw runs server-side during checkout.
- The result is stored before the transaction commits.
- The customer sees the result immediately after successful checkout and on authenticated order detail pages.
- Warehouse staff pack the exact allocated character.
- Warehouse fulfillment SLA is two business days after the order enters `PROCESSING`.
- There is no reroll.

### Authentication

- Guest checkout is blocked.
- Middleware protects `/checkout` and redirects unauthenticated users to:

```text
/login?callbackUrl=/checkout
```

- All order creation, order transition, cancellation, code, collection, and blind-box APIs derive `userId` from the server session.
- Client-submitted `userId` and email are never used for authorization.
- There is no email claim or guest-to-account migration flow.

### Default Vanie Pool

| Variant | Slot | Weight | Rarity |
| --- | ---: | ---: | --- |
| Vanie 1 | 1 | 100 | COMMON |
| Vanie 2 | 2 | 100 | COMMON |
| Vanie 3 | 3 | 100 | COMMON |
| Vanie 4 | 4 | 100 | COMMON |
| Vanie 5 | 5 | 100 | COMMON |
| Vanie 6 | 6 | 100 | COMMON |
| Vanie 7 | 7 | 100 | COMMON |
| Vanie 8 | 8 | 100 | COMMON |
| Vanie 9 | 9 | 100 | COMMON |
| Vanie 10 | 10 | 10 | LEGENDARY |

Total default weight: `910`.

Admins may change future odds by editing and publishing a new pool version. Published versions are immutable.

### Odds Disclosure

- Customer-facing pages show only rarity tier: `COMMON`, `RARE`, `EPIC`, or `LEGENDARY`.
- Exact weights and percentages are admin-only.
- The product page states that Vanie 10 is rarer, without exposing its numeric probability.

### Duplicate And Inventory Behavior

- Duplicate draws are allowed.
- Collection progress counts unique slots.
- Ownership count includes duplicate allocations whose codes were redeemed.
- Version 1 decrements blind-box SKU stock by purchased quantity.
- Variant-level fulfillment stock is managed operationally by the warehouse and is not decremented by this feature.
- Admin must not publish a pool containing a variant that cannot be physically fulfilled.

## Goals

- Sell a blind-box SKU linked to a 10-slot collector set.
- Use immutable, versioned weighted pools.
- Produce exactly one allocation and one redemption code per purchased blind-box unit.
- Make checkout, price calculation, stock reservation, status transition, draw, allocation, and code creation atomic.
- Make retries idempotent and prevent duplicate orders or duplicate allocations.
- Show draw results immediately after checkout.
- Give warehouse staff an unambiguous packing list.
- Preserve collection unlock and set completion rewards.
- Prevent code enumeration, unauthorized checkout, price tampering, and client-created order lines.
- Keep Vietnamese-first UI and the existing `#070707` / `#e85d00` visual theme.

## Non-goals

- No guest checkout.
- No cash prizes, code resale, trading, rerolls, pity system, or duplicate protection.
- No customer-visible exact weights or percentages.
- No automated payment gateway integration in this scope.
- No automated refund settlement.
- No revocation of a set reward already granted.
- No per-variant inventory ledger in version 1.
- No draw at cart-add time or code-redemption time.
- No creation of order items through the legacy client-facing `/api/order-product` endpoint.

## User Stories / UX Flow

1. An unauthenticated visitor opening `/checkout` is redirected to login.
2. An authenticated customer sees the blind-box SKU, set name, possible variants, and rarity tiers.
3. The customer submits shipping information and cart item IDs/quantities.
4. The server calculates authoritative prices and total from the database.
5. Successful checkout returns an order in `PROCESSING` with one reveal card per blind-box unit.
6. The customer can revisit `/account/orders/[id]` and see the same immutable draw results.
7. Warehouse staff see product, slot, rarity, and quantity on the admin order detail page.
8. The customer redeems each issued code to add that allocated character to the collection.
9. Duplicate variants increase `ownedCount` but not unique progress.
10. Unlocking all 10 unique slots grants the existing set reward once.
11. An admin edits odds in a draft and publishes a new immutable version.
12. Orders retain the pool version captured when the order was created, even if a new version becomes active before processing completes.

Suggested Vietnamese copy:

- Badge: `TÚI MÙ`
- Description: `Mỗi hộp chứa ngẫu nhiên 1 trong 10 mẫu. Vanie 10 là mẫu hiếm nhất.`
- Rarity title: `Độ hiếm`
- Checkout reveal title: `Bạn đã mở được`
- Duplicate ownership: `Bạn đã sở hữu mẫu này. Số lượng đã mở khóa: {count}`
- Packing status: `Đang chuẩn bị hàng`
- Collection action: `Mở khóa bộ sưu tập`
- Pool validation error: `Phiên bản tỷ lệ chưa hợp lệ. Vui lòng kiểm tra đủ 10 mẫu và trọng số.`

## Technical Design

### Domain Model

- **Blind-box SKU**: a sellable `Product` with `isBlindBox = true` and `blindBoxSetId`.
- **Collector variant**: an `isCollector = true` product assigned to exactly one slot in a `CollectorSet`.
- **Pool version**: an immutable published set of weighted entries for one collector set.
- **Order item snapshot**: stores the active pool version selected when the order is created.
- **Allocation**: one immutable result for one unit of one blind-box order item.
- **Redemption code**: one code linked one-to-one to an allocation; redemption unlocks collection ownership but never changes the draw.

### Atomic Checkout

Replace the two-step client flow (`POST /api/orders`, then repeated `POST /api/order-product`) with one authenticated endpoint:

```text
POST /api/orders
```

The request contains shipping data, an idempotency key, and product IDs/quantities only:

```ts
type CreateOrderRequest = {
  idempotencyKey: string;
  shipping: {
    name: string;
    lastname: string;
    phone: string;
    email: string;
    company: string;
    address: string;
    apartment: string;
    city: string;
    country: string;
    postalCode: string;
    orderNotice?: string;
  };
  items: Array<{
    productId: string;
    quantity: number;
  }>;
};
```

Rules:

- Require a valid session before parsing business input.
- Require `shipping.email` to equal the authenticated user's email after normalization.
- Validate with Zod or the existing validation helpers.
- Allow `1..20` distinct item lines and quantity `1..99` per line.
- Merge duplicate product IDs before validation.
- Ignore/reject client price, total, status, user ID, allocation, pool version, rarity, and draw fields.
- Read products, prices, stock, collector set, and active pool versions from Prisma.
- Reject unavailable products or insufficient stock.
- Reject a blind-box SKU without exactly one active valid pool version.
- Rate limit to five requests per minute per `userId`.

Within one Prisma transaction:

1. Reuse and return an existing order when `userId + idempotencyKey` already exists.
2. Load and lock/revalidate all requested products.
3. Calculate line totals and order total from database prices.
4. Create `Customer_order` with status `PENDING`.
5. Create all `customer_order_product` rows with authoritative snapshots.
6. Snapshot each blind-box order item's currently active `poolVersionId`.
7. Atomically decrement blind-box SKU stock with guarded updates.
8. Perform weighted draws using the snapshotted pool version.
9. Create one `BlindBoxAllocation` and one `RedemptionCode` per blind-box unit.
10. Update the order to `PROCESSING`.
11. Commit.

For the current payment model, successful server acceptance of checkout is the payment-confirmation boundary. Therefore `PENDING` exists only inside the transaction during normal checkout. If any validation, stock reservation, draw, allocation, code, or status update fails, the entire transaction rolls back and no order is visible.

The legacy public `POST /api/order-product` route must be removed or restricted to admin/internal callers. The browser must never create or mutate order items directly.

### Idempotency

- `Customer_order.checkoutIdempotencyKey` is unique per user.
- Each allocation uses:

```text
allocationKey = "{orderItemId}:{unitIndex}"
```

- `BlindBoxAllocation.allocationKey` is unique.
- `BlindBoxAllocation` also has `@@unique([orderItemId, unitIndex])`.
- Retrying checkout with the same idempotency key returns the original response.
- Retrying allocation creation never redraws an existing unit.
- A different payload with an existing idempotency key returns `409 IDEMPOTENCY_KEY_REUSED`.
- Store a canonical request hash on the order to detect payload mismatch.

### Pool Version Lifecycle

Pool versions belong to one `CollectorSet`.

- `DRAFT`: editable; cannot be used for a draw.
- `ACTIVE`: immutable; eligible for new orders.
- `ARCHIVED`: immutable; retained for audit and historical allocations.

Publishing:

1. Validate the draft and all entries.
2. In a serializable transaction, create a new immutable pool-version record by copying the validated draft and its entries.
3. Assign the next monotonically increasing `version` number to that new record.
4. Archive the previous active version and set its `activeSetKey` to `null`.
5. Set the copied version to `ACTIVE`, set `publishedAt`, and set `activeSetKey = collectorSetId`.
6. Mark the source draft `ARCHIVED` so it cannot be published twice.
7. Commit and return the new active version.

`activeSetKey @unique` enforces at most one active version per collector set in MySQL. Draft and archived versions use `null`.

Published versions and entries cannot be edited or deleted. Publishing never mutates a draft into the active record; it creates an immutable copy. To change odds, clone the active version into a new draft, edit it, and publish it.

An order item captures `poolVersionId` at order creation. All its allocations use that version, even if another version becomes active before the transaction finishes or an order is later viewed.

### Pool Validation

Before draft save:

- `drawWeight` must be an integer from `1` through `1_000_000`.
- Rarity must be one of `COMMON`, `RARE`, `EPIC`, `LEGENDARY`.
- Product must be an enabled collector variant in the same set.
- No duplicate product or slot is allowed.

Before publish:

- Exactly 10 entries must exist.
- Slots must be exactly `1..10`.
- Total weight must be from `10` through `10_000_000`.
- Vanie 10 must have a lower weight than Vanie 1.
- The default seed uses total weight `910`.

Invalid draft save or publish returns:

```text
422 INVALID_POOL_VERSION
```

### Secure Weighted Draw

Use Node.js `crypto.randomInt(0, totalWeight)`. Do not use `Math.random()`.

Algorithm:

1. Load pool entries ordered by `slotNumber`, including product identity.
2. Sum validated integer weights.
3. Call `crypto.randomInt(0, totalWeight)` to obtain an integer in `[0, totalWeight)`.
4. Walk cumulative ranges and select the first entry whose upper bound exceeds the random value.
5. Persist the selected product, pool version, unit index, and allocation key before transaction commit.

The client cannot provide random values, pool versions, entries, products, or rarity.

### Result Visibility And Collection Redemption

The allocation result is visible immediately after checkout:

- Set `BlindBoxAllocation.revealed = true` when creating a successful `PROCESSING` order.
- Return the result in the checkout response.
- Allow the owning user and admins to read it from order detail.
- Do not expose it through public catalog APIs.

The redemption code has a separate purpose:

- `ACTIVE`: allocation exists, result is visible to the owner, but the collection slot is not unlocked.
- `REDEEMED`: collection ownership is counted.
- `CANCELLED`: voided due to order cancellation; cannot be redeemed.
- `DISABLED`: manually disabled by admin.

Redeeming does not draw or reveal a new product. It atomically changes an owned code from `ACTIVE` to `REDEEMED`, then recalculates unique collection progress and grants the set reward if complete.

For both “code does not exist” and “code belongs to another user”, return exactly:

```http
404
{ "error": "CODE_NOT_FOUND_OR_UNAUTHORIZED" }
```

Response status, body, and observable lookup path must be identical for both cases.

Rate limit redemption to 10 requests per minute per `userId`.

### Duplicate Results

- Duplicate allocations are allowed.
- `ownedCount` counts redeemed codes for the same allocated product.
- `uniqueUnlocked` counts distinct allocated collector slots with redeemed codes.
- Duplicate redemption does not increase `uniqueUnlocked`.
- `SetReward @@unique([userId, setId])` prevents duplicate rewards.

### Cancellation And Refund Policy

#### PENDING

- Customer/admin cancellation is allowed.
- No allocation or redemption code exists.
- Restore any stock reservation if a future flow persists `PENDING` outside the checkout transaction.

#### PROCESSING

- In the normal atomic checkout flow, entering `PROCESSING` and creating allocations happen in the same transaction; there is no externally visible pre-draw `PROCESSING` window.
- If an administrative recovery flow creates `PROCESSING` before allocations, cancellation is allowed before the draw.
- After a draw exists, cancellation voids every active allocation and changes linked `ACTIVE` codes to `CANCELLED`.
- Set `BlindBoxAllocation.status = VOIDED` and `voidedAt`.
- Restore blind-box SKU stock.
- Existing redeemed codes are not silently reverted; cancellation requires an admin audit entry.
- Set-completion rewards already granted are never revoked.

#### SHIPPED / DELIVERED

- Customer cancellation is rejected with `409 ORDER_NOT_CANCELLABLE`.
- Refunds are handled manually by admins.
- Manual refund does not delete allocations, codes, audit history, or granted rewards.

All cancellation actions require ownership or admin authorization and create an `AdminAuditLog` for admin-triggered changes.

## API Changes

### `POST /api/orders`

Authentication: required.

Rate limit: five requests/minute/user.

Success:

```ts
type CreateOrderResponse = {
  order: {
    id: string;
    status: "PROCESSING";
    total: number;
    createdAt: string;
    items: Array<{
      id: string;
      productId: string;
      title: string;
      slug: string;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
    }>;
  };
  blindBoxResults: Array<{
    allocationId: string;
    orderItemId: string;
    unitIndex: number;
    poolVersionId: string;
    setId: string;
    product: {
      id: string;
      title: string;
      slug: string;
      image: string;
      slotNumber: number;
    };
    rarityTier: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
    redemptionCode: string;
  }>;
};
```

Errors:

- `401 UNAUTHORIZED`
- `400 INVALID_REQUEST`
- `404 PRODUCT_NOT_FOUND`
- `409 IDEMPOTENCY_KEY_REUSED`
- `409 INSUFFICIENT_STOCK`
- `422 BLIND_BOX_POOL_UNAVAILABLE`
- `429 RATE_LIMITED`
- `500 ORDER_CREATION_FAILED`

### `POST /api/merch/redeem-code`

Authentication: required.

Rate limit: 10 requests/minute/user.

Request:

```json
{ "code": "DKL-ABCD-1234-EF56" }
```

Success:

```ts
type RedeemCodeResponse = {
  success: true;
  allocation: {
    id: string;
    setId: string;
    slotNumber: number;
    product: {
      id: string;
      name: string;
      slug: string;
      image: string;
    };
    rarityTier: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
    isDuplicate: boolean;
    ownedCount: number;
  };
  collection: {
    uniqueUnlocked: number;
    totalSlots: 10;
    isComplete: boolean;
  };
  setReward: null | {
    rewardCode: string;
    isClaimed: boolean;
  };
};
```

Errors:

- `401 UNAUTHORIZED`
- `400 INVALID_CODE`
- `404 CODE_NOT_FOUND_OR_UNAUTHORIZED`
- `409 CODE_NOT_ACTIVE`
- `422 INVALID_ALLOCATION`
- `429 RATE_LIMITED`
- `500 REDEEM_FAILED`

### `GET /api/merch/my-codes`

- Requires session.
- Returns only the current user's codes.
- Includes allocation result because the result was already shown at checkout.
- Never returns numeric draw weights or another user's code/allocation.
- `CANCELLED` and `DISABLED` codes are clearly non-redeemable.

### `GET /api/merch/my-collection`

Build collection ownership from `REDEEMED` allocation-linked codes.

```ts
type CollectionSlot = {
  slotNumber: number;
  isUnlocked: boolean;
  ownedCount: number;
  product: null | {
    id: string;
    name: string;
    slug: string;
    image: string;
  };
};
```

### `GET /api/merch/blind-boxes/[slug]/rarities`

Public endpoint. Returns possible variants and rarity tiers only:

```ts
type BlindBoxRaritiesResponse = {
  productId: string;
  set: {
    id: string;
    name: string;
    totalSlots: 10;
  };
  variants: Array<{
    slotNumber: number;
    productName: string;
    rarityTier: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  }>;
  publishedAt: string;
};
```

It must not return weights, percentages, pool entry IDs, allocation data, or customer data.

### Admin Pool APIs

- `POST /api/admin/collector-sets/:setId/pool-versions` creates a draft, optionally cloned from active.
- `PUT /api/admin/pool-versions/:id` updates draft metadata/entries.
- `POST /api/admin/pool-versions/:id/publish` validates a draft, creates a new immutable active version, archives the previous active version, and archives the source draft.
- `GET /api/admin/collector-sets/:setId/pool-versions` lists version history.

All require admin session, Zod validation, and an `AdminAuditLog`.

### Order Cancellation

- `POST /api/account/orders/:id/cancel` permits only the owning user and cancellable statuses.
- `POST /api/admin/orders/:id/cancel` permits admins and requires a reason.
- Both use a transaction for status, allocation, code, stock, and audit changes.

## Complete Prisma Design

The following is the complete target shape for all affected models. It uses the current project model names (`Customer_order` and `customer_order_product`) and is intended to replace the corresponding definitions in both Prisma schema copies.

```prisma
enum Role {
  admin
  user
}

enum RedemptionCodeStatus {
  ACTIVE
  REDEEMED
  DISABLED
  CANCELLED
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}

enum PoolVersionStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}

enum RarityTier {
  COMMON
  RARE
  EPIC
  LEGENDARY
}

enum BlindBoxAllocationStatus {
  ACTIVE
  VOIDED
}

enum OrderSnapshotSource {
  CHECKOUT
  BACKFILL_DERIVED
  BACKFILL_ESTIMATE
}

model Product {
  id                  String                   @id @default(uuid())
  slug                String                   @unique
  title               String
  mainImage           String
  price               Int                      @default(0)
  rating              Int                      @default(0)
  description         String
  manufacturer        String
  inStock             Int                      @default(1)
  categoryId          String
  category            Category                 @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  customerOrders      customer_order_product[]
  redemptionCodes     RedemptionCode[]
  Wishlist            Wishlist[]
  setId               String?
  set                 CollectorSet?            @relation("CollectorVariants", fields: [setId], references: [id], onDelete: Restrict)
  setSlotNumber       Int?
  isCollector         Boolean                  @default(false)
  isBlindBox          Boolean                  @default(false)
  blindBoxSetId       String?
  blindBoxSet         CollectorSet?            @relation("BlindBoxSellableProducts", fields: [blindBoxSetId], references: [id], onDelete: Restrict)
  poolEntries         BlindBoxPoolEntry[]
  blindBoxAllocations BlindBoxAllocation[]
  merchantId          String
  merchant            Merchant                 @relation(fields: [merchantId], references: [id])
  bulkUploadItems     bulk_upload_item[]        @relation("ProductBulkItems")

  @@unique([setId, setSlotNumber])
  @@index([categoryId])
  @@index([merchantId])
  @@index([setId])
  @@index([inStock])
  @@index([isCollector])
  @@index([isBlindBox])
  @@index([blindBoxSetId])
}

model CollectorSet {
  id                 String                @id @default(cuid())
  name               String
  description        String?
  totalSlots         Int                   @default(10)
  rewardDescription  String?
  rewardCodeTemplate String?
  products           Product[]             @relation("CollectorVariants")
  blindBoxProducts   Product[]             @relation("BlindBoxSellableProducts")
  poolVersions       BlindBoxPoolVersion[]
  setRewards         SetReward[]
  createdAt          DateTime               @default(now())
  updatedAt          DateTime               @updatedAt
}

model BlindBoxPoolVersion {
  id             String                   @id @default(cuid())
  collectorSetId String
  collectorSet   CollectorSet             @relation(fields: [collectorSetId], references: [id], onDelete: Restrict)
  version        Int
  status         PoolVersionStatus        @default(DRAFT)
  activeSetKey   String?                  @unique
  createdAt      DateTime                 @default(now())
  publishedAt    DateTime?
  entries        BlindBoxPoolEntry[]
  allocations    BlindBoxAllocation[]
  orderItems     customer_order_product[]

  @@unique([collectorSetId, version])
  @@index([collectorSetId, status])
}

model BlindBoxPoolEntry {
  id            String              @id @default(cuid())
  poolVersionId String
  poolVersion   BlindBoxPoolVersion @relation(fields: [poolVersionId], references: [id], onDelete: Restrict)
  productId     String
  product       Product             @relation(fields: [productId], references: [id], onDelete: Restrict)
  slotNumber    Int
  drawWeight    Int
  rarityTier    RarityTier

  @@unique([poolVersionId, productId])
  @@unique([poolVersionId, slotNumber])
  @@index([productId])
}

model BlindBoxAllocation {
  id            String                   @id @default(cuid())
  allocationKey String                   @unique
  orderId       String
  order         Customer_order           @relation(fields: [orderId], references: [id], onDelete: Restrict)
  orderItemId   String
  orderItem     customer_order_product   @relation(fields: [orderItemId], references: [id], onDelete: Restrict)
  unitIndex     Int
  userId        String
  user          User                     @relation(fields: [userId], references: [id], onDelete: Restrict)
  productId     String
  product       Product                  @relation(fields: [productId], references: [id], onDelete: Restrict)
  rarityTier    RarityTier
  poolVersionId String
  poolVersion   BlindBoxPoolVersion      @relation(fields: [poolVersionId], references: [id], onDelete: Restrict)
  status        BlindBoxAllocationStatus @default(ACTIVE)
  drawnAt       DateTime                 @default(now())
  revealed      Boolean                  @default(false)
  voidedAt      DateTime?
  redemptionCode RedemptionCode?

  @@unique([orderItemId, unitIndex])
  @@index([orderId])
  @@index([userId, status])
  @@index([productId])
  @@index([poolVersionId])
}

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

  @@index([userId])
  @@index([productId])
  @@index([orderId])
  @@index([status])
  @@index([userId, isUsed])
  @@index([userId, status])
}

model User {
  id                  String               @id @default(uuid())
  email               String               @unique
  password            String?
  role                Role                 @default(user)
  orders              Customer_order[]
  Wishlist            Wishlist[]
  notifications       Notification[]
  redemptionCodes     RedemptionCode[]
  blindBoxAllocations BlindBoxAllocation[]
  setRewards          SetReward[]
  settingsUpdates     SiteSettings[]       @relation("SiteSettingsUpdatedBy")
  adminAuditLogs      AdminAuditLog[]      @relation("AdminAuditActor")
  isActive            Boolean              @default(true)
  deactivatedAt       DateTime?
  bulkUploadBatches   bulk_upload_batch[]  @relation("UserBatches")

  @@index([role])
  @@index([isActive])
}

model Customer_order {
  id                     String                   @id @default(uuid())
  userId                 String
  user                   User                     @relation(fields: [userId], references: [id], onDelete: Restrict)
  checkoutIdempotencyKey String
  checkoutRequestHash    String
  name                   String
  lastname               String
  phone                  String
  email                  String
  company                String
  adress                 String
  apartment              String
  postalCode             String
  dateTime               DateTime                 @default(now())
  status                 OrderStatus              @default(PENDING)
  city                   String
  country                String
  orderNotice            String?
  total                  Int
  products               customer_order_product[]
  redemptionCodes        RedemptionCode[]
  blindBoxAllocations    BlindBoxAllocation[]

  @@unique([userId, checkoutIdempotencyKey])
  @@index([email])
  @@index([userId, dateTime])
  @@index([status])
  @@index([dateTime])
}

model customer_order_product {
  id                    String                   @id @default(uuid())
  customerOrder         Customer_order           @relation(fields: [customerOrderId], references: [id], onDelete: Restrict)
  customerOrderId       String
  product               Product                  @relation(fields: [productId], references: [id], onDelete: Restrict)
  productId             String
  quantity              Int
  productTitle          String
  productSlug           String
  unitPrice             Int
  snapshotSource        OrderSnapshotSource
  poolVersionId         String?
  poolVersion           BlindBoxPoolVersion?     @relation(fields: [poolVersionId], references: [id], onDelete: Restrict)
  blindBoxAllocations   BlindBoxAllocation[]

  @@index([customerOrderId])
  @@index([productId])
  @@index([poolVersionId])
}
```

Application validation must enforce constraints Prisma/MySQL cannot express:

- `isCollector` and `isBlindBox` cannot both be true.
- Collector variants require `setId` and `setSlotNumber`.
- Blind-box SKUs require `blindBoxSetId` and no `setSlotNumber`.
- `activeSetKey` equals `collectorSetId` only for `ACTIVE`.
- Published versions and entries are immutable.
- `drawWeight` and total weight limits.
- Allocation product belongs to its pool version.
- Allocation/order/order item/user relationships are consistent.

## Migration Plan

1. Update `prisma/schema.prisma` and `server/prisma/schema.prisma`.
2. Add new enums, models, nullable product fields, order idempotency fields, and relations.
3. Backfill existing registered-user orders with `userId`; orders without a resolvable user cannot participate in blind-box allocation.
4. Create the Vanie collector set variants and blind-box SKU.
5. Seed pool version 1 as `ACTIVE` with weights totaling `910`.
6. Set `activeSetKey = collectorSetId` for version 1.
7. Keep legacy direct-product redemption codes with `allocationId = null`.
8. Make new checkout orders require non-null `userId`.
9. Remove browser access to `/api/order-product`.
10. Generate Prisma Client and run `prisma validate`.
11. Run a migration preflight for duplicate collector slots and duplicate idempotency keys.
12. Deploy API changes before enabling `isBlindBox` products.

Rollback:

- Disable blind-box SKUs.
- Archive active pool versions.
- Preserve allocations and codes for audit.
- Do not drop new tables until all affected orders are fulfilled.

## Frontend Changes

### Middleware

- Add `/checkout` to the authenticated route condition and callback redirect.
- Preserve existing `/account` and `/admin` rules.

### Checkout

- Remove calls to `/api/users/email/:email`.
- Remove client-submitted total, status, price, and user ID.
- Remove the loop calling `/api/order-product`.
- Generate one idempotency key per checkout attempt and retain it across retries.
- Submit one `POST /api/orders`.
- On success, clear cart and navigate to `/order-confirmation/[id]`.

### Order Confirmation

- Show all normal order items.
- Show one reveal card per allocation.
- Include character image, name, slot, rarity tier, and redemption code.
- Show warehouse SLA: `Đơn hàng sẽ được đóng gói trong vòng 2 ngày làm việc.`
- Reloading the page reads stored allocations and never rerolls.

### Product Detail / Cards

- Show `TÚI MÙ`.
- Show possible variants and rarity tiers from the public rarities endpoint.
- Do not show exact weights or percentages.
- Do not present one collector slot as the purchased product.

### Collection / Codes

- Collection progress uses redeemed allocation-linked codes.
- Codes show their already-known allocated character.
- Redeem action unlocks collection ownership.
- Duplicate results update `ownedCount`.
- Cancelled codes display `ĐÃ HỦY` and cannot be submitted.

### Admin

- Collector set detail gains version history and draft editor.
- Admin sees exact weights, percentages, total weight, and validation errors.
- Publishing requires confirmation and creates an audit log.
- Active/archived versions are read-only.
- Order detail shows an allocation packing list grouped by product.
- Cancellation UI displays policy restrictions and requires a reason when allocations exist.

## Backend Changes

- Make Next.js/TypeScript service code the authoritative blind-box implementation.
- Express order routes must call the same service boundary or be retired for storefront checkout.
- Add:
  - `validatePoolDraft`
  - `publishPoolVersion`
  - `selectWeightedEntry`
  - `createOrderWithAllocations`
  - `redeemAllocationCode`
  - `cancelOrder`
- Use one shared Prisma client.
- Use database constraints plus guarded updates for concurrency.
- Never swallow allocation failures and still return order success.
- Keep notifications/email outside the transaction through an outbox or best-effort post-commit hook.
- Log order/allocation IDs, but never log plaintext redemption codes in production.

## Acceptance Criteria

### Authentication And Authorization

- Unauthenticated `/checkout` redirects to login with callback.
- Unauthenticated order/redeem requests return `401`.
- A user cannot read, cancel, redeem, or retry another user's order/code.
- `/api/order-product` is not callable by storefront clients.

### Checkout And Draw

- One request creates order, items, allocations, codes, stock changes, and `PROCESSING` transition atomically.
- The server ignores client prices and totals.
- A failed draw leaves no order or stock change.
- Quantity `N` creates exactly `N` allocations and codes.
- The response includes the persisted draw results.
- Reloading confirmation returns identical results.
- The same idempotency key and payload returns the same order.
- Reusing the key with another payload returns `409`.
- Blind-box checkout is limited to five requests/minute/user.

### Pool Versions

- Drafts are editable.
- Active and archived versions are immutable.
- Publishing creates a new immutable active record and archives both the previous active version and source draft atomically.
- Database uniqueness prevents two active versions per set.
- Existing order items retain their snapshotted pool version.
- Weight is `1..1_000_000`; total is at most `10_000_000`.
- Invalid pools return `422`.

### Random Selection

- Uses `crypto.randomInt(0, totalWeight)`.
- Boundary tests cover every cumulative range.
- A 100,000-draw smoke test matches configured distribution within an agreed absolute tolerance of 1 percentage point.
- Statistical tests use deterministic injection for unit tests and are not treated as cryptographic proof.

### Redemption And Collection

- Redeem is limited to 10 requests/minute/user.
- Missing and foreign-owned codes return identical `404 CODE_NOT_FOUND_OR_UNAUTHORIZED`.
- Concurrent redemption permits exactly one successful transition.
- Redeeming unlocks the stored allocation and never redraws.
- Duplicate variants increase `ownedCount`, not unique progress.
- Ten unique slots grant exactly one set reward.

### Cancellation

- `PENDING` can be cancelled.
- Normal checkout has no visible `PROCESSING` state without allocations.
- Cancelling an allocated `PROCESSING` order voids allocations, cancels active codes, and restores SKU stock.
- `SHIPPED` and `DELIVERED` cannot be customer-cancelled.
- Granted rewards are not revoked.
- Admin cancellation writes an audit log.

### Fulfillment And UX

- Customer confirmation and admin order detail show the same allocation IDs/products.
- Warehouse receives a clear packing list.
- UI states and errors are Vietnamese-first.
- Mobile layout handles multiple reveal cards.
- Theme uses dark `#070707`, orange `#e85d00`, visible focus states, and accessible contrast.

## Test Plan

### Unit

- Pool validation boundaries and total limits.
- Active version uniqueness key behavior.
- Weighted selection cumulative boundaries.
- Default Vanie pool totals `910`.
- Idempotency request hashing.
- Cancellation state matrix.
- Duplicate ownership aggregation.

### Integration

- Authenticated atomic checkout with mixed normal/blind-box items.
- Stock race with two concurrent checkouts.
- Transaction rollback after simulated allocation failure.
- Pool publish race creates only one active version.
- Checkout uses order-item pool snapshot after a new version publishes.
- Same idempotency key retry behavior.
- Foreign order/code authorization.
- Redeem side-channel response equality.
- Concurrent redeem behavior.
- Cancellation transaction and stock restoration.

### Migration

- Both Prisma schema copies validate.
- Legacy codes remain readable/redeemable.
- Existing orders without users do not receive allocations.
- Vanie seed creates 10 entries and one active version.
- Rollback leaves historical data intact.

### End-To-End

- Login redirect to checkout callback.
- Purchase two boxes, receive two stable results and codes.
- Revisit confirmation and see identical results.
- Warehouse admin sees matching packing list.
- Redeem both codes and see collection counts update.
- Cancel eligible order and verify codes become cancelled.
- Rate-limit responses occur at the documented thresholds.

## Risks And Mitigations

- **Variant stock is operational in v1:** admin verifies physical availability before publishing; warehouse handles exceptions manually.
- **MySQL cannot express all cross-field constraints:** enforce them in validated service methods and integration tests.
- **Two backend implementations exist:** nominate the TypeScript service as authoritative and retire duplicate storefront behavior.
- **Notifications can fail:** run them post-commit so they cannot corrupt checkout atomicity.
- **Rate limiting in serverless memory is insufficient:** production must use Redis or another shared store; in-memory buckets are development-only.
- **Plaintext codes are sensitive:** never log them and restrict code queries by session ownership.
- **Existing Vietnamese encoding varies:** all new/edited content is UTF-8.

## Implementation Steps

1. Apply and validate Prisma schema changes in both schema copies.
2. Add migration/backfill and seed the default Vanie pool version.
3. Protect `/checkout` in middleware.
4. Implement shared Redis-backed rate limiting.
5. Implement pool draft, validation, publish, and version history.
6. Implement cryptographic weighted selection.
7. Implement atomic authenticated `POST /api/orders`.
8. remove/restrict storefront `/api/order-product`.
9. Implement order confirmation and authenticated order allocation reads.
10. Update redeem and collection aggregation.
11. Implement cancellation transactions and admin audits.
12. Add admin pool editor and warehouse packing view.
13. Run unit, integration, migration, and end-to-end tests.

## Remaining Non-blocking Product Choices

- Exact Vietnamese marketing language may be refined without changing contracts.
- Rarity colors/icons may be adjusted while preserving accessible contrast.
- Admin may later add per-variant inventory, pity rules, or duplicate protection as separate features.

No unresolved decision in this section blocks implementation of version 1.
