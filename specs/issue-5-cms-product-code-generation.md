# Issue #5: Chức năng add code cho sản phẩm trong CMS

Source: https://github.com/danh2002/khunglongshop/issues/5#issue-4671844063

## Overview

Issue #5 yêu cầu CMS có thể tạo code mở khóa cho từng sản phẩm collector:

1. Admin có thể generate nhiều code cho một sản phẩm.
2. Thao tác mặc định là tạo 10 code cho 1 sản phẩm.
3. Admin có thể tạo 100 code cho một sản phẩm bằng cùng API single-product nếu cần.
4. Không code nào được trùng với code đã tồn tại trong hệ thống.
5. Khi user nhập 10 code của sản phẩm 1, sản phẩm đó trong bộ sưu tập hiển thị là `x10`.
6. Code nhập xong không thể nhập lại và phải dính chặt với account đã redeem.

Decision for this issue:

- Generation is single-product plus quantity only.
- `POST /api/admin/redemption-codes` takes `{ productId, quantity }`.
- There is no multi-product creation endpoint or combined multi-product workflow in this issue.
- Creating codes across multiple products means admin repeats the same CMS action once per product.
- Generated codes are always unowned and unassigned. The first eligible user who redeems an active unowned code becomes its owner.

Repository đã có nền tảng gần đúng:

- Prisma `RedemptionCode` có `code @unique`, `productId`, `userId`, `orderId`, `status`, `isUsed`, `usedAt`.
- `lib/codes.ts` đã có `generateRedemptionCode()`.
- `lib/collectorService.ts` đã có `redeemProductCodeForUser()`, transaction redeem code, owner lock, duplicate ownership count, và grant set reward.
- `/api/merch/redeem-code` đã dùng flow redeem hiện tại.
- `/api/merch/my-collection` đã trả ownership theo từng product slot và phải trả rõ `ownedCount`.
- `/api/admin/redemption-codes` đã có `GET` danh sách và `POST` tạo nhiều code theo `quantity`.
- `/admin/redemption-codes` đã có trang CMS xem code, lọc theo set/status/search, và disable code active.

Vì vậy issue này không tạo hệ thống code mới. Mục tiêu là hoàn thiện trải nghiệm CMS tạo code cho một product tại một thời điểm, siết chặt contract tạo code, và bảo đảm collection hiển thị duplicate count như yêu cầu.

## User Flows

1. Admin mở `/admin/redemption-codes`, tìm/chọn một collector product, nhập quantity, tạo code, rồi copy các code vừa tạo vào clipboard.
2. Admin muốn tạo code cho nhiều sản phẩm thì lặp lại flow tạo code cho từng sản phẩm riêng lẻ.
3. Admin xem danh sách code, tìm kiếm hoặc lọc theo collection set, product, user, status, rồi disable code active chưa dùng nếu cần.
4. User role `user` mở `/account/collection`, nhập một active unowned code, code chuyển sang `REDEEMED` và gắn với account đó.
5. User role `user` redeem nhiều code của cùng một product, slot collection vẫn là một slot nhưng hiển thị count như `x10`.
6. Guest redeem code thì nhận `401`.
7. Admin/staff redeem code thì bị từ chối bằng lỗi rõ ràng vì chỉ role `user` được redeem collector code; role/authorization checks run before rate limiting, so admin/staff always receive `403 REDEEM_ROLE_NOT_ALLOWED`.
8. User nhập code sai, code disabled, code already redeemed, hoặc code đã thuộc user khác thì nhận lỗi an toàn và không lộ owner.
9. User nhập code quá nhanh thì nhận `429 RATE_LIMITED` và UI hiển thị thông báo thử lại sau.

## Goals

- Cho admin tạo code cho một sản phẩm collector ngay trong CMS.
- Hỗ trợ quantity mặc định `10` và cho phép admin nhập quantity hợp lệ tới `500`.
- Bảo đảm mọi code được tạo là duy nhất toàn hệ thống.
- Không cho code đã redeem được redeem lại bởi cùng user hoặc user khác.
- Khi code chưa có owner được redeem bởi role `user`, code chuyển sang owner của account redeem và không thể đổi owner nữa.
- Bộ sưu tập của user hiển thị đúng số lượng duplicate của từng sản phẩm, ví dụ `x10`.
- Admin xem được danh sách code, product, collection set, owner, trạng thái, ngày tạo, ngày redeem.
- Admin copy được các code vừa tạo vào clipboard trong v1.
- Có test cho unique generation, create request atomicity, redeem lock, role eligibility, duplicate ownership count, và admin API validation.

