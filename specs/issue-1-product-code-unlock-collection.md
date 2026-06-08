# Issue #1: Product Code Unlock Collection

Source: https://github.com/danh2002/khunglongshop/issues/1

## Overview

Issue #1 requests a product collection mechanic where each collectible product set has 10 items. Each purchased item is tied to a unique code. After purchase, the user enters the correct code to unlock the matching item image in the collection; the remaining 9 items stay hidden as blacked-out cards or question marks until their own codes are redeemed.

The current codebase already has a collector foundation:

- `CollectorSet.totalSlots`
- `Product.isCollector`, `Product.setId`, `Product.setSlotNumber`
- `RedemptionCode`
- `SetReward`
- `/api/merch/my-codes`
- `/api/merch/my-collection`
- `/account/codes`
- `/account/collection`
- `handleOrderCollectorItems(orderId, userId)`

This feature should refine that existing flow so a purchase creates a code, but a collection slot is only visually unlocked after the user redeems/enters that code.

## Goals

- Support collector sets with exactly 10 slots for this issue's product unlock mechanic.
- Generate a unique redemption code for each purchased collector product after a successful order.
- Let authenticated users enter a code to unlock the corresponding purchased product slot.
- Show unlocked slots with the real product image and name.
- Show locked slots as blacked-out/unknown cards with a question mark or similar hidden state.
- Prevent users from redeeming codes they do not own.
- Prevent one code from unlocking multiple slots.
- Preserve the existing set completion reward flow after all 10 slots are unlocked.
- Keep the UI aligned with the dark `#070707` and orange `#e85d00` dinosaur shop theme.

## Non-goals

- Do not build the external game reward redemption flow; `/api/game/redeem` already handles set reward codes.
- Do not redesign checkout/payment.
- Do not expose all product details for locked slots beyond slot number and locked state.
- Do not allow public or anonymous code redemption.
- Do not add a new database technology as part of this feature.

## User Stories / UX Flow

1. As a customer, after I buy a collector product, I receive a unique code for that product.
2. As a customer, I open "Mã của tôi" or "Bộ sưu tập của tôi" and enter the code.
3. If the code is valid and belongs to me, the matching slot unlocks.
4. The unlocked slot shows the product image and name.
5. Other slots in the same 10-item set remain locked as blacked-out cards or question marks.
6. If I enter an invalid, already-used, or not-owned code, I see a clear Vietnamese error message.
7. When I unlock all 10 slots in a set, I receive the existing set completion reward code.

Suggested Vietnamese UI copy:

- Input label: `Nhập mã mở khóa`
- Submit button: `Mở khóa`
- Success toast: `Đã mở khóa vật phẩm!`
- Invalid code: `Mã không hợp lệ hoặc không thuộc tài khoản của bạn.`
- Already used: `Mã này đã được sử dụng.`
- Locked slot label: `Chưa mở khóa`
- Progress label: `{unlocked}/10 đã mở khóa`

## Technical Design

### Current Behavior To Change

`/api/merch/my-collection` currently treats a slot as collected when a `RedemptionCode` exists for the user and product. That means buying a product effectively unlocks the image immediately.

The new behavior should treat a slot as unlocked only when:

- a `RedemptionCode` exists for the authenticated user and product, and
- `RedemptionCode.isUsed === true`.

Unused codes should still appear in `/account/codes`, but they should not unlock collection images until redeemed.

### Redemption Rules

When a user submits a code:

1. Require an authenticated session.
2. Normalize the code by trimming whitespace and uppercasing.
3. Find `RedemptionCode` by `code`.
4. Validate:
   - code exists,
   - `code.userId` matches the session user,
   - `code.isUsed` is false,
   - linked product exists,
   - linked product has `isCollector = true`,
   - linked product belongs to a `CollectorSet`,
   - linked product has a valid `setSlotNumber`.
5. In a transaction, mark the code used:
   - `isUsed = true`
   - `usedAt = now`
6. Check whether the user's set is now complete.
7. If complete and no `SetReward` exists, create the reward using existing `generateSetRewardCode()` logic and send the existing completion email.
8. Return the unlocked product/slot and optional set reward.

### Collection Display Rules

For each `CollectorSet`:

