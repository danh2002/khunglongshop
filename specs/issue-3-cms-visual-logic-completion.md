# Issue #3 Follow-up: Hoàn thiện giao diện và logic vận hành CMS

Source: https://github.com/danh2002/khunglongshop/issues/3#issuecomment-4657723939

## Overview

Comment bổ sung của Issue #3 yêu cầu hoàn thiện CMS quản trị theo giao diện đồng bộ với website và rà soát logic của các khu vực:

1. Tổng quan.
2. Đơn hàng.
3. Danh mục.
4. Người dùng.
5. Merchant.
6. Bộ sưu tập.
7. Mã mở khóa.
8. Phần thưởng.
9. Cài đặt.

CMS hiện đã có shared layout tại `/admin`, phân quyền `admin/user`, API quản trị người dùng và sản phẩm, cùng các model `Customer_order`, `Category`, `Merchant`, `CollectorSet`, `RedemptionCode`, `SetReward`. Tuy nhiên, nhiều trang còn dùng giao diện trắng/xanh cũ, gọi trực tiếp Express API, thiếu validation hoặc chưa có API admin riêng.

Đợt này sẽ chuẩn hóa các trang trên thành một CMS vận hành thống nhất:

- Giao diện nền `#070707`, accent `#e85d00`, tiếng Việt.
- Dữ liệu dạng bảng gọn, dễ quét, có tìm kiếm, lọc, phân trang và trạng thái.
- Mọi mutation đi qua API được xác thực admin và validate bằng Zod.
- Không để browser gọi trực tiếp các Express CRUD endpoint không được bảo vệ.
- Giữ tương thích với luồng mua hàng, mở khóa bộ sưu tập và nhận thưởng hiện có.

### Yêu cầu đã xác nhận

- Chỉnh lại giao diện chín khu vực CMS để đồng bộ với website.
- Hoàn chỉnh logic tạo/sửa/xóa danh mục.
- Rà soát CRUD và phân quyền người dùng.
- Rà soát logic merchant.
- Làm giao diện bộ sưu tập bắt mắt và dễ quản lý hơn.
- Mỗi mã mở khóa phải gắn đúng một sản phẩm.
- Khi người dùng thu thập đủ 10 sản phẩm trong một bộ sưu tập, CMS phải hiển thị trạng thái đã hoàn thành và phần thưởng tương ứng.
- Bổ sung các chức năng cài đặt CMS cần thiết.

### Default Decisions

Các quyết định sau đã được khóa và không còn là open questions:

- Code có `isUsed = true` và `usedAt = null` được xem là `ACTIVE` do dữ liệu bất thường. Migration ghi warning có `codeId`, không tự đánh dấu redeemed và không map sang disabled.
- Order status dùng đúng flow: `PENDING -> PROCESSING -> SHIPPED -> DELIVERED`. `CANCELLED` chỉ được chuyển từ `PENDING` hoặc `PROCESSING`; `DELIVERED` và `CANCELLED` là terminal states.
- Snapshot giá lịch sử không suy ra được chính xác được phép dùng giá ước tính, nhưng bắt buộc đánh dấu `snapshotSource = BACKFILL_ESTIMATE`.
- Admin đã có audit history không được hard delete; chỉ được deactivate.
- Integration tests dùng transaction rollback trên local MySQL database trong Phase 1; chưa yêu cầu database test riêng.
- Test stack chuẩn là Vitest cho unit/service tests và Supertest cho Express/API integration tests.

### Quyết định kỹ thuật suy luận

- “Một code chỉ gắn với duy nhất một sản phẩm” được hiểu là mỗi `RedemptionCode` có đúng một `productId`. Một `Product` vẫn có thể có nhiều code vì mỗi đơn vị hàng bán ra cần code riêng. Không tạo unique constraint trên `RedemptionCode.productId`.
- Dùng Next.js App Router `/api/admin/**` làm boundary cho browser-facing admin APIs.
- Express endpoints cũ chỉ được giữ cho storefront hoặc tích hợp nội bộ; mutation admin phải được bảo vệ hoặc ngừng được gọi từ UI.
- Cấu hình CMS không lưu secrets, mật khẩu DB, API key hoặc `NEXTAUTH_SECRET`.

## Goals

- Đồng bộ toàn bộ CMS với shared admin shell và visual identity của Khủng Long Shop.
- Cung cấp dashboard có số liệu thật, không dùng placeholder.
- Cho admin tìm kiếm, lọc, phân trang và xem chi tiết đơn hàng.
- Hoàn chỉnh CRUD danh mục và merchant với validation, dependency checks và lỗi rõ ràng.
- Giữ user CRUD an toàn: không lộ password, không tự xóa, không xóa/demote admin cuối cùng.
- Quản lý bộ sưu tập, slot sản phẩm và tiến độ hoàn thành một cách trực quan.
- Quản lý vòng đời mã mở khóa và hiển thị chính xác sản phẩm gắn với từng code.
- Quản lý phần thưởng theo user và bộ sưu tập, gồm trạng thái đã cấp/đã nhận.
- Cung cấp nhóm cài đặt vận hành tối thiểu, an toàn và có validation.
- Loại bỏ mojibake và chuẩn hóa nội dung tiếng Việt trong CMS.
- Bổ sung test cho authorization, validation, dependency constraints và collector/reward workflow.

## Non-goals

- Không xây page builder, trình sửa theme hoặc plugin system như WordPress.
- Không cho upload media trong đợt này; tiếp tục dùng path dưới `public/images`.
- Không lưu hoặc chỉnh sửa secrets và environment variables trong database.
- Không thêm role tùy chỉnh ngoài `admin` và `user`.
- Không làm bulk delete cho user, order, code hoặc reward.
- Không redesign storefront công khai.
- Không thay đổi luật bộ sưu tập 10 slot nếu chưa có yêu cầu mới.
- Không xây hệ thống thanh toán, vận chuyển hoặc fulfillment bên thứ ba.
- Không xóa cứng dữ liệu có lịch sử đơn hàng, code hoặc phần thưởng.
- Không redesign module sản phẩm đã hoàn thiện, ngoại trừ phần cần thiết để hiển thị quan hệ code/bộ sưu tập.

## User Stories / UX Flow

### Shared CMS

1. Admin đăng nhập và mở `/admin`.
2. Sidebar hiển thị route hiện tại, hỗ trợ desktop và mobile.
3. Mỗi trang dùng cùng page header, filter bar, table, pagination, loading, empty và error state.
4. Guest nhận `401` ở API; user thường nhận `403`.
5. UI không hiện thao tác mà user hiện tại không được phép thực hiện.

