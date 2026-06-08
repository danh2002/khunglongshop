# Issue #3: Admin CMS for User and Product Management

Source: https://github.com/danh2002/khunglongshop/issues/3

## Overview

Issue #3 requests a CMS for administrators to manage the website, with two confirmed modules:

1. User account management (CRUD).
2. Product management (CRUD).

The repository already contains an early admin dashboard and management pages under `/admin`, including users, products, categories, merchants, orders, collector sets, redemption codes, rewards, bulk upload, and settings. It also has Express controllers for user and product CRUD.

This specification focuses on turning the existing user and product pages into a secure, consistent, production-ready CMS rather than creating a second admin system.

Confirmed requirements from the issue:

- The CMS is available to administrators.
- Administrators can create, read, update, and delete users.
- Administrators can create, read, update, and delete products.

Inferred implementation choices:

- Keep `/admin` as the canonical CMS route.
- Reuse NextAuth role information and existing Prisma models.
- Prefer authenticated Next.js App Router admin APIs as the browser-facing CMS boundary.
- Keep Express services only where required by existing storefront or backend integrations.
- Treat categories, merchants, orders, collector sets, codes, rewards, and settings as later CMS modules unless explicitly added to this issue.

## Goals

- Provide a protected CMS at `/admin` that only users with role `admin` can access.
- Provide a consistent admin shell with navigation, page titles, loading states, empty states, errors, and confirmation dialogs.
- Allow admins to list, search, paginate, create, edit, and safely delete users.
- Allow admins to list, search, filter, paginate, create, edit, and safely delete products.
- Validate every mutation on the server with Zod or an equivalent existing validation helper.
- Prevent password hashes and other sensitive fields from being returned to the browser.
- Prevent privilege mistakes such as deleting the current admin or removing the final admin account.
- Respect product relations to categories, merchants, orders, collector sets, redemption codes, and bulk-upload records.
- Use Vietnamese-first CMS copy.
- Align the CMS with the project identity while keeping it dense and operational:
  - Background: `#070707`
  - Primary accent: `#e85d00`
  - Compact tables, filters, forms, and status indicators
- Add focused tests for authorization, validation, CRUD behavior, and destructive-action constraints.

## Non-goals

- Do not build a generic headless CMS or page-builder.
- Do not add rich-text page editing, blog management, media-library DAM, or theme customization.
- Do not redesign the public storefront.
- Do not implement customer self-service account editing.
- Do not include order, category, merchant, collector-set, redemption-code, reward, or settings CRUD in the first delivery unless required as product form dependencies.
- Do not support arbitrary custom roles or granular permissions in this issue. Roles remain `admin` and `user`.
- Do not hard-delete business records when doing so would break order history or collector history.
- Do not expose raw Prisma errors or database details to administrators.
- Do not return user password hashes from any CMS endpoint.

## User Stories / UX Flow

### Admin Access

1. As an admin, I can open `/admin` and see the CMS dashboard.
2. As a guest, I am redirected to `/login` with a safe callback URL.
3. As a logged-in non-admin user, I cannot access admin pages or admin APIs.
4. As an admin, I can navigate between the dashboard, users, and products from a persistent sidebar.

### User Management

1. As an admin, I can view users in a paginated table.
2. As an admin, I can search users by email.
3. As an admin, I can filter users by role.
4. As an admin, I can create a user with email, password, and role.
5. As an admin, I can edit a user's email and role.
6. As an admin, I can optionally reset a user's password.
7. As an admin, I can delete an eligible user after confirmation.
8. As an admin, I receive a clear explanation when a user cannot be deleted.
9. As an admin, I cannot delete my own active account.
10. As an admin, I cannot demote or delete the final admin account.

### Product Management

1. As an admin, I can view products in a paginated table with image, title, price, stock, category, merchant, and collector status.
2. As an admin, I can search by title or slug.
3. As an admin, I can filter by category, merchant, stock state, and collector set.
4. As an admin, I can create a product with all required relations.
5. As an admin, I can edit an existing product.
6. As an admin, I can assign a product to a collector set and slot when it is collectible.
7. As an admin, I can remove a product that has no protected business references.
8. As an admin, I receive a clear explanation when a product cannot be deleted.

Suggested Vietnamese copy:

- Dashboard: `Tổng quan`
- Users: `Người dùng`
- Products: `Sản phẩm`
- Add user: `Thêm người dùng`
- Add product: `Thêm sản phẩm`
- Search: `Tìm kiếm`
- Save: `Lưu thay đổi`
- Delete: `Xóa`
- Cancel: `Hủy`
- No results: `Không tìm thấy dữ liệu phù hợp`
- Delete confirmation: `Hành động này không thể hoàn tác.`
- Forbidden: `Bạn không có quyền thực hiện thao tác này.`

## Technical Design

### Default Decisions

- Role storage is migrated from nullable `String?` to `Role` enum with values `admin` and `user`, default `user`, non-null. Existing `NULL` or unknown roles are normalized to `user` in the migration.
- Product images are stored as project-relative strings that reference files under `public/images`, for example `/images/product.png`. Upload is out of scope for this phase.
- Product price is stored as a VND integer, for example `150000`, and displayed with a `đ` suffix. No unit conversion is performed.
- CMS list count fields such as `orderCount` and `wishlistCount` must use Prisma `_count`, not one manual count query per row.
- Phase 1 schema hardening includes `@@index([role])` on `User` and `@@index([categoryId])`, `@@index([merchantId])`, `@@index([setId])`, and `@@index([inStock])` on `Product`.

### Architecture

Use the existing Next.js App Router admin area as the browser-facing CMS.

Preferred route structure:

```text
app/
  (dashboard)/
    admin/
      layout.tsx
      page.tsx
      users/
        page.tsx
        new/page.tsx
        [id]/page.tsx
      products/
        page.tsx
        new/page.tsx
        [id]/page.tsx
  api/
    admin/
      users/
        route.ts
        [id]/route.ts
      products/
        route.ts
        [id]/route.ts
```

The browser must not call unrestricted Express CRUD endpoints directly. The Next.js admin APIs should:

- Resolve the NextAuth server session.
- Require `session.user.role === "admin"`.
- Validate query parameters and request bodies.
- Execute Prisma operations or call a trusted internal service.
- Return stable typed JSON responses.

The existing Express CRUD endpoints are part of the security boundary for this issue. Before this issue can be considered production-ready, every Express create/update/delete endpoint for users and products must either:

- Enforce verified admin authentication and authorization equivalent to the Next.js admin APIs, or
- Be removed from browser/client use and made unreachable from untrusted clients.

Rate limiting, CORS, hidden UI links, and client-side checks are not sufficient substitutes for server-side admin authorization.

### Admin Authorization

Create or standardize a server-side helper:

```ts
type AdminSession = {
  user: {
    id: string;
    email: string;
    role: "admin";
  };
};
```

Required behavior:

- Page access is protected by middleware and server-side checks.
- API access is independently protected; middleware alone is insufficient.
- `401 Unauthorized` is returned when no session exists.
- `403 Forbidden` is returned when the session role is not `admin`.
- Authorization must never trust a role supplied by request body, query string, or client state.
- Avoid broad `any` casts in `utils/adminAuth.ts`; extend NextAuth types instead.

### CMS Shell

Create a shared admin layout rather than rendering `DashboardSidebar` independently on every page.

The layout should provide:

- Persistent sidebar on desktop.
- Compact drawer/navigation on mobile.
- Active-route indication.
- Page content area with stable responsive dimensions.
- Admin identity and logout action.
- Consistent dark/orange visual tokens.

The CMS should prioritize scanning and repeated operations. Avoid oversized marketing headers or decorative card-heavy layouts.

### Data Fetching

List APIs use server-side pagination and filtering.

Shared list query shape:

```ts
type AdminListQuery = {
  page?: number;       // default 1
  limit?: number;      // default 20, maximum 100
  search?: string;
  sort?: string;
  direction?: "asc" | "desc";
};
```

Shared list response:

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

Search input should be debounced. Filters and page number should be reflected in URL search parameters so admin views remain refreshable and shareable.

### Validation and Error Shape

Use Zod schemas shared by route handlers and forms where practical.

Stable error response:

```ts
type AdminApiError = {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
};
```

Expected codes include:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `USER_NOT_FOUND`
- `PRODUCT_NOT_FOUND`
- `EMAIL_ALREADY_EXISTS`
- `SLUG_ALREADY_EXISTS`
- `SELF_DELETE_FORBIDDEN`
- `LAST_ADMIN_FORBIDDEN`
- `USER_HAS_DEPENDENCIES`
- `PRODUCT_HAS_ORDER_HISTORY`
- `PRODUCT_HAS_COLLECTOR_HISTORY`

