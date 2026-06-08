# Issue #2: Authentication, Logout, Profile Orders, and Collection

Source: https://github.com/danh2002/khunglongshop/issues/2

## Overview

Issue #2 requests an authentication system with login/logout and a personal account page. The profile area must show:

- Purchased orders with status progress: placed, packed, shipping, delivered.
- The user's collectible keychain/product-set collection, where buying an item and redeeming its code reveals the owned product while missing products remain hidden like a blind box.

The repository already has partial foundations:

- NextAuth credentials login at `/login`.
- Registration at `/register` and `POST /api/register`.
- NextAuth route at `/api/auth/[...nextauth]`.
- Shared `authOptions` in `utils/authOptions.ts`.
- Header logout behavior for admin dropdown.
- Checkout order creation through Express `/api/orders` and `/api/order-product`.
- `Customer_order.status`.
- Collector set/code pages from issue #1: `/account/collection`, `/account/codes`, `/api/merch/my-collection`, `/api/merch/my-codes`, and `/api/merch/redeem-code`.

This spec defines the remaining account experience and hardening work so logged-in users can reliably view their own profile, order history, and collection.

## Goals

- Provide a complete customer auth flow: register, login, logout, and protected account pages.
- Add a profile/account dashboard at `/account` or `/account/profile`.
- Show the authenticated user's basic profile information.
- Show the user's purchased orders with clear Vietnamese status labels:
  - `Đã đặt`
  - `Đã đóng gói`
  - `Đang giao`
  - `Đã giao`
- Show order line items and totals without exposing other users' orders.
- Link from profile to collection/code pages.
- Reuse the collector unlock flow from issue #1 for blind-box collection progress.
- Keep the visual style aligned with the dark `#070707` and orange `#e85d00` dinosaur shop theme.
- Use Vietnamese-first UI copy and preserve room for `vi/en/zh` i18n.

## Non-goals

- Do not rebuild NextAuth from scratch if existing credentials auth is sufficient.
- Do not implement payment processing.
- Do not replace the admin order management flow.
- Do not expose admin-only order edit actions in the customer profile.
- Do not duplicate the collection grid logic if `/account/collection` already owns it.
- Do not globally fix existing mojibake/encoding issues unless directly touching account copy.

## User Stories / UX Flow

1. As a visitor, I can register with email and password.
2. As a registered user, I can log in and remain authenticated while browsing protected account pages.
3. As a logged-in user, I can log out from the site header/account menu.
4. As a logged-in user, I can open my account page and see my email/profile summary.
5. As a logged-in user, I can see my purchased orders sorted newest first.
6. As a logged-in user, I can see each order's status as one of: placed, packed, shipping, delivered.
7. As a logged-in user, I can open an order detail view and see products, quantity, total, date, and status.
8. As a logged-in user, I can see links/cards for my collection and my redeem codes.
9. As a logged-in user, I can return later and still see unlocked collection items and locked missing items.
10. As a guest, if I open `/account`, `/account/orders`, `/account/collection`, or `/account/codes`, I am redirected to `/login` or receive a clear unauthorized state.

Suggested Vietnamese copy:

- Account title: `Tài khoản của tôi`
- Orders tab/card: `Đơn hàng đã mua`
- Collection tab/card: `Bộ sưu tập`
- Codes tab/card: `Mã mở khóa`
- Empty orders: `Bạn chưa có đơn hàng nào`
- View order: `Xem chi tiết`
- Logout: `Đăng xuất`
- Status labels:
  - `placed`: `Đã đặt`
  - `packed`: `Đã đóng gói`
  - `shipping`: `Đang giao`
  - `delivered`: `Đã giao`

## Technical Design

### Auth Flow

Keep NextAuth as the main auth system.

Existing behavior to preserve:

- Credentials provider authenticates against `User.email` and hashed `User.password`.
- Session includes `user.id`, `user.email`, and `user.role`.
- `/login` and `/register` redirect away when already authenticated.

