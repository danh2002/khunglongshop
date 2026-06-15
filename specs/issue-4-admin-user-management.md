# Issue #4: Quản lý người dùng trong CMS Admin

Source: https://github.com/danh2002/khunglongshop/issues/4#issue-4646766260

## Overview

Issue #4 yêu cầu hoàn thiện chức năng quản lý tài khoản trong CMS:

1. Chỉ admin được truy cập CMS.
2. Admin có thể đổi vai trò giữa `user` và `admin`.
3. Admin có thể tạo tài khoản mới.
4. Tiêu đề issue đồng thời yêu cầu khả năng thêm, xóa và sửa user.

Repository đã có nền tảng ban đầu:

- `/admin/users`, `/admin/users/new`, `/admin/users/[id]`.
- `GET/POST /api/admin/users`.
- `GET/PATCH/PUT/DELETE /api/admin/users/[id]`.
- NextAuth, middleware và server layout bảo vệ `/admin`.
- `requireAdminApi()` bảo vệ admin API.
- Prisma `User.role` dùng enum `admin | user`.
- User có trạng thái `isActive` và `deactivatedAt`.
- Đã có kiểm tra self-delete, admin cuối cùng và dependency trước khi hard delete.

Đợt triển khai này không tạo một hệ thống user mới. Mục tiêu là hoàn thiện module hiện có để quyền hạn được áp dụng an toàn, CRUD có hành vi nhất quán và giao diện đủ rõ ràng cho vận hành thực tế.

### Yêu cầu đã xác nhận

- Chỉ admin được vào CMS.
- Admin có thể tạo user mới.
- Admin có thể chỉnh sửa user.
- Admin có thể đổi vai trò `user <-> admin`.
- Admin có thể xóa user khi việc xóa không phá dữ liệu liên quan.

### Lựa chọn triển khai suy luận

- Giữ Next.js App Router `/api/admin/users/**` làm API dành cho browser.
- Role chỉ có `admin` và `user`; không thêm permission tùy chỉnh.
- Hard delete chỉ dành cho tài khoản không có lịch sử cần bảo toàn.
- Tài khoản có dependency hoặc audit history được vô hiệu hóa thay vì xóa cứng.
- Việc đổi role hoặc vô hiệu hóa phải có hiệu lực ở request admin tiếp theo, không chỉ sau khi JWT hết hạn.
- Admin không được tự hạ role hoặc tự vô hiệu hóa tài khoản đang đăng nhập.
- Audit logging cho user mutations không nằm trong phạm vi Issue #4 và sẽ được bổ sung ở issue riêng.
- Dùng giao diện tiếng Việt, nền `#070707`, accent `#e85d00`.

## Goals

- Chặn guest và user thường khỏi mọi trang/API quản trị user.
- Cho admin tìm kiếm, lọc, phân trang và xem trạng thái tài khoản.
- Cho admin tạo user với email, mật khẩu, role và trạng thái hợp lệ.
- Cho admin sửa email, role, trạng thái hoạt động và đặt lại mật khẩu.
- Không bao giờ trả password hash về browser.
- Ngăn self-delete, ngăn hệ thống mất admin hoạt động cuối cùng.
- Bảo toàn order, collector, reward và audit history.
- Áp dụng thay đổi quyền ngay ở request admin tiếp theo.
- Chuẩn hóa validation, error response và nội dung tiếng Việt.
- Có test cho authorization, CRUD, role transition, deactivation và concurrency-sensitive rules.

## Non-goals

- Không thêm role ngoài `admin` và `user`.
- Không xây permission matrix hoặc RBAC tùy chỉnh.
- Không xây bulk delete/bulk role update.
- Không cho user tự sửa role hoặc trạng thái của mình.
- Không gửi email mời hoặc quy trình kích hoạt qua email trong issue này.
- Không thay đổi flow đăng ký công khai.
- Không quản lý OAuth identity/provider account trong CMS.
- Không xóa cứng user có lịch sử nghiệp vụ cần bảo toàn.
- Không redesign các module CMS ngoài user management.

