# 005 — Short order number, clean status enum, hide blind-box reveal on order page

**Written against:** current HEAD  
**Scope:**
- `prisma/schema.prisma` + migration SQL
- `app/api/orders/route.ts` (checkout)
- `app/api/admin/orders/**`
- `app/account/orders/[id]/page.tsx`
- `components/` order-related UI
- CMS admin order status dropdown

**Out of scope:** notification content, redemption code flow, collection page  
**Executor model:** mid-tier or above (schema migration required)  
**Risk:** MEDIUM — enum change requires DB migration; existing SHIPPED/DELIVERED rows must be remapped

---

## Background

Three independent changes bundled because they all touch `Customer_order`:

1. **Short order number:** `id` is a UUID — ugly in UI. Add `orderNumber` auto-increment field, display as `#100001`.
2. **Status enum cleanup:** current `PENDING → PROCESSING → SHIPPED → DELIVERED → CANCELLED` maps poorly to the business (blind box shop, no separate shipping step needed). Replace with `PENDING_PAYMENT → PROCESSING → COMPLETED → CANCELLED`.
3. **Hide blind-box reveal on order page:** `BlindBoxAllocation` result and `RedemptionCode` are shown on order detail — remove them. User discovers result by physically opening the package and entering the code manually.

---

## Pre-flight

```bash
npm run db:generate
npm run type-check
npx vitest run --exclude "tests/otp/**"
```

Record current passing test count.

---

## Step 1 — Add `orderNumber` to schema

File: `prisma/schema.prisma`

In `model Customer_order`, add after `id`:
```prisma
orderNumber Int @unique @default(autoincrement())
```

Add index:
```prisma
@@index([orderNumber])
```

**Do NOT run `prisma migrate` automatically.** Write the migration SQL manually (Step 2).

---

## Step 2 — Update `OrderStatus` enum in schema

Replace:
```prisma
enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}
```

With:
```prisma
enum OrderStatus {
  PENDING_PAYMENT
  PROCESSING
  COMPLETED
  CANCELLED
}
```

---

## Step 3 — Write and apply migration SQL

Create file: `prisma/migrations/005_order_number_status/migration.sql`

```sql
-- Add orderNumber column
ALTER TABLE `Customer_order`
  ADD COLUMN `orderNumber` INT NOT NULL AUTO_INCREMENT UNIQUE;

-- Remap old status values to new enum values
UPDATE `Customer_order` SET status = 'PENDING_PAYMENT' WHERE status = 'PENDING';
UPDATE `Customer_order` SET status = 'COMPLETED' WHERE status = 'DELIVERED';
UPDATE `Customer_order` SET status = 'COMPLETED' WHERE status = 'SHIPPED';

-- Modify enum column (MySQL requires full column redefinition)
ALTER TABLE `Customer_order`
  MODIFY COLUMN `status` ENUM('PENDING_PAYMENT','PROCESSING','COMPLETED','CANCELLED')
  NOT NULL DEFAULT 'PENDING_PAYMENT';
```

Apply via:
```bash
npx prisma db execute --file prisma/migrations/005_order_number_status/migration.sql --schema prisma/schema.prisma
npm run db:generate
```

**STOP condition:** If `db execute` fails with foreign key or enum constraint error,
run `SET FOREIGN_KEY_CHECKS=0;` before the ALTER and `SET FOREIGN_KEY_CHECKS=1;` after.

---

## Step 4 — Update all TypeScript references to old status values

Search and replace across codebase:

| Old value | New value |
|---|---|
| `OrderStatus.PENDING` | `OrderStatus.PENDING_PAYMENT` |
| `OrderStatus.DELIVERED` | `OrderStatus.COMPLETED` |
| `OrderStatus.SHIPPED` | `OrderStatus.COMPLETED` |
| `"PENDING"` (string literal in order context) | `"PENDING_PAYMENT"` |
| `"DELIVERED"` | `"COMPLETED"` |
| `"SHIPPED"` | `"COMPLETED"` |

Run:
```powershell
Get-ChildItem -Recurse -Include "*.ts","*.tsx" | Select-String "SHIPPED|DELIVERED|OrderStatus.PENDING[^_]"
```

Fix every match. Do NOT change `RedemptionCodeStatus` or other enums.

**Verification:**
```bash
npm run type-check
# expected: no errors
```

---

## Step 5 — Display `orderNumber` in UI

### 5a — Order list page (`app/account/orders/page.tsx`)

Replace UUID display with orderNumber:
```tsx
// Before:
<span>Đơn #{order.id.slice(0, 8)}</span>

// After:
<span>Đơn #{order.orderNumber}</span>
```

### 5b — Order detail page (`app/account/orders/[id]/page.tsx`)

Same replacement for the heading.

Also ensure API responses include `orderNumber`. Check `app/api/account/orders/route.ts`
and `app/api/account/orders/[id]/route.ts` — add `orderNumber: true` to any
`select` block that omits it.

### 5c — Admin order list and detail

Same pattern in `app/admin/orders/` pages.

---

## Step 6 — Remove blind-box reveal from order detail page

File: `app/account/orders/[id]/page.tsx`

Find and **remove** the section rendering:
- `BlindBoxAllocation` result card ("KẾT QUẢ TÚI MÙ" section visible in screenshot)
- Any `RedemptionCode` display tied to the order

Do NOT remove the allocation data from the API — it may be used elsewhere.
Only remove the UI render block on the order detail page.

**STOP condition:** If the reveal section is a shared component used on other
pages, add a prop `showReveal={false}` to hide it on order detail only rather
than deleting the component.

**Verification:** Open order detail page → no blind-box result section visible.

---

## Step 7 — Update CMS admin order status dropdown

File: `app/admin/orders/[id]/page.tsx` (or wherever the status `<select>` lives)

Replace options:
```tsx
// Remove:
<option value="SHIPPED">Đang giao</option>
<option value="DELIVERED">Đã giao</option>

// Keep/rename:
<option value="PENDING_PAYMENT">Chờ thanh toán</option>
<option value="PROCESSING">Đang xử lý</option>
<option value="COMPLETED">Hoàn thành</option>
<option value="CANCELLED">Đã huỷ</option>
```

Also update any status badge/label map in the UI:
```ts
const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PROCESSING: 'Đang xử lý',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã huỷ',
}
```

---

## Step 8 — Verify

```bash
npm run type-check   # must pass
npx vitest run --exclude "tests/otp/**"   # must pass, same count as pre-flight
npm run build        # must pass
```

Manual smoke:
- Place a new order → `orderNumber` shows as `#100001` (or next in sequence)
- Admin order detail → status dropdown shows 4 options only
- User order detail → no blind-box result section
- Change status to COMPLETED in admin → UI reflects "Hoàn thành"

---

## Done criteria

- [ ] `Customer_order` has `orderNumber` INT AUTO_INCREMENT
- [ ] `OrderStatus` enum has 4 values: `PENDING_PAYMENT, PROCESSING, COMPLETED, CANCELLED`
- [ ] No `SHIPPED` or `DELIVERED` references in TypeScript files
- [ ] Order list/detail shows `#orderNumber` not UUID
- [ ] Blind-box reveal section removed from user order detail page
- [ ] CMS dropdown has 4 status options with Vietnamese labels
- [ ] `npm run type-check` passes
- [ ] `npx vitest run --exclude "tests/otp/**"` passes
- [ ] `npm run build` passes (manual, requires live DB)