Required improvements:

- Add customer-facing logout action in the non-admin header or account menu.
- Make account routes protected on the server/API side, not only through client redirects.
- Standardize login/register copy to Vietnamese-first, or route through existing i18n if the current page already uses it.
- Keep password validation at minimum 8 characters.
- Avoid leaking whether a specific email exists during login failures.

### Account Route Structure

Preferred structure:

- `/account` - profile dashboard summary.
- `/account/orders` - all customer orders.
- `/account/orders/[id]` - order detail.
- Existing `/account/collection` - collection grid.
- Existing `/account/codes` - product unlock codes and reward codes.

If scope needs to stay smaller, `/account` may include the order list directly and link to existing collection/code pages.

### Account Dashboard Content

The dashboard should show:

- User email.
- Optional role badge for admin/user.
- Order count.
- Collection progress summary from `/api/merch/my-collection`.
- Quick links:
  - `Đơn hàng đã mua`
  - `Bộ sưu tập`
  - `Mã mở khóa`

### Order Ownership

Current schema has `Customer_order.email` but no required relation to `User`. Checkout passes `userId` in request body, but the Prisma `Customer_order` model does not store it. For reliable ownership checks, add a nullable `userId` relation.

Recommended behavior:

- When a logged-in user checks out, save `Customer_order.userId`.
- For older orders without `userId`, optionally match by `Customer_order.email = session.user.email`.
- For new API reads, filter by `OR: [{ userId }, { email: session.user.email }]` during a transition period.
- Do not allow users to query arbitrary orders by ID without ownership validation.

### Order Status Mapping

Normalize customer-visible statuses to four stages:

```ts
type AccountOrderStatus = "placed" | "packed" | "shipping" | "delivered";
```

Map existing/backend statuses:

- `pending`, `confirmed`, `processing` -> `placed`
- `packed`, `packaged` -> `packed`
- `shipping`, `shipped`, `in_transit` -> `shipping`
- `delivered`, `completed` -> `delivered`
- `canceled` should display as a separate warning/canceled badge if it exists, not as delivered.

Admin order statuses may remain more detailed internally, but the profile UI should present clear customer-facing labels.

### Collection Integration

Reuse issue #1 implementation:

- `/api/merch/my-collection`
- `/api/merch/my-codes`
- `/api/merch/redeem-code`
- `/account/collection`
- `/account/codes`

The account dashboard should not duplicate the full collection grid unless desired. It should show a summary:

- Total sets.
- Total unlocked slots.
- Total slots.
- Completed sets count.
- CTA to `/account/collection`.

## API Changes

### New Endpoint: `GET /api/account/profile`

Returns account summary for the authenticated user.

Response:

```ts
type AccountProfileResponse = {
  user: {
    id: string;
    email: string;
    role: string;
  };
  stats: {
    orderCount: number;
    activeOrderCount: number;
    completedOrderCount: number;
    unlockedCollectionSlots: number;
    totalCollectionSlots: number;
    completedCollectionSets: number;
  };
};
```

Rules:

- Require session.
- Return `401` if unauthenticated.
- Do not expose password or sensitive fields.

### New Endpoint: `GET /api/account/orders`

Returns paginated orders for the authenticated user.

Query params:

- `page` default `1`.
- `limit` default `10`, max `50`.
- `status` optional normalized status filter.

Response:

```ts
type AccountOrdersResponse = {
  orders: Array<{
    id: string;
    dateTime: string | null;
    status: AccountOrderStatus | "canceled";
    rawStatus: string;
    total: number;
    itemCount: number;
    productsPreview: Array<{
      id: string;
      title: string;
      image: string | null;
      quantity: number;
    }>;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
```

Rules:

- Require session.
- Filter by `userId` and/or session email.
- Use bounded pagination.
- Do not return another user's orders.

### New Endpoint: `GET /api/account/orders/[id]`

