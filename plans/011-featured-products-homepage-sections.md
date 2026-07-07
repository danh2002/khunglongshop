# Plan 011: Add CMS-managed featured products and reorder homepage sections

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
>
> ```bash
> git diff --stat 594d37c..HEAD -- prisma/schema.prisma "app/(public)/page.tsx" components/NewArrivals.tsx components/FeaturedSeries.tsx components/ProductsSection.tsx components/FeaturedProductsGrid.tsx components/ProductItem.tsx lib/homepage-products.ts lib/publicCatalog.ts components/DashboardSidebar.tsx app/api/admin app/api/public "app/(dashboard)/admin" tests/unit
> ```
>
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `594d37c`, 2026-07-07
- **Issue**: https://github.com/danh2002/khunglongshop/issues/9

## Why This Matters

The homepage currently reuses the same blind-box product list for all three product-like sections. Issue #9 changes the content model: admins must explicitly choose collector keychain products for the top homepage feature sections, and blind-box products should move to a clearly named "Blind Box" section. This needs a database-backed CMS flow, public data access for ISR homepage rendering, and homepage component restructuring without hardcoded Vanie-specific content.

## Current State

Relevant files and roles:

- `prisma/schema.prisma` — Prisma MySQL schema. `Product` exists at `prisma/schema.prisma:79`; `HomepageSliderSlide` exists at `prisma/schema.prisma:415` and is the nearest homepage CMS model pattern.
- `app/(public)/page.tsx` — homepage server page. It currently calls `getHomepageProducts()` once and renders `NewArrivals`, `FeaturedSeries`, then `ProductsSection` at lines 34-36.
- `lib/homepage-products.ts` — homepage product query helper. It currently queries `PUBLIC_STOREFRONT_PRODUCT_WHERE`, which is blind-box only, at lines 77-78.
- `lib/publicCatalog.ts` — public visibility policies. `PUBLIC_STOREFRONT_PRODUCT_WHERE` is visible blind boxes; `PUBLIC_COLLECTOR_PRODUCT_WHERE` is visible collector products with set/slot.
- `components/NewArrivals.tsx` — first product section. It renders `<Title>Mới & Hot</Title>` at line 79 and uses `ProductItem`.
- `components/FeaturedSeries.tsx` — Vanie-specific section. It renders `<Title>Vanie Series</Title>` at line 166 and uses ten slots with hardcoded Vanie alt/copy.
- `components/ProductsSection.tsx` — current "Sản phẩm nổi bật" section. It renders `<Title>Sản phẩm nổi bật</Title>` at line 84 and currently shows blind-box products via `FeaturedProductsGrid`.
- `components/ProductItem.tsx` — reusable public product card. It already supports `viewOnly`, which hides add-to-cart, price, and stock.
- `app/api/admin/products/route.ts` — admin product list API. It already supports `collectorOnly=true` and pagination through `parseAdminPagination`.
- `components/DashboardSidebar.tsx` — admin sidebar nav list. Add a `/admin/featured-products` item here.
- `tests/unit/homepageProducts.test.ts` and `tests/unit/homepageSliderApi.test.ts` — existing unit/source tests for homepage helpers and admin API wiring.

Current homepage shape:

```tsx
// app/(public)/page.tsx
<NewArrivals products={products} />
<FeaturedSeries product={products[0]} images={variantImages} />
<ProductsSection initialProducts={products} initialError={hasError} />
```

Current product policy:

```ts
// lib/publicCatalog.ts
export const PUBLIC_STOREFRONT_PRODUCT_WHERE = {
  isVisible: true,
  isBlindBox: true,
  isCollector: false,
} satisfies Prisma.ProductWhereInput;

export const PUBLIC_COLLECTOR_PRODUCT_WHERE = {
  isVisible: true,
  isCollector: true,
  setId: { not: null },
  setSlotNumber: { not: null },
} satisfies Prisma.ProductWhereInput;
```

Current admin list filter support:

```ts
// app/api/admin/products/route.ts
const collectorOnly = searchParams.get("collectorOnly") === "true";
...
...(collectorOnly
  ? { isCollector: true, setId: { not: null }, setSlotNumber: { not: null } }
  : {}),
```