## Non-Goals

- Không xây hệ thống campaign/voucher mới.
- Không thêm multi-product creation endpoint trong issue này.
- Không đổi format code nếu format hiện tại `DKL-XXXX-XXXX-XXXX` đủ dùng.
- Không cho user tự generate code.
- Không cho redeem code ngoài account đã đăng nhập.
- Không cho admin/staff redeem collector code.
- Không cho code redeemed đổi owner hoặc reset về active trong issue này.
- Không hỗ trợ owner/order pre-assignment khi tạo code trong issue này.
- Không xuất CSV trong v1; CSV export là candidate cho follow-up issue.
- Không thay đổi cơ chế reward hoàn thành set, trừ khi duplicate count làm lộ bug hiện có.
- Không thêm marketplace, payment, hoặc shipping behavior mới.
- Không redesign toàn bộ CMS.

## Functional Requirements

### FR-1: Admin tạo code cho một sản phẩm

Admin có thể chọn một sản phẩm collector trong CMS và tạo `quantity` active code cho sản phẩm đó.

Acceptance criteria:

- Chỉ admin active được gọi API tạo code.
- Request body chỉ nhận `productId` và `quantity`.
- `productId` bắt buộc tồn tại.
- Product phải là collector item hợp lệ: `isCollector = true`, có `setId`, có `setSlotNumber`.
- `quantity` là số nguyên từ `1` đến `500`.
- Quantity mặc định trong UI là `10`.
- API trả danh sách code vừa tạo, kèm product metadata tối thiểu để admin xác nhận.
- Code được tạo với `userId = null`, `orderId = null`, `status = ACTIVE`, `isUsed = false`, `usedAt = null`.

### FR-2: Code uniqueness và atomic create request

Mỗi create request tạo code cho đúng một product và phải tạo đủ số lượng yêu cầu hoặc không tạo code nào.

Acceptance criteria:

- `RedemptionCode.code` tiếp tục là unique constraint ở database.
- Code generation retry khi gặp unique collision.
- Nếu không tạo đủ số lượng sau retry, transaction rollback toàn bộ create request.
- Response thành công chỉ trả khi đã tạo đủ `quantity`.
- Test mô phỏng collision phải chứng minh retry tạo đủ số lượng.
- Admin muốn tạo code cho nhiều product thì lặp lại request một lần cho mỗi product.

### FR-3: CMS create-code UX

CMS hỗ trợ thao tác nhanh để tạo code cho một product.

Acceptance criteria:

- Trang `/admin/redemption-codes` có form tạo code với product selector và quantity.
- Product selector lấy dữ liệu từ `/api/admin/products`.
- `/api/admin/products` phải hỗ trợ query collector-only bằng param canonical duy nhất `collectorOnly=true`.
- `/api/admin/products` phải hỗ trợ search và pagination đủ cho selector UI.
- Selector chỉ hiển thị product collector hợp lệ cho code generation: `isCollector = true`, có valid `setId`, và có valid `setSlotNumber`.
- Quantity mặc định là `10`.
- Form có thể submit tạo `10` code cho product đang chọn.
- Sau khi tạo thành công, admin thấy danh sách code mới tạo để copy vào clipboard.
- Nếu `navigator.clipboard.writeText` thất bại hoặc không khả dụng, UI hiển thị error toast nhưng vẫn giữ danh sách code vừa tạo trên màn hình và cho phép copy thủ công, ví dụ bằng `readOnly textarea` hoặc vùng text có `user-select: text`.
- Sau khi refresh page, nhóm kết quả "vừa tạo" không được preserve vì v1 không có batch/history model. Đây là hành vi chủ ý, không phải bug; các code đã tạo vẫn lưu trong database và vẫn tìm được qua code list/search.
- Nếu admin nhập số lượng lớn như `100`, UI hiển thị trạng thái xử lý rõ ràng và vẫn chỉ tạo code cho product đang chọn.

### FR-4: Redeem single-use, account-bound, user-only

Chỉ account role `user` được redeem collector code. Code sau khi redeem không thể nhập lại nữa và gắn chặt với account đã redeem.