### Tổng quan

1. Admin thấy số đơn hàng, doanh thu VND, user, sản phẩm, code đã dùng và bộ sưu tập hoàn thành.
2. Admin xem đơn hàng mới nhất và các phần thưởng mới được cấp.
3. Admin có quick links tới đơn hàng, user, code và bộ sưu tập cần xử lý.
4. Số liệu có khoảng thời gian rõ ràng, mặc định tháng hiện tại.

### Đơn hàng

1. Admin tìm đơn theo mã, email, tên hoặc số điện thoại.
2. Admin lọc theo trạng thái và khoảng ngày.
3. Admin xem sản phẩm, số lượng, tổng VND, địa chỉ và tài khoản liên quan.
4. Admin cập nhật trạng thái theo transition hợp lệ.
5. Admin không xóa đơn đã phát sinh lịch sử code hoặc nghiệp vụ liên quan.

### Danh mục

1. Admin xem danh mục cùng số sản phẩm bằng Prisma `_count`.
2. Admin tạo danh mục với tên được trim và chuẩn hóa.
3. Tên trùng sau normalize trả `409`.
4. Admin sửa tên danh mục.
5. Danh mục có sản phẩm không được xóa; CMS hiển thị dependency count.

### Người dùng

1. Admin tiếp tục dùng CRUD user hiện có với giao diện thống nhất.
2. Role chỉ nhận `admin` hoặc `user`.
3. Admin không thể tự xóa hoặc xóa/demote admin cuối cùng.
4. Password reset là tùy chọn và luôn được hash.
5. Dependency checks chạy trong transaction trước khi xóa.

### Merchant

1. Admin tìm merchant theo tên, email hoặc số điện thoại.
2. Admin lọc theo trạng thái.
3. Admin tạo/sửa merchant với thông tin liên hệ hợp lệ.
4. Merchant có sản phẩm không được xóa.
5. Admin có thể chuyển merchant sang inactive mà không làm mất lịch sử.

### Bộ sưu tập

1. Admin xem từng bộ với tiến độ gán slot, số code đã dùng và số user hoàn thành.
2. Admin tạo/sửa bộ gồm tên, mô tả, đúng 10 slot và mô tả/template phần thưởng.
3. Trang chi tiết hiển thị grid 10 slot, sản phẩm đang gán và slot còn trống.
4. Không cho xóa bộ có sản phẩm, code hoặc reward history.
5. Không tự động tháo sản phẩm khỏi bộ khi xóa bộ.

### Mã mở khóa

1. Admin tìm code theo mã, sản phẩm, email user hoặc order.
2. Mỗi dòng code hiển thị đúng sản phẩm, bộ sưu tập và slot.
3. Admin lọc theo trạng thái `active`, `redeemed`, `disabled`.
4. Admin có thể vô hiệu hóa code chưa dùng sau bước xác nhận.
5. Code đã redeemed không thể chuyển sang sản phẩm khác.
6. Code mới bắt buộc gắn một sản phẩm; một sản phẩm có thể có nhiều code.

### Phần thưởng

1. Khi user mở đủ 10 slot khác nhau, hệ thống tạo duy nhất một `SetReward` cho cặp user/set.
2. CMS hiển thị user, bộ sưu tập, tiến độ `10/10`, thời điểm hoàn thành và trạng thái claim.
3. Admin lọc theo bộ sưu tập, trạng thái và tìm theo email/reward code.
4. Admin có thể export CSV qua API admin được bảo vệ.
5. Hệ thống không cấp trùng reward khi redeem request được gửi lặp hoặc đồng thời.

### Cài đặt

1. Admin chỉnh thông tin website, liên hệ, thông báo vận chuyển và maintenance mode.
2. Admin chọn locale mặc định trong `vi`, `en`, `zh`.
3. Admin thấy thời điểm và tài khoản cập nhật gần nhất.
4. Thay đổi có validation và confirmation với setting ảnh hưởng storefront.

## Technical Design

### Shared Admin UI

Tạo hoặc chuẩn hóa các component dùng chung:

```text
components/admin/
  AdminPageHeader.tsx
  AdminMetric.tsx
  AdminDataTable.tsx
  AdminFilterBar.tsx
  AdminPagination.tsx
  AdminStatusBadge.tsx
  AdminEmptyState.tsx
  AdminErrorState.tsx
  AdminConfirmDialog.tsx
  AdminFormField.tsx
```

Quy chuẩn:

- Background `#070707`.
- Surface `#0f0f0f` hoặc `rgba(255,255,255,0.03)`.
- Accent `#e85d00`.
- Border radius tối đa `8px`.
- Text tiếng Việt, không còn chuỗi mojibake.
- Icon buttons có `aria-label` và tooltip.
- `focus-visible` rõ ràng.
- Table có container cuộn ngang trên mobile; action không chồng lấn nội dung.
- Không dùng generated row key.

### Data Fetching

- List APIs dùng server-side pagination, filter và sort.
- Filter được lưu trong URL search params.
- Search input debounce khoảng 300 ms.
- Response list dùng shape chung:

```ts
type PaginatedResponse<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};
```

### Test Stack

Phase 1 chuẩn hóa test infrastructure:

- Vitest cho unit tests, service tests và typed route-handler tests.
- Supertest cho Express/API integration tests.
- Thêm dev dependencies tối thiểu: `vitest`, `supertest`, `@types/supertest`.
- Thêm scripts:

```json
{
  "test": "vitest run",
  "test:unit": "vitest run tests/unit",
  "test:integration": "vitest run tests/integration --no-file-parallelism"
}
```

- Integration tests dùng local MySQL database hiện tại và transaction rollback cho từng test; chưa tạo database test riêng trong Phase 1.
- Service/repository code cần nhận `Prisma.TransactionClient` để test chạy toàn bộ arrange/act/assert trong transaction rồi rollback có chủ đích.
- Integration tests chạy tuần tự để tránh transaction này nhìn thấy dữ liệu chưa commit của test khác.
- DDL/migration tests không chạy trong per-test transaction; dùng preflight/validate scripts riêng và không được phá dữ liệu local.
- Test setup phải có guard chống chạy integration suite khi `NODE_ENV = production`.

### Authorization and Errors

Mọi `/api/admin/**` route phải dùng `requireAdminApi()`.

Error shape:

```ts
type AdminApiError = {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
};
```

Không trả raw Prisma error. Unique/dependency conflicts trả `409`; not found trả `404`; validation trả `400`.