Returns one order detail for the authenticated user.

Response:

```ts
type AccountOrderDetailResponse = {
  id: string;
  dateTime: string | null;
  status: AccountOrderStatus | "canceled";
  rawStatus: string;
  total: number;
  shipping: {
    name: string;
    lastname: string;
    phone: string;
    address: string;
    apartment: string;
    city: string;
    country: string;
    postalCode: string;
  };
  products: Array<{
    id: string;
    title: string;
    slug: string;
    image: string | null;
    price: number;
    quantity: number;
  }>;
};
```

Rules:

- Require session.
- Return `404` for not found or not owned.
- Do not expose internal admin-only notes unless intended.

### Existing Auth Endpoints

Keep:

- `POST /api/register`
- `/api/auth/[...nextauth]`

Potential improvements:

- Add rate limiting to register/login if not already handled globally.
- Ensure register lowercases email before saving.
- Ensure duplicate email returns a generic safe error.

## Schema / Prisma Changes

The current Prisma datasource is `mysql`, while the project brief mentions PostgreSQL. Confirm DB provider before generating migrations. The repo currently uses MySQL in `prisma/schema.prisma`.

Recommended schema update:

```prisma
model User {
  id                String              @id @default(uuid())
  email             String              @unique
  password          String?
  role              String?             @default("user")
  orders            Customer_order[]
  Wishlist          Wishlist[]
  notifications     Notification[]
  bulkUploadBatches bulk_upload_batch[] @relation("UserBatches")
}

model Customer_order {
  id          String                   @id @default(uuid())
  userId      String?
  user        User?                    @relation(fields: [userId], references: [id], onDelete: SetNull)
  name        String
  lastname    String
  phone       String
  email       String
  company     String
  adress      String
  apartment   String
  postalCode  String
  dateTime    DateTime?                @default(now())
  status      String
  city        String
  country     String
  orderNotice String?
  total       Int
  products    customer_order_product[]

  @@index([userId])
  @@index([email])
  @@index([userId, dateTime])
}
```

Migration/backfill notes:

- Add nullable `userId` first.
- Backfill where possible by matching `Customer_order.email` to `User.email`.
- Keep email fallback in account APIs for old records.
- Do not make `userId` required unless all legacy guest orders are handled.

## Frontend Changes

### Header

- Add customer account menu/state in the non-admin header:
  - If unauthenticated: show `Đăng nhập`.
  - If authenticated: show account/profile link and `Đăng xuất`.
- Keep icon buttons compact and mobile-friendly.
- Mobile drawer should include login/account/logout options.

### Login Page

- Keep existing credentials form.
- Use Vietnamese-first copy or next-intl keys:
  - `Đăng nhập`
  - `Email`
  - `Mật khẩu`
  - `Đăng nhập thành công`
  - `Email hoặc mật khẩu không đúng`
- Redirect authenticated users to `/account` or previous `callbackUrl`, not always `/`.
- Consider removing non-configured social buttons if Google/GitHub providers are not fully configured.

### Register Page

- Keep email/password registration.
- Fix fragile field indexing in submit handler by reading named fields instead of `e.target[2]`, `e.target[3]`, etc.
- Use Vietnamese-first copy.
- After successful registration, redirect to login or auto-login based on product decision.

### Account Dashboard

Build `/account/page.tsx` as the first customer profile surface.

Suggested layout:

- Full dark background.
- Header: `Tài khoản của tôi`.
- Profile summary band with email and logout action.
- Compact cards for:
  - Orders count/status.
  - Collection progress.
  - Codes waiting to redeem.
- Tabs or links to:
  - `/account/orders`
  - `/account/collection`
  - `/account/codes`

Avoid marketing hero layout; this is an operational account screen.

### Orders Page

Build `/account/orders/page.tsx`.

Display:

- Status filter tabs: all, placed, packed, shipping, delivered.
- Order cards/table with order ID, date, status badge, total, item count, preview images.
- Empty state with CTA to `/shop`.
- Loading/error states.