Acceptance criteria:

- Redeem service kiểm tra role hiện tại của account từ database.
- Guest không có session nhận `401`.
- Account không có role `user`, bao gồm admin/staff, bị từ chối bằng lỗi rõ ràng, ví dụ `403 REDEEM_ROLE_NOT_ALLOWED`.
- Role/authorization checks phải chạy trước rate-limit checks. Admin/staff luôn nhận `403 REDEEM_ROLE_NOT_ALLOWED`, bất kể request frequency, và không bao giờ nhận `429` thay cho `403`.
- Nếu user nhập code quá nhanh và bị rate limit, API trả `429 RATE_LIMITED` và UI hiển thị thông báo thử lại sau.
- Redeem thành công update code trong transaction: `status = REDEEMED`, `isUsed = true`, `userId = currentUserId`, `usedAt = now`.
- Redeem code đã `REDEEMED`, `DISABLED`, `CANCELLED` trả lỗi không thành công.
- Nếu code có `userId` khác current user, API trả lỗi như không tìm thấy để tránh lộ code.
- Nếu code chưa có `userId`, user đầu tiên redeem sẽ trở thành owner.
- Nếu code có `userId` là current user và `status = ACTIVE`, user đó redeem được.
- Admin owner reassignment route hiện có vẫn không được đổi owner khi code đã dùng hoặc không active.

### FR-5: Collection duplicate count

Khi user redeem nhiều code của cùng một sản phẩm, bộ sưu tập hiển thị số lượng user sở hữu sản phẩm đó.

Acceptance criteria:

- `/api/merch/my-collection` response phải có `ownedCount` trên từng slot.
- `ownedCount` bằng số code `REDEEMED` của user cho product của slot đó.
- Frontend type `CollectionSet` trong `app/account/collection/page.tsx` phải khai báo `ownedCount: number` cho từng slot.
- UI `/account/collection` hiển thị badge/count `xN` khi `ownedCount > 1`.
- Với 10 code của sản phẩm 1 đã redeem, slot sản phẩm 1 hiển thị `x10`.
- Progress hoàn thành set vẫn tính theo số slot/product unique, không tính duplicate thành slot mới.
- Reward hoàn thành set chỉ dựa trên đủ product slot unique, không dựa trên tổng duplicate count.

### FR-6: Admin quản trị code

Admin có thể xem, tìm, lọc, disable, và copy generated code trong CMS.

Acceptance criteria:

- Danh sách code có search theo code, product title, user email, order id.
- Filter theo collection set, product, user, status.
- Hiển thị status `ACTIVE`, `REDEEMED`, `DISABLED`, `CANCELLED`.
- Hiển thị created date và used date nếu có.
- Chỉ code `ACTIVE` và chưa `usedAt` mới disable được.
- Disable code không xóa dữ liệu.
- Sau create request thành công, UI cung cấp copy-to-clipboard cho danh sách code vừa tạo.
- Nếu clipboard API thất bại hoặc không khả dụng, UI hiển thị error toast và vẫn cho phép admin copy thủ công từ danh sách code đang hiển thị.
- Nhóm result vừa tạo chỉ tồn tại trong state của page hiện tại. Sau refresh, admin dùng list/search để tìm lại code đã persist.
- CSV export không thuộc v1 và không được triển khai trong issue này.

## Architecture Decisions

### AD-1: Dùng tiếp `RedemptionCode`

Decision: Không thêm model code mới. Dùng `RedemptionCode` hiện tại làm nguồn dữ liệu chính.

Rationale:

- Schema đã có unique code, product relation, owner, order relation, status và timestamp.
- Redeem flow hiện tại đã transaction-safe và đã trả ownership count.
- Giảm rủi ro phải migrate dữ liệu cũ.

Alternative considered:

- Thêm model code mới. Không cần ở issue này vì dữ liệu hiện tại đã đủ cho single-product generation và redeem.

### AD-2: Single-product create request là atomic transaction

Decision: Mỗi request tạo code cho một product và chạy trong một database transaction. Thành công nghĩa là đủ số lượng; thất bại rollback toàn bộ request.

Rationale:

- Admin cần biết request 10/100 đã tạo đủ.
- Tránh trạng thái partial khó vận hành.
- Audit log và code creation phải nhất quán với nhau.