Repository conventions to follow:

- Next.js App Router route handlers return `NextResponse.json(...)`.
- Admin APIs must call `requireAdminApi()` and return early if `response` exists.
- Admin mutations that affect homepage rendering should call `revalidatePath("/")`; see `app/api/admin/homepage-slider/route.ts`.
- Public/homepage reads should fail gracefully and not break the homepage ISR render; see `getHomepageProducts()` catch block.
- Admin UI uses dark Tailwind utility classes and helpers from `components/admin/AdminUi.tsx`.
- User-facing UI strings are Vietnamese. Do not introduce English visible UI copy.
- Do not broaden this feature into mojibake cleanup. Some existing files may contain corrupted Vietnamese text in terminal output; only write correct UTF-8 strings in newly touched lines.

## Commands You Will Need

| Purpose | Command | Expected on success |
|---|---|---|
| Prisma generate | `npm run db:generate` | exit 0 |
| Typecheck | `npm run type-check` | exit 0, no TypeScript errors |
| Unit tests | `npx vitest run --exclude "tests/otp/**"` | all non-OTP tests pass |
| Build | `npm run build` | exit 0 in an environment with valid production-like env vars and database connectivity |

## Scope

**In scope**:

- `prisma/schema.prisma`
- new Prisma migration under `prisma/migrations/<timestamp>_add_featured_products/migration.sql`
- `lib/homepage-products.ts`
- `lib/publicCatalog.ts` only if adding a helper for featured collector policy is useful
- `app/api/admin/featured-products/route.ts` (create)
- `app/api/admin/featured-products/[productId]/route.ts` (create)
- `app/api/admin/featured-products/reorder/route.ts` (create)
- `app/api/public/featured-products/route.ts` (create)
- `app/(dashboard)/admin/featured-products/page.tsx` (create)
- optional new admin client component under `components/admin/` for featured product management
- `components/DashboardSidebar.tsx`
- `app/(public)/page.tsx`
- `components/NewArrivals.tsx`
- `components/FeaturedSeries.tsx`
- `components/ProductsSection.tsx`
- `components/FeaturedProductsGrid.tsx`
- `components/ProductItem.tsx`
- tests under `tests/unit/`

**Out of scope**:

- Checkout, order, redemption-code, OTP, notification, wishlist, and account routes.
- Product CRUD behavior except reading collector products for the featured picker.
- Upload/storage behavior.
- Public `/bo-suu-tap` filtering behavior.
- Full drag-and-drop library installation. Use up/down buttons unless an existing drag utility is already present.
- Global mojibake cleanup.

## Git Workflow

- Branch suggestion: `advisor/011-featured-products-homepage`
- Commit per logical unit if desired:
  - `Add featured product model and APIs`
  - `Add featured products admin page`
  - `Use featured products on homepage`
- Do not push or open a PR unless the operator instructs you.

## Steps

### Step 1: Add the FeaturedProduct schema and migration

Update `prisma/schema.prisma`:

1. Add a back relation on `Product`:

```prisma
featuredProduct FeaturedProduct?
```

2. Add this model near other homepage/admin CMS models:

```prisma
model FeaturedProduct {
  id        String   @id @default(cuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())

  @@unique([productId])
  @@index([sortOrder])
}
```

3. Create a SQL migration under `prisma/migrations/<timestamp>_add_featured_products/migration.sql`. Match the MySQL column types Prisma uses for `String @default(cuid())` and existing product IDs. The migration must create:
   - `FeaturedProduct.id` primary key
   - `productId` unique index
   - `sortOrder` index
   - foreign key to `Product(id)` with `ON DELETE CASCADE`

**Verify**:

```bash
npm run db:generate
```

Expected: Prisma Client generated successfully.

Apply migration:

```bash
npx prisma db execute --file prisma/migrations/_add_featured_products/migration.sql --schema prisma/schema.prisma
```

Expected: "Script executed successfully."

**STOP condition**: If Prisma requires a different back relation name because of an existing relation conflict, stop and report the exact Prisma error instead of inventing a schema shape.