## API Changes

### User APIs

#### `GET /api/admin/users`

Query:

```ts
{
  page?: number;
  limit?: number;
  search?: string;
  role?: "admin" | "user";
  sort?: "email" | "role";
  direction?: "asc" | "desc";
}
```

Response item:

```ts
type AdminUserListItem = {
  id: string;
  email: string;
  role: "admin" | "user";
  orderCount: number;
  wishlistCount: number;
};
```

Passwords must never be selected or serialized.

#### `POST /api/admin/users`

Body:

```ts
{
  email: string;
  password: string;
  role: "admin" | "user";
}
```

Rules:

- Normalize email with `trim().toLowerCase()`.
- Validate email format.
- Require the same password policy used by registration.
- Hash passwords with the existing bcrypt cost.
- Reject duplicate emails with `409`.
- Accept only the known role values.

#### `GET /api/admin/users/:id`

Returns editable user fields and dependency counts. It must not return `password`.

#### `PATCH /api/admin/users/:id`

Body:

```ts
{
  email?: string;
  role?: "admin" | "user";
  password?: string;
}
```

Rules:

- Omitted password means no password change.
- A supplied password must pass the full password policy and be hashed.
- Prevent demoting the final remaining admin.
- Final-admin checks must run inside the same transaction as the role update. Re-count admin users immediately before the mutation so two concurrent requests cannot both demote/delete the last admin.
- Normalize email before checking uniqueness.

#### `DELETE /api/admin/users/:id`

Rules:

- Reject deleting the current authenticated admin.
- Reject deleting the final admin.
- Final-admin checks must run inside the same transaction as the delete. Re-count admin users immediately before deletion.
- Check related orders, wishlist records, notifications, bulk-upload batches, redemption codes, and set rewards.
- Preserve order and collector audit history.
- Initial safe behavior: reject deletion with dependency counts when protected records exist.
- Return `204` only after successful deletion.

### Product APIs

#### `GET /api/admin/products`

Query:

```ts
{
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  merchantId?: string;
  setId?: string;
  stock?: "all" | "in-stock" | "out-of-stock";
  isCollector?: boolean;
  sort?: "title" | "price" | "inStock";
  direction?: "asc" | "desc";
}
```

Response item:

```ts
type AdminProductListItem = {
  id: string;
  slug: string;
  title: string;
  mainImage: string;
  price: number;
  inStock: number;
  category: { id: string; name: string };
  merchant: { id: string; name: string };
  isCollector: boolean;
  set: { id: string; name: string } | null;
  setSlotNumber: number | null;
};
```

#### `POST /api/admin/products`

Body:

```ts
{
  title: string;
  slug: string;
  mainImage: string;
  price: number;
  rating?: number;
  description: string;
  manufacturer: string;
  inStock: number;
  categoryId: string;
  merchantId: string;
  isCollector: boolean;
  setId?: string | null;
  setSlotNumber?: number | null;
}
```

Rules:

- Slug is normalized to kebab-case and must be unique.
- `price` and `inStock` must be non-negative integers under the current storage model.
- Category and merchant must exist.
- When `isCollector` is false, force `setId` and `setSlotNumber` to `null`.
- When `isCollector` is true, require a valid collector set and a slot in `1..totalSlots`.
- Respect the existing unique constraint on `[setId, setSlotNumber]`.
- If a product already has any `RedemptionCode` records, do not allow changing `isCollector`, `setId`, or `setSlotNumber`. These fields define collection progress and changing them after code issuance can corrupt user unlock history.
- Store a project-relative image path or approved remote URL according to the existing image strategy.

#### `GET /api/admin/products/:id`

Returns the complete editable product plus relation options needed by the form.

#### `PATCH /api/admin/products/:id`

Uses the same validation rules as creation and handles unique slug/collector-slot conflicts with `409`.

Additional collector invariants:

- A product with any `RedemptionCode` records may still edit safe display fields such as title, image, description, price, stock, category, or merchant.
- A product with any `RedemptionCode` records must not change `isCollector`, `setId`, or `setSlotNumber`.
- A product assigned to a collector set but without codes may move slots only if the destination slot is empty or belongs to the same product.
- If a collector product needs a destructive reassignment after codes exist, require a separate data-repair workflow outside this issue.