## User Stories / UX Flow

### Truy cập CMS

1. Guest mở `/admin/users` được chuyển tới đăng nhập.
2. User role `user` không truy cập được trang quản trị.
3. Guest gọi `/api/admin/users` nhận `401`.
4. User thường gọi `/api/admin/users` nhận `403`.
5. Admin đang active truy cập được danh sách, tạo mới và chi tiết user.
6. Admin bị hạ role hoặc vô hiệu hóa mất quyền ở request admin tiếp theo.

### Danh sách user

1. Admin mở `/admin/users`.
2. Danh sách hiển thị email, role, trạng thái, số order, số wishlist và thao tác.
3. Admin tìm kiếm theo email.
4. Admin lọc theo role và trạng thái `active/inactive`.
5. Filter và page được lưu trong URL search params.
6. Loading, empty và error state dùng tiếng Việt đúng encoding.

### Tạo user

1. Admin chọn `Thêm người dùng`.
2. Nhập email, mật khẩu, xác nhận mật khẩu và role.
3. Mặc định role là `user`.
4. Email được trim và lowercase.
5. Email trùng trả lỗi rõ ràng.
6. Mật khẩu không đạt policy hiển thị field error.
7. Thành công chuyển tới trang chi tiết user mới hoặc danh sách.

### Chỉnh sửa user

1. Admin mở `/admin/users/[id]`.
2. Có thể đổi email, role và trạng thái hoạt động.
3. Có thể đặt lại mật khẩu; để trống nghĩa là giữ mật khẩu hiện tại.
4. Không hiển thị hoặc prefill password/hash.
5. Hạ role admin cuối cùng hoặc vô hiệu hóa admin cuối cùng bị từ chối.
6. Khi role/status thay đổi thành công, quyền mới được kiểm tra từ database ở request admin tiếp theo.

### Xóa hoặc vô hiệu hóa

1. Admin phải xác nhận trước thao tác phá hủy.
2. Admin không thể hard delete chính tài khoản đang đăng nhập.
3. Admin cuối cùng không thể bị hard delete, hạ role hoặc vô hiệu hóa.
4. User không có dependency được hard delete và API trả `204`.
5. User có order, reward, redemption code, bulk upload hoặc audit history không được hard delete.
6. Với user có lịch sử cần bảo toàn, UI hướng admin tới thao tác `Vô hiệu hóa`.
7. User inactive không thể đăng nhập bằng credentials hoặc OAuth.

## Technical Design

### Architecture

Giữ cấu trúc hiện có:

```text
app/
  (dashboard)/
    layout.tsx
    admin/
      users/
        page.tsx
        new/page.tsx
        [id]/page.tsx
  api/
    admin/
      users/
        route.ts
        [id]/route.ts

lib/
  adminUserValidation.ts
  adminApi.ts
  adminResponses.ts

utils/
  adminAuth.ts
  authOptions.ts
```

Không gọi Express `/api/users` từ CMS. Browser chỉ dùng `/api/admin/users/**`.

### Authorization

`middleware.ts` tiếp tục chặn route `/admin`, nhưng middleware không phải boundary duy nhất.

`app/(dashboard)/layout.tsx` và mọi `/api/admin/**` phải dùng helper server-side. Helper cần:

1. Lấy NextAuth session.
2. Lấy `session.user.id`.
3. Query user hiện tại từ Prisma với `id`, `role`, `isActive`.
4. Chỉ cho phép khi user tồn tại, `role === "admin"` và `isActive === true`.

Không chỉ tin `token.role`, vì JWT hiện có thể giữ role cũ tới khi session hết hạn.

Hành vi:

- Không session: page redirect `/login`, API trả `401`.
- Session không còn user, user inactive hoặc role không còn là admin: page redirect `/`, API trả `403`.
- Không nhận role hoặc actor ID từ request body/query.
- Promotion có hiệu lực ở request admin tiếp theo thông qua DB revalidation, giống demotion; không yêu cầu đăng nhập lại.
- Actor không được tự hạ role hoặc tự deactivate. API trả `409 SELF_ACCESS_CHANGE_FORBIDDEN`.

Để promotion không bị stale JWT role chặn trước khi DB revalidation chạy:

- Middleware chỉ dùng token để xác nhận request `/admin/**` đã đăng nhập.
- Quyết định role/status cuối cùng nằm ở `requireAdmin()` sau khi query database.
- API tiếp tục dùng `requireAdminApi()` và database làm nguồn quyền hiện tại.

### Shared Types

```ts
type UserRole = "admin" | "user";

type AdminUserListItem = {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  deactivatedAt: string | null;
  orderCount: number;
  wishlistCount: number;
};

type UserDependencyCounts = {
  orderCount: number;
  wishlistCount: number;
  notificationCount: number;
  bulkUploadBatchCount: number;
  redemptionCodeCount: number;
  setRewardCount: number;
  adminAuditLogCount: number;
  blindBoxAllocationCount: number;
};

type AdminUserDetail = AdminUserListItem & {
  dependencyCounts: UserDependencyCounts;
};
```

Đặt các type dùng chung trong module nội bộ thay vì lặp lại ở từng page.

### Validation

Tạo schema dùng chung cho create/update/query:

```ts
const adminUserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(254).optional(),
  role: z.enum(["admin", "user"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  sort: z.enum(["email", "role"]).default("email"),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

const adminUserCreateSchema = z.object({
  email: commonValidations.email,
  password: commonValidations.password,
  role: z.enum(["admin", "user"]).default("user"),
});

const adminUserUpdateSchema = z.object({
  email: commonValidations.email.optional(),
  password: commonValidations.password.optional().or(z.literal("")),
  role: z.enum(["admin", "user"]).optional(),
  isActive: z.boolean().optional(),
}).refine(/* ít nhất một thay đổi */);
```

Create và reset password phải dùng cùng policy, trừ khi product owner xác nhận reset được phép dùng policy yếu hơn. Default của spec là dùng `commonValidations.password` cho cả hai.

### Error Contract

Giữ shape:

```ts
type AdminApiError = {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
    details?: {
      dependencyCounts: UserDependencyCounts;
    };
  };
};
```

Codes:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `USER_NOT_FOUND`
- `EMAIL_ALREADY_EXISTS`
- `SELF_DELETE_FORBIDDEN`
- `SELF_ACCESS_CHANGE_FORBIDDEN`
- `LAST_ADMIN_FORBIDDEN`
- `USER_HAS_DEPENDENCIES`
- `USER_HAS_AUDIT_HISTORY`

Không trả raw Prisma error hoặc password hash.

## API Changes

### `GET /api/admin/users`

Query:

```ts
{
  page?: number;
  limit?: number;
  search?: string;
  role?: "admin" | "user";
  status?: "active" | "inactive";
  sort?: "email" | "role";
  direction?: "asc" | "desc";
}
```

Response:

```ts
{
  items: AdminUserListItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}
```

Rules:

- Search email sau normalize.
- Dùng Prisma `_count` cho order/wishlist.
- Không select password.
- Invalid query trả `400`, không âm thầm bỏ qua role/status sai.

### `POST /api/admin/users`

Body:

```ts
{
  email: string;
  password: string;
  role?: "admin" | "user";
}
```

Rules:

- Normalize email trước unique check.
- Hash bằng bcrypt cost hiện có.
- Duplicate email trả `409 EMAIL_ALREADY_EXISTS`.
- Prisma `P2002` do hai request đồng thời insert cùng email phải được bắt và chuyển thành `409 EMAIL_ALREADY_EXISTS`.
- Response `201` chỉ gồm `id`, `email`, `role`, `isActive`.