### Step 2: Add shared featured-product mapping helpers

In `lib/homepage-products.ts`, add a typed public shape for featured collector products. Reuse the existing `HomepageProduct` type if it still fits, but ensure the public/admin featured selectors only fetch fields used by homepage/admin:

- `id`
- `slug`
- `title`
- `mainImage`
- `price` only if using `ProductItem`
- `inStock` only if using `ProductItem`
- `isCollector`
- `setId`
- `setSlotNumber`

Add helper functions similar to:

```ts
export function getRandomKeychainSlots(featuredProducts: HomepageProduct[], slotCount = 10) {
  return Array.from({ length: slotCount }, (_, index) => featuredProducts[index] ?? null);
}
```

Add or update tests in `tests/unit/homepageProducts.test.ts`:

- Featured helper preserves DB order.
- Random keychain slots fill missing entries with `null`/locked slots until 10.
- No legacy fallback products are injected.

**Verify**:

```bash
npx vitest run tests/unit/homepageProducts.test.ts
```

Expected: homepage product tests pass.

### Step 3: Add public featured products API

Create `app/api/public/featured-products/route.ts`.

Behavior:

- No auth.
- Query `prisma.featuredProduct.findMany`.
- Order by `[{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }]`.
- Include/select `product`.
- Only return products that match collector homepage rules:
  - `product.isVisible === true`
  - `product.isCollector === true`
  - `product.isBlindBox === false`
  - `product.setId !== null`
  - `product.setSlotNumber !== null`
- Limit to enough for homepage, normally `take: 10` or `take: 12`.
- Return:

```ts
NextResponse.json({ items: [...] })
```

The endpoint should not throw homepage-breaking errors for normal empty state; empty DB returns `{ items: [] }`.

**Verify**:

```bash
npm run type-check
```

Expected: typecheck exits 0.

### Step 4: Add admin featured products APIs

Create:

- `app/api/admin/featured-products/route.ts`
- `app/api/admin/featured-products/[productId]/route.ts`
- `app/api/admin/featured-products/reorder/route.ts`

Requirements:

- Every admin endpoint must call `requireAdminApi()`.
- Every mutation must call `revalidatePath("/")`.
- `GET /api/admin/featured-products` returns selected featured rows with product details, ordered by `sortOrder`, then `id`.
- `POST /api/admin/featured-products` accepts `{ productId }`.
  - Validate `productId` is a non-empty string.
  - Verify product exists and is a visible collector keychain, not a blind box:

```ts
{
  id: productId,
  isVisible: true,
  isCollector: true,
  isBlindBox: false,
  setId: { not: null },
  setSlotNumber: { not: null },
}
```

  - Compute next `sortOrder` as max existing sort order + 1 (or count).
  - If already featured, return 409 with a structured error.
- `DELETE /api/admin/featured-products/[productId]` removes by product ID, not featured row ID.
  - Return 404 if missing.
  - Recompact sort order after deletion if straightforward; otherwise leave gaps because ordering still works.
- `PATCH /api/admin/featured-products/reorder` accepts `{ productIds: string[] }`.
  - Validate all entries are strings and unique.
  - Ensure the set exactly matches currently featured product IDs; if missing/extra, return 400.
  - Use `prisma.$transaction` to update sort orders atomically.

Use `NextResponse.json({ error: { code, message } }, { status })` shape consistent with existing admin APIs.

Add tests in a new `tests/unit/featuredProductsApi.test.ts` using the source-inspection style from `tests/unit/homepageSliderApi.test.ts`:

- Admin routes contain `requireAdminApi`.
- Mutating routes contain `revalidatePath("/")`.
- Reorder route contains `prisma.$transaction`.
- Public route does not contain `requireAdminApi`.
- Sidebar contains `href: "/admin/featured-products"`.

**Verify**:

```bash
npx vitest run tests/unit/featuredProductsApi.test.ts
```

Expected: the new test file passes.

### Step 5: Add admin CMS page

Create `app/(dashboard)/admin/featured-products/page.tsx`.

Recommended implementation:

- Use a client page or a server page plus client island. A client page is acceptable for this plan because it mirrors `app/(dashboard)/admin/products/page.tsx`.
- Load current featured rows from `/api/admin/featured-products`.
- Load candidate products from `/api/admin/products?collectorOnly=true&limit=100` and filter out already featured products client-side.
- UI requirements:
  - Title: `Sản phẩm nổi bật`
  - Description mentions these are collector keychains shown on the homepage.
  - Current featured list/table: image, product name, collection/slot if available, sort order.
  - Add product control: search/select collector product, button `Thêm sản phẩm`.
  - Delete button per row.
  - Reorder controls: up/down buttons are enough; drag-and-drop is optional and out of scope.
- Use existing admin dark styles and helpers from `components/admin/AdminUi.tsx` where practical.
- Add nav item to `components/DashboardSidebar.tsx`:

```ts
{ href: "/admin/featured-products", label: "Sản phẩm nổi bật", icon: "trophy" }
```

If a better existing icon key fits, use it; do not add a heavy icon dependency.

**Verify**:

```bash
npm run type-check
```

Expected: typecheck exits 0.

**STOP condition**: If `/api/admin/products?collectorOnly=true` does not return enough product fields for the picker, extend only `app/api/admin/products/route.ts` within existing response shape. Do not add a second broad product search API.

### Step 6: Restructure homepage data loading

Update `lib/homepage-products.ts` so homepage can load two independent datasets:

- Featured collector products from `FeaturedProduct` rows.
- Blind-box products from the existing `PUBLIC_STOREFRONT_PRODUCT_WHERE`.

Recommended API:

```ts
export async function getHomepageProducts(): Promise<{
  featuredProducts: HomepageProduct[];
  blindBoxProducts: HomepageProduct[];
  randomKeychainSlots: Array<HomepageProduct | null>;
  hasError: boolean;
}>
```

Maintain backward compatibility only if many call sites still expect `products`; otherwise update all call sites in this plan.

Rules:

- Featured collector query should order by `FeaturedProduct.sortOrder`.
- Blind-box query should keep current public storefront policy.
- If featured query fails, homepage should render without sections 1 and 2 and keep blind box if possible.
- If blind-box query fails, homepage should still render featured sections if possible.
- Avoid fetching unnecessary nested `blindBoxSet.poolVersions.entries` for featured collector products.

Update tests in `tests/unit/homepageProducts.test.ts` for:

- Keychain slot helper.
- Featured selection does not include blind boxes.
- Empty featured products results in empty slots / hidden section behavior at component level if tested by source inspection.

**Verify**:

```bash
npx vitest run tests/unit/homepageProducts.test.ts
```

Expected: tests pass.

### Step 7: Update homepage sections

Update `app/(public)/page.tsx` render order to:

1. `NewArrivals` as section 1, now showing featured collector products and title `Sản phẩm nổi bật`.
2. `FeaturedSeries` as section 2, now "Túi mù random các nhân vật" / `TÚI MÙ RANDOM`, using featured collector products/slots.
3. `ProductsSection` as section 3, showing blind-box products with heading `Blind Box`.

Detailed component changes:

- `components/NewArrivals.tsx`
  - Rename visible heading from `Mới & Hot` to `Sản phẩm nổi bật`.
  - Render at most 6 products.
  - Use `ProductItem viewOnly` or a small view-only card so price/stock/add-to-cart are hidden.
  - If `products.length === 0`, return `null`.
- `components/FeaturedSeries.tsx`
  - Remove Vanie-specific copy and props.
  - Accept `products` or `slots`.
  - Render exactly 10 slots: filled slots show featured keychain images; empty slots show `?`.
  - Title should be `TÚI MÙ RANDOM` or `Túi mù random các nhân vật`.
  - Do not hardcode Vanie/Ricon/Heni.
  - If there are no featured products, return `null`.
- `components/ProductsSection.tsx`
  - Use blind-box products from homepage data.
  - Change heading from `Sản phẩm nổi bật` to `Blind Box`.
  - Keep existing empty/error state for blind boxes.

**Verify**:

```bash
npm run type-check
npx vitest run --exclude "tests/otp/**"
```

Expected: typecheck exits 0 and all non-OTP tests pass.