Alternative considered:

- Cho phép partial success. Không chọn vì làm workflow copy 100 code dễ sai.

### AD-3: Product phải là collector item hợp lệ

Decision: Admin code generation chỉ tạo cho product `isCollector` có `setId` và `setSlotNumber`.

Rationale:

- Redeem hiện tại từ chối code không liên kết collector item hợp lệ.
- Tạo code cho product thường sẽ gây lỗi muộn ở phía user.

Alternative considered:

- Cho phép mọi product. Không chọn trong issue này vì yêu cầu gắn với bộ sưu tập.

### AD-4: Duplicate count không thay đổi completion logic

Decision: `ownedCount` tăng theo số code redeemed, nhưng collection completion vẫn tính unique slot.

Rationale:

- Yêu cầu `x10` là số lượng sở hữu cùng sản phẩm.
- Hoàn thành bộ sưu tập vẫn cần đủ các sản phẩm khác nhau trong set.

### AD-5: Generated code không pre-assign owner/order

Decision: Create-code API không nhận `userId` hoặc `orderId`. Tất cả generated code trong issue này là unowned/unassigned.

Rationale:

- GitHub issue yêu cầu code dính chặt với account sau khi nhập, không yêu cầu pre-assignment.
- Pre-assignment thêm user/order lookup, validation, và vận hành khác.

Follow-up candidate:

- Owner/order pre-assignment có thể là issue riêng nếu cần phát code cho đơn hàng hoặc user cụ thể.

### AD-6: CSV export là follow-up

Decision: v1 chỉ hỗ trợ copy-to-clipboard cho code vừa tạo. CSV export không thuộc scope issue này.

Rationale:

- Issue cần generate và redeem semantics trước.
- File export thêm quyền truy cập dữ liệu, UX download, và test riêng.

Follow-up candidate:

- CSV export cho code list hoặc generated-code result.

## API Contracts

### `GET /api/admin/redemption-codes`

Existing endpoint, mở rộng validation query.

Query:

```ts
type AdminRedemptionCodeQuery = {
  page?: number;
  limit?: number;
  search?: string;
  set?: string;
  product?: string;
  user?: string;
  status?: "ACTIVE" | "REDEEMED" | "DISABLED" | "CANCELLED";
};
```

Response:

```ts
type AdminRedemptionCodeListResponse = {
  items: Array<{
    id: string;
    code: string;
    productId: string;
    userId: string | null;
    orderId: string | null;
    status: "ACTIVE" | "REDEEMED" | "DISABLED" | "CANCELLED";
    isUsed: boolean;
    usedAt: string | null;
    createdAt: string;
    product: {
      id: string;
      title: string;
      slug: string;
      mainImage: string;
      setSlotNumber: number | null;
      set: { id: string; name: string } | null;
    };
    user: { id: string; email: string; role: string } | null;
    order: { id: string; email: string } | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};
```

Rules:

- Invalid `status`, `page`, `limit` trả `400 VALIDATION_ERROR`.
- Không silently bỏ qua status sai.

### `POST /api/admin/redemption-codes`

Existing endpoint, siết lại validation và transaction.

Body:

```ts
type CreateRedemptionCodesRequest = {
  productId: string;
  quantity: number;
};
```

Response `201`:

```ts
type CreateRedemptionCodesResponse = {
  product: {
    id: string;
    title: string;
    slug: string;
    mainImage: string;
    setSlotNumber: number;
    set: { id: string; name: string };
  };
  items: Array<{
    id: string;
    code: string;
    productId: string;
    userId: null;
    orderId: null;
    status: "ACTIVE";
    isUsed: false;
    usedAt: null;
    createdAt: string;
  }>;
};
```

Rules:

- Product không tồn tại: `404 PRODUCT_NOT_FOUND`.
- Product không phải collector item hợp lệ: `422 INVALID_COLLECTOR_ITEM`.
- Request có field ngoài `productId` và `quantity`, như `userId` hoặc `orderId`, phải bị từ chối bằng `400 VALIDATION_ERROR`.
- Tạo trong transaction.
- Retry unique collision trên từng code value.
- Nếu không tạo được unique code sau retry: `500 CODE_GENERATION_FAILED`, rollback toàn bộ request.
- `AdminAuditLog` write chạy trong cùng transaction với redemption code creation.
- Nếu audit log write thất bại, transaction rollback và không code nào được tạo.