### Code-to-product Invariant

Quan hệ đúng:

```text
Product 1 ---- N RedemptionCode
```

- Một code thuộc đúng một product.
- Một product có thể có nhiều code.
- `code` unique toàn hệ thống.
- `productId` bắt buộc và có foreign key.
- Sau khi code redeemed, không cho đổi `productId`.
- Việc vô hiệu hóa code không được giả làm “đã dùng”; cần status riêng.

### Code Ownership

Code có thể được tạo trước khi biết người mua, vì vậy `userId` được phép `null`. Quy tắc ownership bắt buộc:

- Code `ACTIVE` có `userId = null` có thể được người dùng đầu tiên redeem và được gán atomically cho người đó.
- Code `ACTIVE` đã có `userId` chỉ được chính user đó redeem.
- Request không được phép truyền `userId` thay cho session; claimant luôn lấy từ NextAuth session.
- Việc claim ownership và chuyển `ACTIVE -> REDEEMED` phải nằm trong cùng một atomic update.
- Code `REDEEMED` hoặc `DISABLED` không thể đổi owner.
- Admin chỉ được gán trước owner cho code `ACTIVE` chưa có lịch sử redeem.
- Mọi thao tác admin gán, đổi hoặc gỡ owner của code phải tạo `AdminAuditLog` trong cùng transaction. Không được coi audit logging là tùy chọn cho thao tác ownership.

### Reward Completion

Trong transaction redeem:

1. Đọc code theo unique `code` để kiểm tra product và trạng thái hiện tại.
2. Xác nhận status `ACTIVE`.
3. Xác nhận product là collector item có `setId` và `setSlotNumber`.
4. Claim code bằng conditional atomic update:

```ts
const redeemed = await tx.redemptionCode.updateMany({
  where: {
    id: redemptionCode.id,
    status: "ACTIVE",
    OR: [{ userId: null }, { userId: sessionUserId }],
  },
  data: {
    status: "REDEEMED",
    isUsed: true, // transitional dual-write; remove with contract migration
    userId: sessionUserId,
    usedAt: new Date(),
  },
});

if (redeemed.count !== 1) {
  throw new CollectorRedeemError("ALREADY_USED_OR_NOT_OWNED");
}
```

Conditional update này là nguồn quyết định duy nhất; không dựa vào kết quả đọc trước đó để kết luận request thắng race.

5. Đếm số slot khác nhau user đã mở trong set.
6. Nếu đủ `totalSlots`, tạo reward idempotently theo unique `[userId, setId]` và trả riêng `rewardCreated: boolean`:
   - Thử `create` reward với reward code unique.
   - Nếu create thành công, trả `{ reward, rewardCreated: true }`.
   - Chỉ xử lý Prisma `P2002`; mọi error code khác phải re-throw.
   - Kiểm tra `error.meta?.target` để phân biệt constraint `[userId, setId]` với `rewardCode`.
   - Nếu target là `[userId, setId]`, query reward hiện có và trả `{ reward, rewardCreated: false }`.
   - Nếu target chỉ là `rewardCode`, sinh code mới và retry tối đa 3 lần.
   - Sau 3 lần collision `rewardCode`, re-throw error; không silently swallow.
   - Nếu `P2002` có target không nhận diện được, re-throw để transaction rollback.
   - Không dùng pre-read đơn lẻ để kết luận reward chưa tồn tại vì hai transaction có thể cùng đọc `null`.
7. Chỉ gửi email/notification hoàn thành khi `rewardCreated === true`; reward đã tồn tại không được phát side effect lần nữa.
8. Trả về product vừa mở, tiến độ và reward nếu vừa hoàn thành.

Việc đếm phải dùng distinct collector slots, không chỉ đếm code, để hai code cùng sản phẩm không làm tăng tiến độ hai lần.

### Atomic Reward Claim

Game reward claim cũng phải dùng conditional atomic update, không dùng luồng read-then-update:

```ts
const claimed = await prisma.setReward.updateMany({
  where: {
    id: setReward.id,
    isClaimed: false,
  },
  data: {
    isClaimed: true,
    claimedAt: new Date(),
  },
});

if (claimed.count !== 1) {
  return NextResponse.json({ error: "Code already claimed" }, { status: 409 });
}
```

Sau khi `count === 1`, query lại reward cùng collector set để tạo response. Hai request đồng thời chỉ một request được phép nhận `200`.

## API Changes

### Dashboard

#### `GET /api/admin/dashboard`

Query:

```ts
{
  range?: "7d" | "30d" | "month";
}
```

Response:

```ts
{
  metrics: {
    orderCount: number;
    revenue: number;
    userCount: number;
    productCount: number;
    redeemedCodeCount: number;
    completedSetCount: number;
  };
  recentOrders: AdminOrderListItem[];
  recentRewards: AdminRewardListItem[];
}
```

### Orders

#### `GET /api/admin/orders`

Hỗ trợ `page`, `limit`, `search`, `status`, `dateFrom`, `dateTo`, `sort`, `direction`.

#### `GET /api/admin/orders/:id`

Trả order, user an toàn và order items từ các snapshot fields `productTitle`, `productSlug`, `unitPrice`.

#### `PATCH /api/admin/orders/:id/status`

```ts
{
  status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
}
```

Transition matrix:

| Current | Allowed next states |
| --- | --- |
| `PENDING` | `PROCESSING`, `CANCELLED` |
| `PROCESSING` | `SHIPPED`, `CANCELLED` |
| `SHIPPED` | `DELIVERED` |
| `DELIVERED` | none |
| `CANCELLED` | none |

Mọi transition khác trả `409 INVALID_ORDER_STATUS_TRANSITION`.

### Categories

#### `GET /api/admin/categories`

List/search/pagination, trả `_count.products`.

#### `POST /api/admin/categories`

Body `{ name: string }`. Trim, giới hạn độ dài và kiểm tra trùng.

#### `GET|PATCH|DELETE /api/admin/categories/:id`

Delete trả `CATEGORY_HAS_PRODUCTS` nếu `_count.products > 0`.

### Users

Giữ `/api/admin/users` và `/api/admin/users/:id` hiện có. Bổ sung test authorization, final-admin concurrency và UI consistency; không tạo API song song.

User delete rules bổ sung:

- Dependency query phải đếm `AdminAuditLog` theo `actorId` thành `adminAuditLogCount`.
- Nếu `adminAuditLogCount > 0`, hard delete trả `409 USER_HAS_AUDIT_HISTORY`.
- Admin có audit history chỉ được deactivate qua `PATCH`, đặt `isActive = false`, `deactivatedAt` và giữ nguyên identity cho audit trail.
- Authentication phải từ chối user inactive.
- Final-admin rule vẫn áp dụng: không được deactivate admin cuối cùng.

### Merchants

#### `GET|POST /api/admin/merchants`

List/search/filter và create.

#### `GET|PATCH|DELETE /api/admin/merchants/:id`

Delete trả `MERCHANT_HAS_PRODUCTS` nếu có sản phẩm. Update status dùng enum đã validate.

### Collector Sets

#### `GET|POST /api/admin/collector-sets`

List trả:

```ts
{
  id: string;
  name: string;
  totalSlots: number;
  assignedProductCount: number;
  redeemedCodeCount: number;
  completedUserCount: number;
}
```

#### `GET|PATCH|DELETE /api/admin/collector-sets/:id`

Detail trả 10 slot và sản phẩm tương ứng. Delete bị chặn khi có product/code/reward history.

### Redemption Codes

#### `GET /api/admin/redemption-codes`

Hỗ trợ search, set, product, status, user và pagination. Query phải include relation `product`, `product.set` và `user` thay vì manual N+1 queries.

#### `POST /api/admin/redemption-codes`

Tạo một code hoặc batch nhỏ, bắt buộc `productId`.

#### `PATCH /api/admin/redemption-codes/:id`

Chỉ cho sửa product khi code còn `ACTIVE` và chưa gắn user/order history.

#### `POST /api/admin/redemption-codes/:id/owner`

Body:

```ts
{
  userId: string | null;
  reason: string;
}
```

Chỉ cho gán/đổi/gỡ owner khi code `ACTIVE` và chưa có redeem history.

- Nếu `userId` khác `null`, target user phải tồn tại và có `role = user`; không cho gán code cho admin.
- `reason` bắt buộc, được trim và giới hạn độ dài.
- Mutation và `AdminAuditLog` phải nằm trong cùng transaction; actor lấy từ admin session.
- Audit metadata bắt buộc có `previousUserId`, `newUserId`, `reason`, `actorId`.
- Target không hợp lệ trả `USER_NOT_FOUND` hoặc `INVALID_CODE_OWNER_ROLE`.

#### `POST /api/admin/redemption-codes/:id/disable`

Chuyển `ACTIVE -> DISABLED`; không dùng `isUsed = true`.

### Rewards

#### `GET /api/admin/set-rewards`

Search/filter/pagination, include `user` và `set`.

#### `GET /api/admin/set-rewards/export`

Giữ export CSV nhưng phải dùng `requireAdminApi()`, escape CSV và áp cùng filter với list.

Không cho admin tự tạo reward tùy ý trong đợt này; reward chỉ sinh từ collector completion transaction.

### Settings

#### `GET /api/admin/settings`

Trả cấu hình public-safe.

#### `PATCH /api/admin/settings`

Body:

```ts
{
  siteName: string;
  supportEmail: string | null;
  supportPhone: string | null;
  shippingNotice: string | null;
  maintenanceMode: boolean;
  defaultLocale: "vi" | "en" | "zh";
}
```

Không nhận arbitrary key/value và không nhận secrets.
`updatedById` luôn lấy từ admin session, không nhận từ request body.

## Schema / Prisma Changes

Áp dụng giống nhau cho `prisma/schema.prisma` và `server/prisma/schema.prisma`.

### Migration rollout strategy

Thay đổi `RedemptionCode.isUsed -> status` phải dùng chiến lược expand–migrate–contract, không xóa hoặc rename field trong Phase 1:

1. **Expand:** thêm `status`, relations, nullable ownership fields và indexes trong khi vẫn giữ `isUsed`.
2. **Preflight:** xuất danh sách orphan references và mọi record `isUsed = true AND usedAt IS NULL`.
3. **Resolve anomaly:** record `isUsed = true AND usedAt IS NULL` được map sang `ACTIVE` theo Default Decisions và ghi warning có `codeId`; không tự redeem hoặc disable.
4. **Initial backfill:** map `isUsed = true AND usedAt IS NOT NULL` sang `REDEEMED`; map anomaly ở bước 3 sang `ACTIVE`.
5. **Writer-first release:** cập nhật tất cả code paths có thể tạo/update/redeem/disable code để dual-write `status` và `isUsed`. Trong giai đoạn này readers cũ vẫn đọc `isUsed`.
6. **Writer verification:** xác nhận không còn runtime writer chỉ ghi `isUsed`, gồm Next.js, Express, scripts, seeds, batch jobs và admin server actions.
7. **Mandatory reconciliation backfill:** sau writer verification và ngay trước reader migration, chạy:

```sql
UPDATE `RedemptionCode`
SET `status` = 'REDEEMED'
WHERE `isUsed` = true
  AND `usedAt` IS NOT NULL
  AND `status` = 'ACTIVE';
```

Sau query phải assert không còn row thỏa điều kiện trên. Reader migration bị chặn nếu assertion thất bại.

8. **Reader migration:** chỉ sau reconciliation assertion mới chuyển Next.js routes, Express services, account APIs, admin pages và reports sang đọc `status`.
9. **Enable lifecycle features:** chỉ bật `DISABLED` sau khi mọi runtime reader đã dùng `status`.
10. **Contract:** chỉ xóa `isUsed` sau production verification và repository audit xác nhận không còn reader/writer phụ thuộc field này.

Không được chạy status-based reader song song với writer cũ chỉ ghi `isUsed`; hai cột sẽ phân kỳ. Nếu không thể triển khai writer-first qua nhiều release, phải dừng mutation traffic và phát hành schema + toàn bộ writers/readers atomically trong cùng maintenance window.

### Restrictive category deletion

Database phải bảo vệ sản phẩm khỏi cascade delete ngay cả khi API dependency check bị bypass hoặc gặp race:

```prisma
model Product {
  // existing fields
  category Category @relation(fields: [categoryId], references: [id], onDelete: Restrict)
}
```

Migration phải thay foreign key hiện tại từ `ON DELETE CASCADE` sang `ON DELETE RESTRICT`. API vẫn kiểm tra `_count.products` để trả lỗi thân thiện, nhưng database constraint là lớp bảo vệ cuối cùng.

### Redemption code relations and lifecycle

Schema ở bước **expand**:

```prisma
enum RedemptionCodeStatus {
  ACTIVE
  REDEEMED
  DISABLED
}

model Product {
  // existing fields
  redemptionCodes RedemptionCode[]
}

model RedemptionCode {
  id        String               @id @default(cuid())
  code      String               @unique
  productId String
  product   Product              @relation(fields: [productId], references: [id], onDelete: Restrict)
  userId    String?
  user      User?                @relation(fields: [userId], references: [id], onDelete: SetNull)
  orderId   String?
  order     Customer_order?      @relation(fields: [orderId], references: [id], onDelete: SetNull)
  status    RedemptionCodeStatus @default(ACTIVE)
  isUsed    Boolean              @default(false) // transitional; remove only in contract migration
  usedAt    DateTime?
  createdAt DateTime             @default(now())

  @@index([productId, status])
  @@index([userId, status])
  @@index([status, createdAt])
}
```

Migration:

- `isUsed = false` → `ACTIVE`.
- `isUsed = true` và có `usedAt` → `REDEEMED`.
- `isUsed = true` và `usedAt IS NULL` → `ACTIVE`, đồng thời ghi anomaly warning có `codeId`.
- Warning report phải được lưu cùng migration artifact để có thể rà soát sau; anomaly không được tự động cấp progress hoặc reward.
- Kiểm tra mọi `productId` hiện tại tồn tại trước khi thêm foreign key.
- `userId` và `orderId` chuyển nullable để code chưa phát hành không cần gắn giả user/order.
- Trước khi thêm foreign key cho `orderId`, mọi giá trị giả/orphan như seed labels phải được map sang order thật hoặc `NULL`; migration abort nếu còn orphan.
- Không drop `isUsed` trong migration expand.
- Writer-first release bắt buộc mọi redeem path ghi `status = REDEEMED`, `isUsed = true`, `usedAt` và ownership trong cùng conditional update.
- Mọi create path ghi rõ `status = ACTIVE`, `isUsed = false`.
- Không cho admin tạo trạng thái `DISABLED` khi vẫn còn bất kỳ runtime consumer nào đọc `isUsed`.
- Sau consumer migration, disable chỉ ghi `status = DISABLED`; không ghi `isUsed = true`.
- Contract migration drop `isUsed` chỉ chạy sau repository audit và production verification.

### Reward relations

```prisma
model User {
  // existing fields
  redemptionCodes RedemptionCode[]
  setRewards      SetReward[]
  settingsUpdates SiteSettings[] @relation("SiteSettingsUpdatedBy")
  adminAuditLogs  AdminAuditLog[] @relation("AdminAuditActor")
  isActive        Boolean         @default(true)
  deactivatedAt   DateTime?

  @@index([isActive])
}

model Customer_order {
  // existing fields
  redemptionCodes RedemptionCode[]
}

model SetReward {
  // existing fields
  user User @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@index([isClaimed, grantedAt])
}
```

Giữ unique `[userId, setId]`.

### Order item snapshots

Order detail không được phụ thuộc vào tên/giá hiện tại của `Product`. Bổ sung snapshot trên order item:

```prisma
enum OrderSnapshotSource {
  CHECKOUT
  BACKFILL_DERIVED
  BACKFILL_ESTIMATE
}

model customer_order_product {
  // existing fields
  productTitle  String?
  productSlug   String?
  unitPrice     Int?
  snapshotSource OrderSnapshotSource?
}
```

Rollout bắt buộc theo expand/contract:

1. **Expand:** thêm `productTitle`, `productSlug`, `unitPrice`, `snapshotSource` dưới dạng nullable. Không đổi non-null trong migration này.
2. **Writer migration:** cập nhật mọi checkout/order writer để ghi snapshot và `snapshotSource = CHECKOUT`.
3. **Historical backfill:**
   - Backfill title/slug từ product liên quan và ghi rõ đây là dữ liệu phục hồi.
   - Trước tiên thử suy ra `unitPrice` từ dữ liệu order hiện có bằng `totalAmount / quantity` khi phép suy ra là xác định, ví dụ order chỉ có một line item hoặc có dữ liệu phân bổ đáng tin cậy. Ghi `snapshotSource = BACKFILL_DERIVED`.
   - Nếu không thể suy ra chính xác, dùng giá product hiện tại như ước tính và bắt buộc ghi `snapshotSource = BACKFILL_ESTIMATE`.
   - Không bao giờ gắn nhãn `CHECKOUT` cho dữ liệu backfill hoặc trình bày giá ước tính như giá lịch sử chính xác.
4. **Verify:** assert số row có bất kỳ snapshot field nào `NULL` bằng 0. Contract migration bị chặn nếu assertion thất bại.
5. **Contract:** migration riêng chuyển bốn fields thành non-null chỉ sau khi bước verify đạt.

Schema đích sau bước contract:

```prisma
model customer_order_product {
  // existing fields
  productTitle   String
  productSlug    String
  unitPrice      Int
  snapshotSource OrderSnapshotSource
}
```

- Tổng dòng hàng được tính từ `unitPrice * quantity`; `Customer_order.total` vẫn là snapshot tổng cuối cùng.
- API order detail dùng snapshot fields, còn relation `product` chỉ dùng để điều hướng nếu product vẫn tồn tại.

### Operational enums

```prisma
enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}

enum MerchantStatus {
  ACTIVE
  INACTIVE
}
```

Chuẩn hóa dữ liệu string hiện có trước khi đổi column sang enum. Giá trị không nhận diện được phải được báo cáo và map có chủ đích, không âm thầm bỏ.

### Site settings

```prisma
model SiteSettings {
  id              String   @id @default("default")
  siteName        String
  supportEmail    String?
  supportPhone    String?
  shippingNotice  String?  @db.Text
  maintenanceMode Boolean  @default(false)
  defaultLocale   String   @default("vi")
  updatedById     String?
  updatedBy       User?    @relation("SiteSettingsUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)
  updatedAt       DateTime @updatedAt

  @@index([updatedById])
}
```

Không lưu secret trong model này. `defaultLocale` được validate ở API; có thể chuyển thành enum nếu project muốn enforce ở DB.

### Mandatory admin audit log

Ownership của redemption code là dữ liệu có giá trị và bắt buộc có audit trail:

```prisma
model AdminAuditLog {
  id         String   @id @default(cuid())
  actorId    String
  actor      User     @relation("AdminAuditActor", fields: [actorId], references: [id], onDelete: Restrict)
  action     String
  entityType String
  entityId   String
  metadata   Json?
  createdAt  DateTime @default(now())

  @@index([actorId, createdAt])
  @@index([entityType, entityId, createdAt])
}
```