### Step 8: Full verification and manual smoke

Run:

```bash
npm run db:generate
npm run type-check
npx vitest run --exclude "tests/otp/**"
npm run build
```

Expected:

- Prisma client generated.
- Typecheck exits 0.
- Non-OTP Vitest suite passes.
- Build exits 0 in an environment with valid `DATABASE_URL`, `NEXTAUTH_URL`, and other required production env vars.

Manual smoke checklist:

- `/admin/featured-products` loads for admin.
- Add a visible collector keychain product.
- Product appears in `/api/admin/featured-products`.
- Product appears in `/api/public/featured-products`.
- Homepage section 1 displays the keychain image/name and no price.
- Homepage section 2 displays the same keychain image in a random slot grid and `?` for empty slots.
- Delete the featured product; homepage hides section 1 and 2 when no featured products remain.
- Add multiple featured products and reorder with up/down buttons; homepage order follows `sortOrder`.
- Homepage blind-box section heading reads `Blind Box`.

## Test Plan

Add/update unit tests:

- `tests/unit/homepageProducts.test.ts`
  - Featured slot helper creates 10 slots.
  - Featured products preserve DB/CMS order.
  - No fallback products are injected when DB returns none.
- `tests/unit/publicCatalog.test.ts`
  - If you add a featured collector where helper, assert it requires visible collector products with set/slot and excludes blind boxes.
- `tests/unit/featuredProductsApi.test.ts` (new)
  - Admin featured product routes require admin auth.
  - Mutations revalidate `/`.
  - Reorder uses transaction.
  - Public endpoint does not require admin auth.
  - Sidebar exposes `/admin/featured-products`.

Do not add tests that require live OTP or email.

## Done Criteria

All must hold:

- [ ] `FeaturedProduct` model and migration exist.
- [ ] `Product` has a back relation to `FeaturedProduct`.
- [ ] `GET /api/admin/featured-products` works and requires admin auth.
- [ ] `POST /api/admin/featured-products` adds only visible collector keychains.
- [ ] `DELETE /api/admin/featured-products/[productId]` removes by product ID.
- [ ] `PATCH /api/admin/featured-products/reorder` updates sort order atomically.
- [ ] `GET /api/public/featured-products` works without auth and returns only public-safe fields.
- [ ] `/admin/featured-products` page supports add, delete, and reorder.
- [ ] Admin sidebar links to `/admin/featured-products`.
- [ ] Homepage section 1 title is `Sản phẩm nổi bật`, uses featured collector products, shows image/name only, and hides when empty.
- [ ] Homepage section 2 no longer says Vanie Series, uses featured products, shows `?` empty slots, and hides when empty.
- [ ] Homepage section 3 heading is `Blind Box` and keeps existing blind-box listing logic.
- [ ] `npm run db:generate` passes.
- [ ] `npm run type-check` passes.
- [ ] `npx vitest run --exclude "tests/otp/**"` passes.
- [ ] `npm run build` passes in a valid production-like env.
- [ ] No out-of-scope files are modified.

## STOP Conditions

Stop and report back if:

- The current homepage no longer renders `NewArrivals`, `FeaturedSeries`, and `ProductsSection` in `app/(public)/page.tsx`; the section strategy must be reconsidered.
- `FeaturedProduct` cannot be added without a Prisma relation conflict.
- Product IDs in the live schema are not compatible with the migration column type you planned.
- The admin featured picker requires changing unrelated product CRUD behavior.
- The implementation would require installing a drag-and-drop package.
- Build fails with an error caused by the new featured product code after two fix attempts.
- You discover the issue requires featuring blind-box products in section 1; this contradicts the current requirement.

## Maintenance Notes

- Future homepage merchandising can build on `FeaturedProduct.sortOrder`; avoid adding more homepage-specific booleans to `Product` unless a section truly needs independent targeting.
- Reviewers should check that featured collector products are not confused with sellable blind-box SKUs. Section 1 and section 2 are display/merchandising for collector keychains; section 3 remains the sellable blind-box product section.
- If a future CMS wants multiple featured areas, replace `FeaturedProduct` with a section/key model rather than adding another one-off table.