- Render exactly `totalSlots` slots.
- For unlocked slots, include product `id`, `name`, `image`, and code status.
- For locked slots, return `product: null` or a minimal redacted product payload.
- The frontend should display locked slots with dark/black overlay, dashed border, and question mark.
- Progress should count only unlocked slots.
- `isComplete` should be true only when all 10 slots are unlocked.

### Admin/Product Constraints

The admin collector set flow should prevent invalid 10-slot sets:

- For this feature, `CollectorSet.totalSlots` should be 10 by default.
- A set should not have more than one collector product assigned to the same `setSlotNumber`.
- Slot numbers should be 1 through 10.
- Admin product forms should make `isCollector`, `setId`, and `setSlotNumber` easy to configure.

Existing admin pages already include collector set and product surfaces; implementation should extend those conventions instead of adding a separate admin app.

## API Changes

### New Endpoint: `POST /api/merch/redeem-code`

Use a Next.js App Router route handler.

Request body:

```json
{
  "code": "DKL-ABCD-1234-EF56"
}
```

Validation:

- Use Zod or the project's existing validation helpers.
- `code` is required.
- Trim and uppercase before lookup.
- Reject very long input to avoid unnecessary database work.

Success response:

```json
{
  "success": true,
  "unlockedSlot": {
    "setId": "collector_set_id",
    "slotNumber": 1,
    "product": {
      "id": "product_id",
      "name": "Tên sản phẩm",
      "image": "images/mk1.png"
    }
  },
  "setComplete": false,
  "setReward": null
}
```

Completion response:

```json
{
  "success": true,
  "unlockedSlot": {
    "setId": "collector_set_id",
    "slotNumber": 10,
    "product": {
      "id": "product_id",
      "name": "Tên sản phẩm",
      "image": "images/mk10.png"
    }
  },
  "setComplete": true,
  "setReward": {
    "rewardCode": "DKLS-ABCD-1234",
    "isClaimed": false
  }
}
```

Error responses:

- `401 Unauthorized`: no session.
- `400 Bad Request`: missing/malformed code.
- `404 Not Found`: code not found or not owned by user. Prefer a generic message to avoid leaking code ownership.
- `409 Conflict`: code already used.
- `422 Unprocessable Entity`: code exists but linked product is not a valid collector item.
- `500 Internal Server Error`: unexpected failure.

### Update Endpoint: `GET /api/merch/my-collection`

Change slot logic:

- `isCollected` should be renamed or aliased to `isUnlocked`.
- `isUnlocked = Boolean(code && code.isUsed)`.
- Locked slots must not expose product image/name if the design requires mystery.
- `isComplete` must require every slot to be unlocked, not merely purchased.

Suggested response slot shape:

```ts
type CollectionSlot = {
  slotNumber: number;
  isUnlocked: boolean;
  product: null | {
    id: string;
    name: string;
    image: string | null;
  };
};
```

### Update Endpoint: `GET /api/merch/my-codes`

Keep returning unused product codes so users can copy or redeem them. Consider adding:

```ts
canRedeem: boolean;
redeemedAt: string | null;
```

## Schema / Prisma Changes

The current Prisma datasource is `mysql`, while the project brief mentions PostgreSQL. Confirm the intended provider before generating migrations. The feature can be implemented with the existing Prisma models, but indexes and constraints should be added.

Recommended Prisma updates:

```prisma
model Product {
  // existing fields...
  setId         String?
  setSlotNumber Int?

  @@unique([setId, setSlotNumber])
  @@index([isCollector])
}

model RedemptionCode {
  id        String    @id @default(cuid())
  code      String    @unique
  productId String
  orderId   String
  userId    String
  isUsed    Boolean   @default(false)
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
  @@index([productId])
  @@index([userId, isUsed])
}

model SetReward {
  // existing fields...
  @@unique([userId, setId])
}
```

Migration notes:

- `@@unique([setId, setSlotNumber])` with nullable `setId` is acceptable in MySQL/PostgreSQL for multiple null rows, but verify generated SQL.
- Before adding the unique constraint, run a duplicate check for collector products that share the same `setId` and `setSlotNumber`.
- If duplicate slot data exists, clean it before applying the migration.