#### `DELETE /api/admin/products/:id`

Rules:

- Reject deletion when the product appears in order history.
- Reject deletion when redemption codes exist for the product.
- Reject deletion when bulk-upload or collector history must be preserved.
- Reject deletion when `setId` is not `null`, even if no redemption codes exist yet. Deleting a slotted collector product would leave the set below `totalSlots` and make completion impossible.
- If deletion is allowed, remove dependent wishlist records through the existing cascade behavior.
- Do not silently delete customer history.

### Supporting Reference Data

Product forms require read-only admin reference endpoints or existing trusted APIs for:

- Categories.
- Merchants.
- Collector sets and available slots.

These endpoints are dependencies of product CRUD, not an expansion into full CRUD for those modules.

## Schema / Prisma Changes

No mandatory new business models are required for the confirmed user/product CRUD scope. Reuse:

- `User`
- `Product`
- `Category`
- `Merchant`
- `CollectorSet`
- `Customer_order`
- `customer_order_product`
- `Wishlist`
- `RedemptionCode`
- `SetReward`

Required schema hardening for Phase 1:

1. Migrate user role to a non-null enum:

```prisma
enum Role {
  admin
  user
}

model User {
  // Existing fields
  role Role @default(user)
}
```

2. Add indexes for CMS search and filtering:

```prisma
model User {
  // Existing fields
  @@index([role])
}

model Product {
  // Existing fields
  @@index([categoryId])
  @@index([merchantId])
  @@index([setId])
  @@index([inStock])
}
```

3. Keep the existing unique constraints:

- `User.email`
- `Product.slug`
- `Product.[setId, setSlotNumber]`

4. Optional follow-up, not required for initial CRUD: add audit logging.

```prisma
model AdminAuditLog {
  id         String   @id @default(cuid())
  adminId    String
  action     String
  entityType String
  entityId   String?
  metadata   Json?
  createdAt  DateTime @default(now())

  @@index([adminId, createdAt])
  @@index([entityType, entityId])
}
```

Audit logging should only be added if the product owner confirms it is required for the first release.

Migration notes:

- Generate a new migration only if indexes or audit fields are accepted.
- Do not edit prior migrations.
- Validate both root and `server/prisma/schema.prisma` if the project continues maintaining duplicate schemas.

## Frontend Changes

### Shared Admin Components

Create or standardize:

- `AdminShell`
- `AdminSidebar`
- `AdminPageHeader`
- `AdminDataTable`
- `AdminPagination`
- `AdminSearchInput`
- `AdminFilterBar`
- `AdminEmptyState`
- `AdminErrorState`
- `ConfirmDialog`
- `UserForm`
- `ProductForm`

Use the icon library already available in the project. Buttons for edit, delete, save, filter, and pagination should use familiar icons with accessible labels/tooltips.

### User List

Columns:

- Email
- Role
- Orders
- Wishlist items
- Actions

Behavior:

- Search by email.
- Filter by role.
- Stable row key: `user.id`, not a generated `nanoid()` on every render.
- Loading skeleton.
- Empty and error states.
- Delete confirmation includes the target email.

### User Form

Fields:

- Email
- Role
- Password
- Confirm password

For edit mode:

- Password fields are optional.
- Show an explicit `Đặt lại mật khẩu` section.
- Do not prefill or expose the stored password/hash.

### Product List

Columns:

- Thumbnail
- Product name
- Slug
- Price
- Stock
- Category
- Merchant
- Collector set/slot
- Actions

Behavior:

- Search and filters remain visible above the table.
- Out-of-stock rows receive a clear status indicator.
- Collector assignment is visible without opening the detail page.
- Destructive actions require confirmation.

### Product Form

Sections:

1. Basic information.
2. Pricing and inventory.
3. Category and merchant.
4. Product image.
5. Collector configuration.

Collector controls:

- Toggle `Sản phẩm sưu tập`.
- Show set and slot fields only when enabled.
- Fetch available slots for the selected set.
- Prevent selecting an occupied slot unless it belongs to the product being edited.

All user-facing text should be Vietnamese-first. Add `vi/en/zh` keys if the admin application is placed under the existing `next-intl` setup later.