### `GET /api/admin/products`

Existing endpoint được tái sử dụng cho product selector.

Query additions:

```ts
type AdminProductsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  collectorOnly?: "true" | "false";
};
```

Rules:

- Selector UI dùng `collectorOnly=true`.
- `collectorOnly=true` là param canonical duy nhất cho collector selector trong issue này.
- Endpoint phải hỗ trợ search theo title/slug đủ cho selector.
- Endpoint phải hỗ trợ pagination để tránh tải toàn bộ catalog.
- Khi `collectorOnly=true`, response chỉ trả products fully valid for code generation: `isCollector = true`, valid `setId`, và valid `setSlotNumber`.
- Selector không được surface product mà create-codes API sẽ reject vì thiếu collector metadata.
- Create-codes API vẫn giữ validation product là final guard nếu request bị gọi trực tiếp hoặc dữ liệu thay đổi sau khi selector load.

### `GET /api/merch/my-collection`

Response slot contract phải bao gồm `ownedCount`.

```ts
type MyCollectionResponse = Array<{
  set: {
    id: string;
    name: string;
    description: string | null;
    totalSlots: number;
  };
  slots: Array<{
    slotNumber: number;
    productId: string | null;
    ownedCount: number;
    firstRedeemedAt: string | null;
    product: {
      id: string;
      name: string;
      image: string | null;
    } | null;
    code: string | null;
    isUnlocked: boolean;
    isCollected: boolean;
  }>;
  isComplete: boolean;
  setReward: {
    rewardCode: string;
    isClaimed: boolean;
  } | null;
}>;
```

Rules:

- `ownedCount` is `0` for locked/empty slots.
- `ownedCount` counts only `REDEEMED` codes for the current user and slot product.
- Frontend type in `app/account/collection/page.tsx` must mirror this field.

### `POST /api/merch/redeem-code`

Existing endpoint, add explicit role eligibility.

Rules:

- No session: `401`.
- Session user missing from database, inactive, or role is not `user`: `403 REDEEM_ROLE_NOT_ALLOWED`.
- Role/authorization checks run before rate-limit checks.
- Admin/staff accounts always receive `403 REDEEM_ROLE_NOT_ALLOWED`, regardless of request frequency.
- Rate limited redeem attempts from role `user` accounts: `429 RATE_LIMITED`.
- Only role `user` can call `redeemProductCodeForUser()` successfully.
- Other redeem errors keep the existing safe behavior for invalid/already used/not owned codes.

## Data Model and Transactions

No required schema change.

Existing model:

```prisma
model RedemptionCode {
  id           String               @id @default(cuid())
  code         String               @unique
  productId    String
  product      Product              @relation(fields: [productId], references: [id], onDelete: Restrict)
  allocationId String?              @unique
  orderId      String?
  userId       String?
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
```

Creation invariants:

- CMS-created codes set `userId = null`.
- CMS-created codes set `orderId = null`.
- CMS-created codes set `status = ACTIVE`.
- CMS-created codes set `isUsed = false`.
- CMS-created codes set `usedAt = null`.

Transaction invariants:

- `POST /api/admin/redemption-codes` creates all requested codes and the `AdminAuditLog` record inside one database transaction.
- If any code create fails after retry exhaustion, the transaction rolls back and no codes are created.
- If the `AdminAuditLog` write fails, the transaction rolls back and no codes are created.
- The audit metadata must include `productId`, `quantity`, generated code IDs, and actor ID.

Future data candidates, not part of this issue:

- Owner/order pre-assignment metadata.
- CSV export history.
- Dedicated generation history if operators need to re-open old generated-code result sets.

## Frontend Changes

### `/admin/redemption-codes`

Add a create panel above or beside the current filters.

Controls:

- Product selector searchable by title/slug.
- Product selector uses `/api/admin/products?collectorOnly=true`.
- Selector supports pagination/infinite loading or page controls using the existing admin products pagination.
- Quantity input with default `10`, min `1`, max `500`.
- Submit button `Tạo code`.

States:

- Loading while product selector data loads.
- Disabled submit while request is in flight.
- Field errors from API.
- Success state shows newly created codes in a copyable list.
- Clipboard failure state shows an error toast and keeps generated codes visible in a manually selectable fallback.
- Refresh state intentionally clears the "just generated" result group; persisted codes remain available through list/search.
- Empty state remains for list filters.