## Frontend Changes

### `/account/collection`

- Add a compact redeem-code form near the page header or per set.
- On successful redemption:
  - update local collection state or refetch `/api/merch/my-collection`,
  - show success toast,
  - animate the newly unlocked slot.
- Change progress copy to count unlocked slots.
- Keep locked slots as blacked-out/question-mark cards.
- Ensure mobile layout does not overflow for long Vietnamese text and code strings.

### `/account/codes`

- Add a `Mở khóa` action next to unused product codes.
- Used codes should show `ĐÃ SỬ DỤNG`.
- Reward codes remain separate from product unlock codes.
- Avoid sending reward codes to the product unlock endpoint.

### Product Detail Page

- For collector products, show collector metadata:
  - set name,
  - slot number out of 10,
  - note that purchase grants a code to unlock the collection slot.

## Backend Changes

- Add `app/api/merch/redeem-code/route.ts`.
- Add a shared service helper, for example `lib/collectorService.ts`:
  - `redeemProductCodeForUser(code: string, userId: string)`
  - reuse existing `checkSetCompletion`
  - reuse existing reward generation and email flow
- Update `handleOrderCollectorItems` only if it currently grants completion based on unused codes. Completion should happen after code redemption, not at purchase time.
- Use a Prisma transaction for marking a code used and creating the set reward.

## Implementation Steps

1. Add Prisma indexes/constraints after checking duplicate slot data.
2. Update `checkSetCompletion` to count only `RedemptionCode.isUsed = true`.
3. Add `redeemProductCodeForUser` service with transaction-safe code redemption.
4. Add `POST /api/merch/redeem-code` route handler with session auth and Zod validation.
5. Update `/api/merch/my-collection` to return locked vs unlocked state correctly.
6. Update `/account/collection` with redeem form, progress based on unlocked count, and unlock animation/refetch.
7. Update `/account/codes` with direct redeem action for unused product codes.
8. Update product detail page collector messaging.
9. Add/adjust admin validation for 10 slots and unique slot assignment.
10. Add tests for API, service, collection response, and UI states.

## Test Cases

### Unit / Service

- `redeemProductCodeForUser` succeeds for an unused code owned by the current user.
- It trims/lowercase input and still matches the normalized uppercase code.
- It rejects a code owned by another user.
- It rejects a missing code.
- It rejects an already-used code.
- It rejects a code for a non-collector product.
- It marks `isUsed` and `usedAt`.
- It does not create duplicate `SetReward` rows.
- It creates a set reward only after all 10 slots are unlocked.

### API Integration

- `POST /api/merch/redeem-code` returns 401 without session.
- It returns 400 for missing/malformed body.
- It returns 404 for unknown/not-owned code.
- It returns 409 for already-used code.
- It returns 200 with unlocked slot payload.
- It returns 200 with set reward when the final slot is unlocked.
- Rate limiting should be considered if abuse appears in testing.

### Collection API

- Unused purchased code does not unlock the slot.
- Used code unlocks only the matching slot.
- Locked slots hide product image/name.
- `isComplete` is false when 9/10 slots are unlocked.
- `isComplete` is true when 10/10 slots are unlocked.

### Frontend

- Collection page shows 10 slots.
- Locked slots show question marks/blackout state.
- Redeeming a valid code updates the grid without a full manual refresh.
- Invalid code shows Vietnamese error copy.
- Long code strings do not overflow on mobile.
- Codes page distinguishes product codes from reward codes.

## Risks / Open Questions

- Database provider mismatch: local Prisma schema uses MySQL, while the project description mentions PostgreSQL. Confirm before generating migrations.
- Existing UI text appears to have encoding issues in some files. Fixing encoding globally is outside this spec, but new Vietnamese copy should be saved correctly as UTF-8.
- Clarify whether every collector set must always have exactly 10 slots or whether issue #1 applies only to a specific product/set.
- Clarify whether code entry should happen primarily on `/account/codes`, `/account/collection`, product detail, or all of them.
- Clarify whether locked slots should reveal product names but hide images, or hide both name and image.
- Current `handleOrderCollectorItems` may grant set rewards at purchase time if all products are bought; this must move to redemption time to match the requested unlock mechanic.