### `GET /api/admin/users/:id`

Trả `AdminUserDetail`, không trả password.

Dependency counts phải phản ánh đầy đủ:

- Orders.
- Wishlist.
- Notifications.
- Bulk upload batches.
- Redemption codes.
- Set rewards.
- Admin audit history.
- Blind-box allocations.

### `PATCH /api/admin/users/:id`

Body:

```ts
{
  email?: string;
  password?: string;
  role?: "admin" | "user";
  isActive?: boolean;
}
```

Rules:

- Omitted/empty password không đổi password.
- Email mới phải unique.
- Actor không được tự hạ role hoặc tự deactivate; trả `409 SELF_ACCESS_CHANGE_FORBIDDEN`.
- Final-admin count và mutation phải chạy trong transaction `SERIALIZABLE`, có retry khi deadlock hoặc serialization failure.
- Dùng Prisma `$transaction` với `isolationLevel: Prisma.TransactionIsolationLevel.Serializable`.
- Admin cuối cùng được tính bằng `role = admin AND isActive = true`.
- Không mass-assign body; map từng field đã validate.
- Response không chứa password.

`PUT` có thể tiếp tục alias sang `PATCH` để giữ tương thích hiện tại.

### `DELETE /api/admin/users/:id`

Rules:

1. Lấy actor từ session đã được DB revalidation.
2. Chặn `actor.id === target.id`.
3. Trong transaction:
   - Kiểm tra target tồn tại.
   - Kiểm tra final active admin.
   - Đếm dependency, bao gồm `BlindBoxAllocation`.
   - Chặn hard delete nếu có dependency/audit history.
   - Xóa user nếu đủ điều kiện.
4. Thành công trả `204`.

Transaction delete admin phải dùng `SERIALIZABLE` và cùng retry policy cho deadlock/serialization failure như PATCH.

UI phải đề xuất `Vô hiệu hóa` khi nhận:

- `USER_HAS_DEPENDENCIES`
- `USER_HAS_AUDIT_HISTORY`

Response dependency conflict phải dùng `error.details.dependencyCounts` theo `UserDependencyCounts`.

Không tự động đổi DELETE thành deactivate vì đây là hai ý định khác nhau.

## Schema / Prisma Changes

Schema hiện có đã hỗ trợ phạm vi đã xác nhận:

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  password      String?
  role          Role      @default(user)
  isActive      Boolean   @default(true)
  deactivatedAt DateTime?

  @@index([role])
  @@index([isActive])
}
```

Tiếp tục dùng relations hiện có để dependency check.

Nếu cần sort theo `createdAt` trong tương lai, thêm `User.createdAt` bằng Prisma migration trước khi mở rộng query contract.

Không sửa migration cũ. Nếu implementation phát hiện schema root và `server/prisma/schema.prisma` còn được dùng song song, phải xác nhận nguồn schema chính trước khi tạo migration tương lai.

## Frontend Changes

### Shared UI

Chuyển user pages sang các component hiện có trong `components/admin/AdminUi.tsx`:

- `AdminPage`
- `AdminPageHeader`
- `AdminActionLink`
- `AdminTable`
- `AdminStatusBadge`
- `AdminEmptyState`

Tạo component riêng khi giảm lặp thực sự:

```text
components/admin/
  UserForm.tsx
  UserDeleteActions.tsx