Tối thiểu phải audit các action `REDEMPTION_CODE_OWNER_ASSIGNED`, `REDEMPTION_CODE_OWNER_CHANGED` và `REDEMPTION_CODE_OWNER_CLEARED`. Mutation ownership và audit insert phải nằm trong cùng transaction; nếu audit insert thất bại thì mutation rollback.

### Additional indexes

- `Customer_order.status`
- `Customer_order.dateTime`
- `Merchant.status`
- `CollectorSet.name` unique nếu dữ liệu hiện tại không trùng.
- `SetReward.[setId, isClaimed]`

## Frontend Changes

### Tổng quan

- Thay các card trắng/xanh và số liệu placeholder bằng metric rows/surfaces dark theme.
- Hiển thị doanh thu với `toLocaleString("vi-VN") + "đ"`.
- Recent orders và rewards dùng link đến detail.
- Có loading/error state thay vì render trắng khi DB lỗi.

### Đơn hàng

- Table: mã đơn, khách hàng, email, trạng thái, tổng VND, ngày, action.
- Detail chia thành thông tin khách, địa chỉ, sản phẩm và timeline trạng thái.
- Status badge màu semantic nhưng không phá palette tổng.
- Confirmation trước khi đổi sang `CANCELLED` hoặc terminal state.

### Danh mục

- Bỏ `nanoid()` row key; dùng `category.id`.
- Bỏ checkbox nếu chưa có bulk action.
- Form create/edit dùng chung.
- Hiển thị số sản phẩm và giải thích khi không thể xóa.
- Không convert tên hiển thị thành URL slug nếu model chỉ lưu `name`; lưu tên tiếng Việt chuẩn.

### Người dùng

- Giữ list/create/detail hiện có nhưng đưa về shared components.
- Field-level error cho email/password/role.
- Delete confirmation hiển thị email.

### Merchant

- Thay `products: any[]` bằng typed `_count.products`.
- List có search, status filter, pagination.
- Form create/edit dùng chung.
- Status dùng select/segmented control, không nhập text tự do.

### Bộ sưu tập

- List hiển thị progress `assigned/10`.
- Detail dùng grid 10 slot với thumbnail, tên product và trạng thái code.
- Slot trống hiển thị rõ nhưng không dùng nested cards.
- Delete và destructive reassignment dùng confirm dialog.

### Mã mở khóa

- Table hiển thị code mono, product thumbnail/title, set/slot, user, order, status và timestamps.
- Không render full code nếu có yêu cầu bảo mật in ấn; mặc định admin được xem full code.
- Disable action chỉ hiện cho code `ACTIVE`.
- Detail/edit product association chỉ khả dụng trước khi redeem.

### Phần thưởng

- List có progress/completion indicator, user email, set, reward code, granted/claimed time.
- Badge `Chờ nhận` và `Đã nhận`.
- Export button có loading và error feedback.
- Một notification/metric trên dashboard cho rewards mới được cấp.

### Cài đặt

- Sections: Nhận diện website, Liên hệ, Thông báo vận chuyển, Ngôn ngữ, Chế độ bảo trì.
- Maintenance mode cần confirm dialog.
- Không hiển thị UI nhập DB URL, NextAuth secret hoặc game API key.
- Hiển thị “Cập nhật lần cuối”.

## Backend Changes

### Admin API boundary

- Thêm Next.js route handlers cho orders, categories, merchants, collector sets, codes, rewards và settings.
- Mọi handler gọi `requireAdminApi()`.
- UI ngừng gọi trực tiếp `/api/orders`, `/api/categories`, `/api/merchants`.
- Express POST/PUT/DELETE category, merchant và order phải thêm `requireAdminSession` hoặc không expose ra untrusted clients.

### Validation

- Zod schemas riêng cho query và mutation.
- Explicitly map validated fields vào Prisma `data`; không mass-assign request body.
- Normalize email bằng lowercase; normalize category/merchant names bằng trim và whitespace collapse.
- Validate phone ở mức cho phép định dạng Việt Nam/quốc tế, không ép thành number.

### Transactions

Dùng transaction cho:

- Order status transition cần side effects.
- Redemption và reward completion.
- Collector set update có thay đổi slot.
- Dependency check + delete.
- Final-admin demotion/delete.

### Performance

- Dùng `_count` cho products per category/merchant và completion counts phù hợp.
- Dùng Prisma relations/include thay cho manual query theo từng row.
- Pagination mặc định 20, tối đa 100.
- Dashboard metrics chạy `Promise.all`.
- Không fetch toàn bộ merchants/products/users chỉ để đếm.

### Security

- Không trả password hash.
- Không nhận role từ session body/query.
- Không expose reward/game API secrets.
- Escape CSV values trong export.
- Generic internal error cho client; log server-side có context nhưng không log code/password/token nhạy cảm.
- Rate limiting chỉ là bổ sung, không thay authorization.

### Maintenance mode middleware allowlist

Khi `maintenanceMode = true`, middleware chỉ bypass các route sau:

- `/admin` và mọi sub-route `/admin/**`.
- `/api/admin/**`.
- `/api/auth/**`.
- Chính xác `/api/game/redeem`.
- `/_next/static/**`.
- `/_next/image/**` và static assets cần để render maintenance/admin UI.
- Public static assets như `/images/**`, `/favicon.ico`, `/icon.png`, fonts và các file có extension asset đã cấu hình.

Không route nào khác được bypass. Đặc biệt storefront pages, checkout APIs và các public commerce APIs phải nhận maintenance response. Matcher phải được test để `/api/game/redeem-extra` hoặc `/api/admin-public` không vô tình match allowlist.

## Implementation Steps

### Phase 1: Foundation and migration

1. Audit/repair mojibake trong admin shell và shared copy.
2. Tạo shared admin components và typed list/error helpers.
3. Cài Vitest + Supertest, thêm `test`, `test:unit`, `test:integration` scripts và transaction rollback test harness trên local DB.
4. Chạy preflight orphan/anomaly report; ghi warning cho `isUsed=true, usedAt=null`.
5. Tạo migration **expand**: thêm `RedemptionCode.status` nhưng giữ `isUsed`, thêm nullable ownership fields, order relation, reward relations, nullable order snapshots, settings, mandatory audit log và indexes.
6. Đổi foreign key `Product.categoryId` từ cascade sang restrict.
7. Chạy initial status backfill và làm sạch order references; chưa contract order snapshots.
8. Không bật code disable và không drop `isUsed` trong phase này.
9. Bảo vệ Express category, merchant và order mutations.