## Backend Changes

### Authorization Boundary

- Add `requireAdminApi()` for route handlers.
- Protect every `/api/admin/**` endpoint.
- Review existing Express `/api/users` and product mutation endpoints.
- Treat unprotected Express user/product mutations as release blockers. `POST`, `PUT/PATCH`, and `DELETE` for Express `/api/users` and `/api/products` must require verified admin auth or be made unreachable from untrusted clients.
- Rate limiting is supplementary and must not be treated as authorization.

### User Service

Centralize:

- Email normalization.
- Duplicate-email handling.
- Password hashing.
- Role validation.
- Final-admin checks inside the same transaction as role changes/deletes.
- User dependency checks.
- Password exclusion from responses.

### Product Service

Centralize:

- Slug normalization.
- Category and merchant existence checks.
- Collector set/slot validation.
- Collector assignment immutability after redemption codes are issued.
- Unique-conflict translation.
- Product dependency checks before deletion.

Use Prisma transactions where one mutation requires multiple dependent checks and writes.
Final-admin checks, dependency checks, collector-slot checks, and their corresponding mutations should be performed in a single transaction when possible.

### Security Requirements

- No password hash in API responses, logs, form state, or error metadata.
- No client-controlled authorization.
- No mass assignment of request bodies into Prisma.
- Explicitly map validated fields into `data`.
- Escape or safely render all administrator-entered text.
- Restrict image paths/URLs to the supported strategy.
- Use generic internal-error messages and server-side logging.
- Apply CSRF-resistant session behavior through NextAuth and same-site cookies.
- Prevent open redirects in login callback handling.

## Implementation Steps

### Phase 1: Foundation and Authorization

1. Add a shared admin layout and consolidate sidebar rendering.
2. Replace `any`-based admin session access with typed NextAuth session fields.
3. Add `requireAdminApi()` with consistent `401/403` responses.
4. Add shared API error and pagination helpers.
5. Audit Express user/product mutations and close unauthorized access paths. This is a release blocker, not optional hardening.

### Phase 2: User CMS

1. Add user query and mutation Zod schemas.
2. Add `/api/admin/users` list/create handlers.
3. Add `/api/admin/users/[id]` detail/update/delete handlers.
4. Implement self-delete and final-admin protection.
5. Implement final-admin checks transactionally for demotion and deletion.
6. Implement dependency-aware deletion.
7. Rebuild the user list with search, role filter, pagination, and stable keys.
8. Reuse one `UserForm` for create and edit.
9. Add loading, empty, success, validation, and conflict states.

### Phase 3: Product CMS

1. Add product query and mutation Zod schemas.
2. Add product reference-data queries.
3. Add `/api/admin/products` list/create handlers.
4. Add `/api/admin/products/[id]` detail/update/delete handlers.
5. Implement slug and collector-slot conflict handling.
6. Enforce collector assignment immutability after redemption codes exist.
7. Reject deletion of products assigned to collector sets unless they are first safely unassigned/replaced.
8. Implement dependency-aware deletion.
9. Rebuild the product list with server-side filtering and pagination.
10. Reuse one `ProductForm` for create and edit.

### Phase 4: Visual Consistency and Accessibility

1. Apply the dark/orange admin theme.
2. Ensure tables and forms work at desktop and mobile widths.
3. Add labels, keyboard focus, tooltips, and dialog focus management.
4. Standardize Vietnamese copy and toast/error behavior.
5. Remove generated row keys and layout shifts.

### Phase 5: Tests and Verification

1. Add API authorization and validation tests.
2. Add service tests for safety constraints.
3. Add UI tests for forms, filters, dialogs, and error states.
4. Run Prisma validation/generation, type-check, lint, tests, and build.
5. Verify admin and non-admin workflows manually.

## Test Cases

### Authorization

1. Guest opening `/admin/users` is redirected to login.
2. Normal user opening `/admin/products` receives no CMS access.
3. Guest calling `/api/admin/users` receives `401`.
4. Normal user calling `/api/admin/products` receives `403`.
5. Admin can access both pages and APIs.
6. Supplying `"role": "admin"` in a request does not bypass authorization.
7. Express `/api/users` create/update/delete rejects unauthenticated and non-admin callers.
8. Express `/api/products` create/update/delete rejects unauthenticated and non-admin callers.