```

### User List

Columns:

- Email.
- Vai trò.
- Trạng thái.
- Đơn hàng.
- Wishlist.
- Thao tác.

Yêu cầu:

- Badge role và active/inactive.
- Search debounce khoảng 300 ms.
- Role/status/page nằm trong URL.
- Error state có retry.
- Không còn mojibake.

### Create/Edit Form

Fields:

- Email.
- Role.
- Trạng thái, chỉ ở edit mode.
- Password.
- Confirm password.

Yêu cầu:

- Client validation hỗ trợ UX nhưng server schema là nguồn quyết định.
- Hiển thị `fieldErrors` cạnh đúng input.
- Edit mode không prefill password.
- Save button chống submit lặp.
- Sau create chuyển tới `/admin/users/{id}`.

### Delete/Deactivate UX

- Dùng confirm dialog thay cho `window.confirm`.
- Hiển thị email target và hậu quả.
- Nếu hard delete bị chặn, hiển thị dependency counts.
- Nút `Vô hiệu hóa` được hiển thị khi target đang active.
- Nút `Kích hoạt lại` được hiển thị khi target inactive.
- Không hiển thị nút hard delete cho actor hiện tại.

## Backend Changes

### Admin Auth Revalidation

Cập nhật `requireAdmin()` và `requireAdminApi()` để kiểm tra role/status hiện tại trong database. Đây là phần bắt buộc để role change có hiệu lực ngay, thay vì chờ JWT 15 phút.

### User Validation

- Di chuyển create schema khỏi route file vào `lib/adminUserValidation.ts`.
- Dùng cùng email/password policy cho create và reset.
- Dùng `validationError()`/`adminError()` chung để tránh nhiều error formatter.

### User Mutation Transactions

Transaction bắt buộc cho:

- Hạ role admin.
- Vô hiệu hóa admin.
- Hard delete user.

Final-admin count và mutation phải chạy trong transaction `SERIALIZABLE`, có retry khi deadlock hoặc serialization failure.
Implementation dùng Prisma `$transaction` với `isolationLevel: Prisma.TransactionIsolationLevel.Serializable`.

### Session and Login

- Credentials login tiếp tục từ chối `isActive = false`.
- OAuth login tiếp tục từ chối user inactive.
- Admin API/page revalidation chặn token cũ sau role/status change.
- Promotion có hiệu lực ở request admin tiếp theo qua DB revalidation, không yêu cầu đăng nhập lại.
- Không log password, hash hoặc request body chứa password.

## Implementation Steps

1. Chuẩn hóa shared user types và Zod schemas.
2. DB-revalidate admin trong `requireAdmin()` và `requireAdminApi()`.
3. Bổ sung query validation và filter trạng thái cho `GET /api/admin/users`.
4. Chuẩn hóa create response và error helper.
5. Đồng bộ password policy giữa create và reset.
6. Rà soát transaction cho role/status/delete và final-admin protection.
7. Chuyển user list sang shared admin UI, thêm status filter/badge.
8. Tạo shared `UserForm` cho create/edit.
9. Thêm deactivate/reactivate controls.
10. Thay `window.confirm` bằng confirm dialog.
11. Sửa toàn bộ mojibake trong module user CMS.
12. Thêm unit, route-handler và integration tests.
13. Chạy Prisma validate/generate, type-check, unit tests, integration tests và build.

## Test Cases

### Authorization

1. Guest mở `/admin/users` bị chuyển tới login.
2. User thường không mở được `/admin/users`.
3. Guest gọi admin user API nhận `401`.
4. User thường gọi admin user API nhận `403`.
5. Admin active gọi API thành công.
6. Admin bị hạ role dùng JWT cũ nhận `403` ở request tiếp theo.
7. Admin bị deactivate dùng JWT cũ nhận `403` ở request tiếp theo.
8. Body chứa `role: "admin"` không bypass authorization.
9. Admin tự hạ role hoặc tự deactivate nhận `409 SELF_ACCESS_CHANGE_FORBIDDEN`.
10. User vừa được promote thành admin truy cập được ở request admin tiếp theo mà không cần đăng nhập lại.

### List

1. Response không chứa `password`.
2. Search email hoạt động sau normalize.
3. Role filter hoạt động.
4. Active/inactive filter hoạt động.
5. Invalid role/status query trả `400`.
6. Pagination giới hạn `1..100`.
7. `_count` trả đúng order và wishlist count.

### Create

1. Admin tạo user role mặc định `user`.
2. Admin tạo user role `admin`.
3. Email được trim/lowercase.
4. Email trùng trả `409`.
5. Email sai trả field error.
6. Mật khẩu yếu bị từ chối.
7. Confirm password sai bị chặn trên UI.
8. Database lưu bcrypt hash, không lưu plaintext.
9. Response không trả password.
10. Hai POST đồng thời với cùng email chỉ tạo được một user; request còn lại nhận `409 EMAIL_ALREADY_EXISTS`.

### Update

1. Đổi email hợp lệ thành công.
2. Email thuộc user khác trả `409`.
3. Đổi `user -> admin` thành công.
4. Đổi `admin -> user` thành công khi còn admin active khác.
5. Không thể hạ role admin active cuối cùng.
6. Không thể deactivate admin active cuối cùng.
7. Reset password lưu bcrypt hash.
8. Bỏ trống password giữ hash cũ.
9. Deactivate set `isActive=false` và `deactivatedAt`.
10. Reactivate set `isActive=true` và `deactivatedAt=null`.
11. Self-demote trả `409 SELF_ACCESS_CHANGE_FORBIDDEN`.
12. Self-deactivate trả `409 SELF_ACCESS_CHANGE_FORBIDDEN`.
13. Two concurrent demotions cannot leave zero active admins (serializable isolation).

### Delete

1. Self-delete trả `409 SELF_DELETE_FORBIDDEN`.
2. Final admin delete trả `409 LAST_ADMIN_FORBIDDEN`.
3. User có dependency trả `409 USER_HAS_DEPENDENCIES`.
4. User có audit history trả `409 USER_HAS_AUDIT_HISTORY`.
5. Eligible user delete trả `204`.
6. Dependency check và delete chạy trong một transaction.
7. Hai mutation đồng thời không thể làm hệ thống còn zero active admin, dùng serializable isolation.
8. User có `BlindBoxAllocation` trả `409 USER_HAS_DEPENDENCIES`.
9. Dependency conflict trả `error.details.dependencyCounts` đầy đủ.

### UI and Regression

1. Danh sách hiển thị loading/empty/error đúng.
2. Role/status badges có text, không chỉ dựa vào màu.
3. Form hiển thị field-level errors.
4. Delete/deactivate dialog dùng được bằng keyboard.
5. Email dài không phá layout.
6. Không còn mojibake trong user pages/toasts.
7. Login, registration, account và các admin module khác vẫn hoạt động.

## Risks / Open Questions

### Confirmed Risks

- JWT hiện giữ role trong token; nếu API chỉ tin session role, admin bị hạ quyền có thể tiếp tục truy cập tới khi token hết hạn.
- Password create đang dùng policy mạnh hơn password reset.
- UI hiện chưa hiển thị hoặc chỉnh sửa `isActive`.
- User pages chưa tái sử dụng đầy đủ shared `AdminUi`.
- Visible copy trong user CMS đang có mojibake.
- Route user hiện thiếu test cho authorization, CRUD và final-admin concurrency.
- Hard delete liên quan nhiều relations với `Cascade`, `SetNull` và `Restrict`; dependency policy phải được giữ rõ ràng.
- Final-admin mutations cần serializable isolation và retry để tránh concurrent write skew.

### Assumptions

- MySQL là database đang chạy, dù template skill đề cập PostgreSQL.
- NextAuth tiếp tục là nguồn session.
- `admin` và `user` là hai role duy nhất.
- User có lịch sử nghiệp vụ được deactivate thay vì anonymize trong issue này.
- Audit logging cho user mutations không nằm trong phạm vi Issue #4 và sẽ được bổ sung ở issue riêng.

### Open Questions

1. Có cần gửi email thông báo khi admin đổi role, reset password hoặc deactivate user không?

### Recommended Defaults

- Không gửi email tự động trong issue này.