### Phase 2: Dashboard and orders

1. Thêm dashboard metrics API.
2. Thêm admin order list/detail/status APIs.
3. Cập nhật checkout/order writers để lưu `productTitle`, `productSlug`, `unitPrice`.
4. Backfill historical snapshots theo `BACKFILL_DERIVED`/`BACKFILL_ESTIMATE`.
5. Assert zero `NULL` snapshot rows; chỉ sau đó tạo contract migration chuyển snapshot fields thành non-null.
6. Rebuild overview với số liệu thật.
7. Rebuild order list/detail từ snapshot fields, filter, pagination và status workflow.

### Phase 3: Categories and merchants

1. Thêm admin category APIs và dependency checks.
2. Rebuild category list/form/detail.
3. Thêm admin merchant APIs, validation và dependency checks.
4. Rebuild merchant list/form/detail.
5. Ngừng gọi Express mutation trực tiếp từ UI.

### Phase 4: Users audit

1. Rà lại authorization và final-admin transaction.
2. Thêm `adminAuditLogCount` vào dependency checks và `USER_HAS_AUDIT_HISTORY`.
3. Thêm deactivate flow cho admin có audit history và chặn login user inactive.
4. Chuẩn hóa UI user bằng shared components.
5. Bổ sung validation/error/accessibility tests còn thiếu.

### Phase 5: Collector sets and codes

1. Thêm collector set APIs và 10-slot detail response.
2. Rebuild set list/detail và dependency-safe delete.
3. Chuyển toàn bộ Next.js/Express/scripts/seed writers sang dual-write `status` + `isUsed`; riêng redeem phải dùng conditional atomic ownership/status update ngay ở bước này.
4. Verify không còn runtime writer chỉ ghi `isUsed`.
5. Chạy mandatory reconciliation SQL cho code redeemed giữa Phase 1–5 và assert zero inconsistent rows.
6. Chỉ sau reconciliation mới chuyển account/admin/report readers từ `isUsed` sang `status`.
7. Thêm ownership admin mutation cùng target-user validation và mandatory `AdminAuditLog` transaction.
8. Verify repository không còn runtime reader phụ thuộc `isUsed`.
9. Sau reader verification mới bật code disable API và UI.
10. Rebuild code management UI với product/set/slot chính xác.

### Phase 6: Rewards

1. Refactor collector redeem transaction để đếm distinct slots.
2. Upsert reward idempotently khi đủ bộ.
3. Refactor game reward claim thành conditional atomic update với `count === 1`.
4. Thêm rewards list/filter/export APIs.
5. Rebuild rewards UI và dashboard notification.

### Phase 7: Settings

1. Seed singleton settings row.
2. Thêm GET/PATCH settings APIs.
3. Build settings form và confirmation cho maintenance mode.
4. Implement maintenance middleware với allowlist chính xác đã khóa.
5. Đọc public-safe settings ở storefront khi cần.

### Phase 8: Verification

1. Unit/integration tests cho schemas, services và route handlers.
2. UI tests cho forms, filters, dialogs, mobile layout và keyboard access.
3. Chạy migration status, Prisma validate/generate, type-check, lint, tests và build.
4. Manual test guest/user/admin workflows.
5. Chỉ lập contract migration drop `isUsed` sau khi release sử dụng `status` đã được production verification; không gộp contract migration vào expand deployment.

## Test Cases

### Authorization

1. Guest gọi mọi `/api/admin/**` nhận `401`.
2. User thường nhận `403`.
3. Admin truy cập được list/detail/mutation.
4. Gửi `role: "admin"` trong body không bypass auth.
5. Express category/merchant/order mutations từ unauthenticated client bị từ chối.

### Dashboard and orders

1. Metrics dùng dữ liệu DB thật và hiển thị VND đúng.
2. Search order theo email/mã/tên hoạt động.
3. Filter status/date kết hợp đúng.
4. Invalid status transition bị từ chối.
5. Order detail trả đúng product quantities.
6. Order có lịch sử liên quan không bị xóa cứng.
7. Đổi title/price của product sau checkout không làm thay đổi title/unit price hiển thị trong order detail.
8. Order writer không được tạo order item nếu thiếu snapshot `productTitle`, `productSlug`, `unitPrice`.
9. Expand migration để snapshot fields nullable không làm checkout cũ lỗi trước writer migration.
10. Contract migration bị chặn khi còn bất kỳ snapshot field nào `NULL`.
11. Backfill suy ra được giá dùng `BACKFILL_DERIVED`; giá không suy ra được dùng `BACKFILL_ESTIMATE`.
12. Chỉ cho status transitions theo matrix đã khóa; `CANCELLED` chỉ từ `PENDING`/`PROCESSING`.

### Categories

1. Tạo category hợp lệ thành công.
2. Tên rỗng hoặc quá dài bị từ chối.
3. Tên trùng sau trim/normalize trả `409`.
4. Edit giữ tên tiếng Việt đúng encoding.
5. Category có product không xóa được.
6. List dùng stable `category.id` key và `_count.products`.
7. Xóa category trực tiếp ở database khi còn product bị foreign key `RESTRICT` từ chối và product không bị mất.

### Users

1. Password không xuất hiện trong response.
2. Invalid role bị từ chối.
3. Self-delete bị chặn.
4. Final admin không thể bị demote/delete.
5. Hai request đồng thời không thể làm hệ thống còn zero admin.
6. Password reset lưu bcrypt hash.
7. User có `adminAuditLogCount > 0` không hard delete được và nhận `USER_HAS_AUDIT_HISTORY`.
8. Admin có audit history có thể deactivate nhưng không thể deactivate admin cuối cùng.
9. User inactive không đăng nhập được.

### Merchants

1. Create/update validate required name và contact fields.
2. Status chỉ nhận `ACTIVE/INACTIVE`.
3. Merchant list dùng `_count.products`.
4. Merchant có product không xóa được.
5. Inactive merchant vẫn giữ product/history.

### Collector sets

1. Bộ mới có đúng 10 slot.
2. Slot duplicate bị từ chối.
3. Detail trả đủ slot 1–10 theo thứ tự.
4. Set có product/code/reward history không xóa được.
5. Chuyển product slot sau khi có code bị chặn.

### Redemption codes