### Order Detail Page

Build `/account/orders/[id]/page.tsx`.

Display:

- Status timeline with four stages.
- Product list.
- Shipping/contact summary.
- Total.
- Link back to account orders.

### Collection Links

Existing `/account/collection` and `/account/codes` should be linked from account dashboard and header account menu.

## Backend Changes

- Add Next.js App Router APIs under `app/api/account/...`.
- Add shared helper for account order ownership, for example:
  - `lib/accountOrders.ts`
  - `normalizeAccountOrderStatus(status: string)`
  - `getAccountOrderWhere(sessionUser)`
- Update checkout/order creation path to persist `userId` on `Customer_order` when a logged-in user checks out.
- Keep Express admin routes as-is, but update controller/schema if using root Prisma client and `Customer_order.userId` is added.
- Keep collection APIs protected with session auth.

## Implementation Steps

1. Confirm DB provider and add nullable `Customer_order.userId` relation/indexes in Prisma schema.
2. Generate migration and backfill existing orders by email where safe.
3. Update order creation to store `userId` for logged-in checkout.
4. Add account order status normalization helper.
5. Add `GET /api/account/profile`.
6. Add `GET /api/account/orders`.
7. Add `GET /api/account/orders/[id]`.
8. Build `/account` dashboard.
9. Build `/account/orders` list page.
10. Build `/account/orders/[id]` detail page.
11. Update header desktop/mobile auth menu for login/account/logout.
12. Update login/register copy and redirect behavior.
13. Link account dashboard to existing collection/code pages.
14. Add tests for auth guards, ownership checks, status mapping, and UI states.

## Test Cases

### Auth

- Guest can open `/login` and submit credentials.
- Invalid credentials show generic error.
- Authenticated user is redirected away from `/login`.
- Register validates email, password length, and confirm password.
- Logout clears session and moves user to a public page.
- Protected account pages redirect guest or show unauthorized state.

### Account APIs

- `GET /api/account/profile` returns 401 for guest.
- It returns only the session user's profile summary.
- `GET /api/account/orders` returns 401 for guest.
- It returns only orders owned by `userId` or matching session email.
- It paginates results and caps `limit`.
- It maps statuses correctly.
- `GET /api/account/orders/[id]` returns 404 for another user's order.
- It returns order line items for the owner.

### Orders UI

- Account dashboard shows email, order count, collection progress, and links.
- Orders page shows placed/packed/shipping/delivered statuses.
- Canceled orders display clearly and do not appear as delivered.
- Empty orders state appears for a new user.
- Long order IDs and Vietnamese labels do not overflow on mobile.

### Collection Integration

- Account dashboard collection summary matches `/api/merch/my-collection`.
- Existing unlocked/locked collection state persists after logout/login.
- Account links navigate to `/account/collection` and `/account/codes`.

### Security

- Users cannot fetch another user's profile or order detail.
- Email fallback for legacy orders does not expose orders after email changes unless product accepts that behavior.
- API responses never include `User.password`.
- Register/login endpoints are suitable for rate limiting.

## Risks / Open Questions

- The issue says "đã đóng gói" but current backend statuses are free-form strings. Confirm exact admin statuses to map.
- Current schema does not store `Customer_order.userId`; profile order ownership is weaker until that relation is added.
- Existing checkout form sends `userId` but Express order creation currently does not persist it.
- Existing login/register copy is mostly English; decide whether to localize immediately or route through next-intl in a separate i18n pass.
- Social login buttons exist in UI, but authOptions currently configures only credentials. Confirm whether to remove, hide, or configure Google/GitHub.
- Session maxAge is currently 15 minutes. Confirm whether customer sessions should be longer for e-commerce convenience.
- Issue #1 collection flow overlaps with this issue; avoid duplicate implementation and reuse the existing collection APIs/pages.