Display:

- Fix Vietnamese mojibake in this page while touching it.
- Add `usedAt` column or detail text for redeemed codes.
- Preserve existing dark CMS style and `AdminUi` components.

### `/account/collection`

Ensure duplicate count is typed and visible:

- Update `CollectionSet.slots[]` type in `app/account/collection/page.tsx` to include `ownedCount: number`.
- If `ownedCount === 0`, slot remains locked.
- If `ownedCount === 1`, show normal unlocked state.
- If `ownedCount > 1`, show compact `xN` badge on that product slot.
- Badge must not change layout or cover product name/image in a broken way on mobile.

## Backend Changes

### Shared code generation helper

Move unique generation into a reusable helper exported from `lib/collectorService.ts` or a new `lib/redemptionCodes.ts`.

Suggested API:

```ts
export async function createUniqueRedemptionCodeValue(
  client: Prisma.TransactionClient | typeof prisma,
  maxAttempts = 10
): Promise<string>
```

Use this helper in:

- `handleOrderCollectorItems()`
- Admin `POST /api/admin/redemption-codes`
- Blind-box allocation code creation if duplicated generation logic exists.

### Admin create route

Current route creates codes in a loop outside an explicit transaction. Update to:

1. Parse body with Zod and reject unknown fields.
2. Validate admin authorization.
3. Validate product is collector item.
4. `$transaction` create exactly `quantity` unowned/unassigned codes.
5. In the same transaction, add `AdminAuditLog` entry with action `REDEMPTION_CODES_CREATED`.
6. Return created codes and the product object.

### Admin products route

Update `/api/admin/products` to support selector usage:

1. Accept `collectorOnly=true` as the canonical collector filter.
2. Preserve existing search and pagination.
3. Return enough product fields for selector labels and create response confirmation.
4. Return only products fully valid for code generation: `isCollector = true`, valid `setId`, and valid `setSlotNumber`.
5. Keep create route validation as the final guard if the request is called directly or product data changes after selector load.

### Collection route

`/api/merch/my-collection` already uses `summarizeProductOwnership()`. Keep this behavior and make the response/type contract explicit:

- Return `ownedCount` on every slot.
- Add regression coverage for `ownedCount = 10`.
- Update frontend `CollectionSet` type in `app/account/collection/page.tsx`.

### Redeem route and service

`redeemProductCodeForUser()` already enforces most code-state requirements. Add explicit role eligibility:

- Fetch current user role/status from database before rate-limit checks and before redeem mutation.
- Reject any role other than `user` before rate-limit checks.
- Preserve existing redeem rate limiting for eligible role `user` accounts and return `429 RATE_LIMITED` when triggered.
- Keep these invariants explicit in tests:
  - `OR: [{ userId: null }, { userId }]`.
  - `status: ACTIVE`.
  - `updateMany` count must be exactly `1`.
  - redeemed code cannot be reused.

## Implementation Plan

1. Add shared redemption-code generation helper and reuse it where code generation currently exists.
2. Harden `POST /api/admin/redemption-codes`: strict body validation, product collector validation, transaction, full-request rollback, collision retry, audit log in same transaction.
3. Extend `/api/admin/products` with collector-only filtering while preserving search and pagination.
4. Add a client component for create-code form on `/admin/redemption-codes`.
5. Show newly generated codes with copy-to-clipboard affordance and manual-copy fallback when clipboard API fails.
6. Extend admin code list columns with `usedAt` and better owner/product status display.
7. Verify `/api/merch/my-collection` returns `ownedCount` on every slot and update the frontend type.
8. Verify `/account/collection` displays `xN` for duplicate ownership; add UI badge if missing.
9. Add explicit role `user` eligibility to redeem service/route.
10. Fix mojibake in touched admin redemption-code UI strings.
11. Add unit and route tests for generation, collisions, validation, audit rollback, redeem role rejection, redeem lock, and collection duplicate count.
12. Run `npm run type-check`, `npm run test:unit`, and targeted route/component tests.

## Test Strategy

### Unit tests

- `generateRedemptionCode()` returns uppercase `DKL-XXXX-XXXX-XXXX`.
- Unique helper retries when generated value already exists.
- Unique helper throws after max attempts.
- `summarizeProductOwnership()` returns `ownedCount: 10` for ten redeemed codes of one product.
- `summarizeProductOwnership()` ignores active/disabled codes.