1. Tạo code bắt buộc có product tồn tại.
2. `code` duplicate trả `409`.
3. Một code chỉ có một `productId`.
4. Một product có thể có nhiều code.
5. List hiển thị đúng product/set/slot.
6. Code active có thể disable.
7. Code disabled không redeem được.
8. Code redeemed không đổi product hoặc redeem lần hai.
9. Hai request redeem đồng thời chỉ một request thành công.
10. Code active có `userId = null` được atomically gán cho claimant đầu tiên.
11. Hai user đồng thời redeem code chưa có owner chỉ một user nhận ownership và unlock.
12. Code đã có `userId` không thể được user khác redeem.
13. Request body/query chứa `userId` khác không thể thay đổi claimant lấy từ session.
14. Expand migration vẫn cho release cũ đọc `isUsed`; code disable chỉ được bật sau khi mọi runtime reader dùng `status`.
15. Contract migration không chạy khi repository audit còn bất kỳ runtime consumer nào dùng `isUsed`.
16. `isUsed=true, usedAt=null` được map `ACTIVE`, ghi anomaly warning và không tự cấp progress/reward.
17. Preflight migration fail khi `orderId` hoặc `productId` còn orphan.
18. Trong writer-first release, mọi create/redeem writer cập nhật đồng bộ cả `status` và `isUsed`.
19. Reader migration không được deploy khi kiểm tra còn writer chỉ ghi `isUsed`.
20. Admin gán/đổi/gỡ owner tạo đúng `AdminAuditLog`; lỗi ghi audit phải rollback ownership mutation.
21. Reconciliation SQL ở đầu Phase 5 cập nhật mọi `isUsed=true, usedAt!=null, status=ACTIVE` thành `REDEEMED`.
22. Reader migration bị chặn nếu reconciliation assertion còn inconsistent row.
23. Owner target không tồn tại trả `USER_NOT_FOUND`; target là admin trả `INVALID_CODE_OWNER_ROLE`.
24. Audit metadata chứa đúng `previousUserId`, `newUserId`, `reason`, `actorId`.

### Rewards

1. Hai code cùng product chỉ mở một slot.
2. User có 9 slot chưa nhận reward.
3. Slot thứ 10 tạo một reward.
4. Request lặp không tạo reward thứ hai.
5. CMS hiển thị user/set/granted/claimed đúng.
6. Export CSV cần admin session và escape formula/commas/newlines.
7. Game claim chỉ chuyển reward chưa claim sang claimed một lần.
8. Hai game claim request đồng thời chỉ một request nhận `200`; request còn lại nhận `409`.
9. Conditional claim update chỉ thành công khi `isClaimed = false` và `count === 1`.
10. Hai transaction hoàn thành slot cuối đồng thời chỉ tạo một `SetReward`.
11. Email/notification hoàn thành chỉ gửi một lần khi `rewardCreated=true`.
12. Unique conflict trên reward code được retry; conflict trên `[userId, setId]` trả reward hiện có với `rewardCreated=false`.
13. `rewardCode` collision retry tối đa 3 lần.
14. `P2002` có target không nhận diện được hoặc lỗi không phải `P2002` phải re-throw và rollback transaction.

### Settings

1. GET trả settings public-safe.
2. Invalid email/locale bị từ chối.
3. Maintenance toggle cần admin và confirmation UI.
4. API không chấp nhận arbitrary secret fields.
5. Updated timestamp được thay đổi sau save.
6. `updatedById` tham chiếu admin tồn tại và được set null nếu user bị xóa theo policy quan hệ.
7. Maintenance mode bypass đúng `/admin/**`, `/api/admin/**`, `/api/auth/**`, chính xác `/api/game/redeem` và static assets.
8. `/api/game/redeem-extra`, `/api/admin-public` và các commerce routes không bypass maintenance mode.

### UI and regression

1. Chín trang dùng dark/orange theme thống nhất.
2. Không còn mojibake trong navigation, headings, forms và toast.
3. Loading/empty/error states không làm layout nhảy hoặc chồng lấn.
4. Mobile navigation, tables và actions không overlap.
5. Keyboard user thao tác được filter, pagination, form và dialog.
6. Storefront catalog, login, registration, checkout và account pages vẫn hoạt động.
7. Vanie 1–10 và code hiện có vẫn mở đúng sản phẩm sau migration.
8. `npm run test`, `npm run test:unit`, `npm run test:integration` chạy được.
9. Integration tests rollback dữ liệu sau từng test và chạy tuần tự trên local DB.
10. Integration test setup từ chối chạy khi `NODE_ENV=production`.

## Risks / Open Questions

### Confirmed risks

- `RedemptionCode` hiện chỉ lưu scalar IDs, chưa có Prisma relations; dữ liệu orphan phải được kiểm tra trước khi thêm foreign key.
- `isUsed` đang được dùng cả cho redeemed và admin-disabled, nên migration status cần audit dữ liệu.
- `userId` và `orderId` hiện bắt buộc, không phù hợp code chưa được phát hành.
- Seed/test data hiện có thể dùng `orderId` giả; phải làm sạch trước khi thêm order foreign key.
- Order items hiện không lưu title/price snapshot nên backfill lịch sử chỉ là best effort.
- Category và merchant Express mutations hiện chưa thể hiện admin authorization.
- Order status và merchant status đang là string tự do.
- Nhiều trang còn mojibake, tiếng Anh và style trắng/xanh.
- Collector set delete hiện tự tháo product khỏi set, có thể phá logic hoàn thành bộ.
- Code/reward pages đang dùng manual lookup maps và `any` thay vì relations/typed filters.
- Settings chưa có model hoặc API.

### Assumptions

- MySQL tiếp tục là database đang chạy, dù skill template ban đầu nhắc PostgreSQL.
- Mỗi bộ sưu tập của đợt này có đúng 10 slot.
- Reward được tạo tự động khi user đủ 10 slot và không do admin cấp thủ công.
- Code vật lý có thể được tạo trước khi biết user hoặc order.
- Product CMS hiện tại vẫn là nguồn để gán product vào collector set/slot.
- Chỉ admin mới truy cập CMS.

### Open questions

1. Code có bắt buộc thuộc một order sau khi bán hay có thể được phát hành/in trước?
2. Admin có cần gửi lại email/thông báo reward cho user từ CMS không?
3. Ngoài ownership code bắt buộc audit, có mở rộng audit log cho settings, order status, code disable và role user trong cùng đợt không?

### Recommended defaults

- Cho `orderId` nullable và liên kết order chỉ khi nghiệp vụ bán hàng cung cấp dữ liệu đáng tin cậy.
- Không thêm manual reward creation.
- Bắt buộc audit ownership code trong đợt này; audit các mutation admin khác có thể là follow-up nếu chưa được xác nhận.