### User CRUD

1. Admin lists users without password fields.
2. Search is case-insensitive for normalized emails.
3. Role filter returns only matching users.
4. Admin creates a user with a valid unique email and password.
5. Duplicate normalized email returns `409`.
6. Invalid email returns field-level validation feedback.
7. Weak password is rejected.
8. Editing email does not change password.
9. Resetting password stores a bcrypt hash, never plain text.
10. Invalid role is rejected.
11. Admin cannot delete their own account.
12. Final admin cannot be demoted or deleted.
13. Two concurrent final-admin demotion/delete attempts cannot leave the system with zero admins.
14. User with protected business history cannot be hard-deleted.
15. Eligible user deletion returns `204`.

### Product CRUD

1. Admin lists products with category and merchant data.
2. Search matches title and slug.
3. Filters for category, merchant, stock, and collector state work together.
4. Pagination returns stable totals and page boundaries.
5. Valid product creation succeeds.
6. Duplicate slug returns `409`.
7. Missing category or merchant returns validation/not-found feedback.
8. Negative price or stock is rejected.
9. Non-collector product stores `setId` and `setSlotNumber` as `null`.
10. Collector product requires a valid set and slot.
11. Slot outside `1..totalSlots` is rejected.
12. Occupied collector slot returns `409`.
13. Product edit preserves unspecified values.
14. Product with redemption-code history cannot change `isCollector`, `setId`, or `setSlotNumber`.
15. Product assigned to a collector set cannot be deleted while it occupies a slot.
16. Product referenced by order history cannot be deleted.
17. Product with redemption-code history cannot be deleted.
18. Eligible product deletion returns `204`.

### UI

1. User and product tables show loading states.
2. Empty search results show a Vietnamese empty state.
3. API errors do not leave forms permanently disabled.
4. Delete dialogs show the correct entity name.
5. Keyboard users can operate menus, forms, pagination, and dialogs.
6. Long emails, product names, and slugs do not overflow table cells or controls.
7. Mobile layouts do not overlap the sidebar, table actions, or form fields.

### Regression

1. Public product catalog still loads.
2. Registration and login still work.
3. Customer order history remains intact.
4. Collector products retain set and slot assignments after edits.
5. Redemption codes continue to unlock the intended products.
6. Existing admin modules remain navigable even if not redesigned in this issue.

## Risks / Open Questions

### Confirmed Risks

- Existing Express user and product CRUD endpoints appear to rely on rate limiting but do not clearly enforce admin authentication. This is a critical security risk.
- User and product deletion can affect orders, collector codes, rewards, wishlist entries, and bulk-upload history.
- The project maintains Prisma schemas in both root and `server/`; schema drift is possible.
- Existing admin pages mix styles and repeat the sidebar rather than using a shared layout.
- Some current admin tables fetch all records without pagination, which will degrade as the catalog grows.
- Existing UI text contains encoding/mojibake in several files.

### Assumptions

- `admin` and `user` remain the only supported roles.
- MySQL is the active database provider in the current repository.
- NextAuth remains the authentication source of truth.
- Products continue to require valid category and merchant relations.
- Hard deletion is allowed only when no protected historical dependencies exist.
- The first release covers users and products; other sidebar modules remain out of scope.

### Open Questions

1. Should users with order history be disabled/anonymized instead of rejected from deletion?
2. Should products support an `archived` state so catalog items with history can be hidden without deletion?
3. Should admins be able to bulk-select and modify/delete records?
4. Should product images be uploaded through the CMS or entered as existing paths/URLs?
5. Is an immutable admin audit log required for launch?
6. Should all current admin modules be visually migrated in this issue, or only users/products plus the shared shell?
7. Should Express remain the main mutation backend, or should admin mutations move fully to Next.js route handlers?

Recommended defaults if no clarification is provided:

- Reject hard deletion when protected history exists.
- Reject deletion of slotted collector products until they are safely unassigned or replaced.
- Lock collector assignment fields after any redemption code has been issued for a product.
- Add archive/deactivate behavior in a follow-up issue.
- Do not add bulk destructive actions in the first release.
- Reuse the current image path strategy.
- Implement users/products and the shared admin shell only.
- Use authenticated Next.js admin route handlers as the browser-facing API.