### Admin API tests

- Guest cannot create code: `401`.
- Non-admin cannot create code: `403`.
- Admin creates 10 codes for a collector product: `201`, 10 items, product object included.
- Admin creates 100 codes for one collector product and all returned `code` values are unique.
- Nonexistent product returns `404 PRODUCT_NOT_FOUND`.
- Non-collector product returns `422 INVALID_COLLECTOR_ITEM`.
- Product missing set or slot returns `422 INVALID_COLLECTOR_ITEM`.
- Invalid quantity `0`, negative, decimal, or `>500` returns `400`.
- Request containing `userId`, `orderId`, or other unknown fields returns `400`.
- Created codes have `userId = null` and `orderId = null`.
- Unique collision during create retries and still returns full count.
- Exhausted collision attempts rolls back all codes.
- Audit log failure rolls back all codes.
- `/api/admin/products?collectorOnly=true` returns only products fully valid for code generation, with search and pagination.

### Redeem tests

- Guest redeem returns `401`.
- Admin/staff redeem returns `403 REDEEM_ROLE_NOT_ALLOWED`.
- Admin/staff repeated redeem attempts still return `403 REDEEM_ROLE_NOT_ALLOWED`, never `429`.
- Rate-limited role `user` redeem attempts return `429 RATE_LIMITED`.
- User can redeem active unowned code.
- Redeemed code sets `userId`, `status`, `isUsed`, `usedAt`.
- Same code cannot be redeemed twice by same user.
- Same code cannot be redeemed by another user.
- Active code already owned by user A cannot be redeemed by user B.
- Active code already owned by user A can be redeemed by user A.
- Disabled code cannot be redeemed.

### Collection tests

- `/api/merch/my-collection` returns `ownedCount` on every slot.
- Ten redeemed codes for product 1 produce slot `ownedCount = 10`.
- Frontend `CollectionSet` type includes `ownedCount`.
- Slot displays `x10` in UI.
- Progress counts product 1 once, not ten times.
- Set reward is granted only when all unique slots are unlocked.

### Admin UI tests

- Create form defaults quantity to `10`.
- Product selector uses `/api/admin/products` with collector-only filter.
- Product selector supports search and pagination.
- Successful create shows copyable generated codes.
- Clipboard API failure shows an error toast and leaves generated codes manually selectable.
- Refresh clears the "just generated" group, while codes remain discoverable via list/search.
- API field errors appear beside fields.
- Filter/search/list still works after creating codes.
- Disable button only appears for active unused codes.
- Long product names and long emails do not break table layout.

## Risk Analysis

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Current admin route creates partial results if an error happens mid-loop | Medium | High | Wrap code creation and audit log in one transaction and only return success when full quantity is created. |
| Product selector allows non-collector products | Medium | Medium | Filter `/api/admin/products` for collector selector and validate again in create API. |
| Random code collision is rare but possible | Low | Medium | Keep DB unique constraint and retry collisions. |
| Duplicate ownership count could accidentally affect set completion | Medium | Medium | Tests must assert progress uses unique slots while `ownedCount` shows duplicates. |
| Redeemed code owner reassignment would break account-bound guarantee | Low | High | Keep owner route locked for non-active/used codes and test it. |
| Admin/staff account accidentally redeems collector code | Medium | Medium | Check role from database in redeem service/route and reject non-user roles. |
| Audit log failure after code creation could create unaudited codes | Low | Medium | Put audit log write in the same transaction as code creation. |
| Mojibake strings make CMS hard to operate | High | Low | Fix strings in touched redemption-code UI files. |

## Follow-Up Candidates

1. CSV export for generated codes or filtered code list.
2. Owner/order pre-assignment for codes tied to a specific user or order.
3. Dedicated generation history if operators need to reopen old generated-code result sets.
4. Reactivating disabled unused codes, if operations need that recovery path.

## Recommended Defaults

- Ship default quantity `10` per product.
- Allow admin to enter `100` for one product when needed, but keep max `500`.
- Generate unowned/unassigned codes only.
- Let the first eligible role `user` account that redeems an active unowned code bind it to that account.
- Use copy-to-clipboard for v1 distribution workflow.
