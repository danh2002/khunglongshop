# Issue #1: Single Vanie Blind-Box Storefront

Sources:

- Issue: https://github.com/danh2002/khunglongshop/issues/1
- Comment: https://github.com/danh2002/khunglongshop/issues/1#issuecomment-4670517177
- Related spec: `specs/issue-1-blind-box-weighted-rarity.md`
- Related spec: `specs/issue-1-product-code-unlock-collection.md`

## Overview

The public storefront must sell exactly one product: `Túi mù Vanie`.

The existing `Vanie 1` through `Vanie 10` records remain in the database because they are required as blind-box pool entries, allocation results, warehouse packing targets, redemption-code products, and collection slots. They are no longer independently purchasable or discoverable as storefront products.

The `Túi mù Vanie` product page shows the image and rarity tier of all 10 possible Vanie variants. Exact draw weights and percentages remain admin-only, as defined by the weighted-rarity spec.

This specification changes catalog visibility and presentation. It does not replace the existing atomic checkout, weighted draw, allocation, redemption, or collection behavior.

## Confirmed Requirements

- Hide all currently listed individual products from the public website.
- Sell only one public product named `Túi mù Vanie`.
- Show all 10 Vanie variants inside the blind-box product presentation.
- Show an image and rarity tier for each variant.
- Preserve the 10 Vanie records for blind-box and collection operations.

## Goals

- Make every public catalog surface expose only the Vanie blind-box SKU.
- Prevent direct purchase of `Vanie 1` through `Vanie 10`.
- Present the possible contents clearly without exposing numeric odds.
- Keep admin, fulfillment, allocation, redemption, and collection workflows functional.
- Remove stale hidden variants from customer carts and wishlists.
- Centralize storefront visibility rules so homepage, shop, search, product detail, and APIs cannot drift.

## Non-goals

- No change to weighted draw probabilities.
- No change to pool-version lifecycle.
- No deletion of Vanie variant products.
- No variant-level stock ledger.
- No redesign of checkout, order confirmation, redemption, or collection pages.
- No public display of exact weights or percentages.
- No support for selling other products in this release.
- No change to previously stored order snapshots or allocations.

## User Stories / UX Flow

1. A visitor opens the homepage and sees only `Túi mù Vanie`.
2. The shop and search pages return only `Túi mù Vanie`.
3. The product card uses a `TÚI MÙ` badge and links to `/product/vanie-blind-box`.
4. The product page shows the blind-box image, price, stock, description, and purchase actions.
5. Below the product information, the customer sees 10 possible Vanie variants.
6. Each variant shows its image, name, slot number, and localized rarity label.
7. The customer never sees exact draw weights or percentages.
8. Opening `/product/vanie-1` through `/product/vanie-10` does not expose a purchasable product page.
9. A stale cart keeps an individual Vanie variant visible with a blocking inline warning until the customer removes it; a stale wishlist row is deleted transactionally on read.
10. Admin and warehouse users can still view individual variants where required for pool management and fulfillment.

Suggested Vietnamese copy:

- Product badge: `TÚI MÙ`
- Variant section: `10 MẪU VANIE CÓ THỂ NHẬN`
- Description: `Mỗi túi chứa ngẫu nhiên 1 trong 10 mẫu Vanie. Vanie 10 là mẫu hiếm nhất.`
- Rarity label: `Độ hiếm`
- Hidden variant message: `Mẫu Vanie này không bán riêng. Hãy khám phá Túi mù Vanie.`
- Stale cart message: `Sản phẩm này không còn được bán riêng. Vui lòng xóa khỏi giỏ hàng để tiếp tục thanh toán.`

Localized rarity labels:

| Enum | Vietnamese |
| --- | --- |
| `COMMON` | `Phổ biến` |
| `RARE` | `Hiếm` |
| `EPIC` | `Sử thi` |
| `LEGENDARY` | `Huyền thoại` |

## Technical Design

### Catalog Roles

Products have two distinct roles:

- **Sellable SKU**: `isBlindBox = true`, `slug = "vanie-blind-box"`, linked to the Vanie collector set through `blindBoxSetId`.
- **Internal collector variant**: `isCollector = true`, assigned to `setId` and `setSlotNumber`, used as a pool result but never sold directly.

For version 1, the public catalog policy is intentionally strict:

```ts
const PUBLIC_STOREFRONT_PRODUCT_WHERE = {
  isVisible: true,
  isBlindBox: true,
  slug: "vanie-blind-box",
} satisfies Prisma.ProductWhereInput;
```

All public product reads must use one shared helper or constant implementing this policy. Do not duplicate ad hoc `isCollector: false` filters because that would expose unrelated legacy products.

Admin queries, pool queries, allocation queries, redemption queries, collection queries, and warehouse order queries must not use this public filter.

### Storefront Visibility Rules

The public policy applies to:

- Homepage product query.
- Homepage hero product data.
- Shop collection query and pagination count.
- Search results.
- Public product-list API.
- Product slug lookup.
- Related/recommended products.
- Public sitemap or metadata generation if present.
- Cart product revalidation.
- Wishlist product revalidation.

The policy does not apply to:

- `/admin/**`.
- Blind-box pool editor APIs.
- Order allocation reads.
- Warehouse packing lists.
- User collection and code pages.
- Public blind-box rarity endpoint, which may expose variant presentation data only.

### Direct Variant URLs

Public requests for an internal collector variant, including `/product/vanie-1`, must not render purchase controls.

Locked behavior:

- `/product/vanie-1` through `/product/vanie-10` always return an HTTP `308` permanent redirect.
- The `Location` header is always `/product/vanie-blind-box`.
- These routes never return a purchasable variant page and never use `404` for a known Vanie variant.
- Unknown non-Vanie slugs continue to use the existing `404` behavior.
- Hidden variant URLs are excluded from `sitemap.xml`.
- `robots.txt` disallows `/product/vanie-1` through `/product/vanie-10`.

### Checkout Enforcement

Catalog filtering alone is insufficient. `POST /api/orders` must reject any item that is not allowed by the public storefront policy.

Rules:

- Only `vanie-blind-box` may be submitted as a new checkout item.
- Individual collector variants return `422 PRODUCT_NOT_SELLABLE`.
- The server continues to read authoritative price and stock from Prisma.
- Existing historical orders containing other products remain readable.
- Admin/internal fulfillment operations are not affected.

This prevents a customer from purchasing a hidden variant by manually submitting its product ID.

### Variant Presentation

The public rarity endpoint remains the source for possible blind-box contents:

```text
GET /api/merch/blind-boxes/vanie-blind-box/rarities
```

Extend each variant with its public image:

```ts
type BlindBoxVariantPresentation = {
  slotNumber: number;
  productName: string;
  image: string;
  rarityTier: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
};
```

The endpoint must continue to omit:

- `drawWeight`.
- Percentages.
- Pool-entry IDs.
- Pool-version IDs.
- Allocation or customer data.

The product page may query Prisma directly as a server component or consume this endpoint. Prefer one canonical mapper so endpoint and page return the same ordering and fields.

### Cart And Wishlist Revalidation

Persisted browser state may contain hidden products from earlier versions.

On cart/wishlist hydration and before checkout:

1. The cart calls `POST /api/catalog/validate-items` on page hydration.
2. The cart calls the same endpoint again immediately before checkout submission.
3. Hidden or missing items remain visible in the cart with an inline warning and cannot be checked out.
4. Do not auto-remove hidden or missing cart items.
5. Do not silently transform a specific Vanie variant into a blind box because that changes purchase intent.
6. If validation cannot be completed, show `Không thể xác minh giỏ hàng, vui lòng thử lại` and disable checkout until a validation request succeeds.
7. A changed price is displayed using the authoritative `currentPrice`; the customer must submit checkout again with the validated state.

Wishlist behavior is different from cart behavior:

- Wishlist reads delete stale hidden rows transactionally before returning data.
- Wishlist mutation rejects non-sellable product IDs with `422 PRODUCT_NOT_AVAILABLE`.
- Wishlist identity is always derived from the authenticated session.

## API Changes

### `GET /api/products`

Public storefront behavior:

- Return only `Túi mù Vanie`.
- Ignore filters that would widen the result beyond the public policy.
- Pagination count must be based on the same visibility predicate.
- The `mode` query parameter is not supported.
- `GET /api/products?mode=admin` returns `400` or `404` and never returns hidden products.
- Public query parameters cannot expose hidden, internal, draft, or collector-variant products.

Exact response contract:

```ts
type PublicProductListResponse = {
  products: Array<{
    id: string;
    slug: string;
    title: string;
    price: number; // VND integer
    mainImage: string; // path under /public/images/
    inStock: boolean;
    categoryId: string;
    setId: string | null;
    rarityTier: string | null;
  }>;
  page: number; // 1-indexed
  total: number;
  totalPages: number; // Math.ceil(total / pageSize)
  pageSize: number; // default 12
};
```

`inStock` is a public availability boolean derived from the database integer using `Product.inStock > 0`. `rarityTier` is `null` for the sellable blind-box SKU because rarity belongs to pool variants, not the SKU.

Admin product listing uses a separate endpoint:

```text
GET /api/admin/products
```

- Requires a valid NextAuth session with `role = "admin"`.
- Returns `401` without a session and `403` for a non-admin session.
- May return internal variants and other admin-only product fields.
- The public `GET /api/products` endpoint never delegates to this endpoint.

### `GET /api/search?query=...`

- Search only publicly sellable products.
- Queries matching `Vanie 1` through `Vanie 10` may return `Túi mù Vanie` as the single relevant result.
- Never return an individual variant product.

### `GET /api/slugs/:slug`

- Return `Túi mù Vanie` normally.
- For internal collector variants, return a typed response that allows the Next.js page to redirect, or return `404`.
- Do not expose hidden variant purchase data.

### `GET /api/merch/blind-boxes/[slug]/rarities`

Success response:

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
    image: string;
    rarityTier: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  }>;
  publishedAt: string;
};
```

Errors:

- `404 BLIND_BOX_NOT_FOUND`
- `503 ACTIVE_POOL_INVALID`

Before returning public rarity data, the endpoint runs the same pool validation used by checkout:

- The active pool contains exactly 10 entries.
- Slots represent exactly Vanie 1 through Vanie 10 with no duplicate product or slot.
- Every entry has a valid `productId` relation to an enabled collector variant in the Vanie set.
- Every `drawWeight` is an integer from `1` through `1_000_000`.
- Total pool weight does not exceed `10_000_000`.

If any rule fails:

```http
503
{ "error": "ACTIVE_POOL_INVALID" }
```

The server logs the pool-version ID and validation errors to the server error log. It must not log weights to a public response, redemption codes, or customer data.

### `POST /api/orders`

Add error:

```http
422
{ "error": "PRODUCT_NOT_SELLABLE" }
```

The endpoint rejects all new checkout items except the configured public blind-box SKU.

### Wishlist APIs

All wishlist endpoints require a valid NextAuth JWT session.

Locked authorization rules:

- `userId` is never accepted from URL parameters, query parameters, headers, or request bodies.
- The current user ID is derived only from the server-side session.
- Unauthenticated requests return `401 UNAUTHORIZED`.
- If a legacy route or compatibility request attempts to identify another user, return `403 FORBIDDEN`.
- Wishlist reads and mutations operate only on the authenticated user's rows.

Recommended contracts:

```text
GET    /api/wishlist
POST   /api/wishlist
DELETE /api/wishlist/[productId]
```

Creating a wishlist entry for a hidden, deleted, or internal variant returns:

```http
422
{ "error": "PRODUCT_NOT_AVAILABLE" }
```

Wishlist reads perform this mandatory Prisma transaction:

1. Delete rows belonging to the authenticated user where the related product has `isVisible = false`.
2. Delete orphaned rows if legacy data exists without a product relation. Normal foreign-key cascade remains the primary protection for deleted products.
3. Return the authenticated user's remaining wishlist rows.

The cleanup and read occur in one transaction so stale rows cannot reappear in the same response.

### `POST /api/catalog/validate-items`

Authentication is optional for cart hydration, but checkout still requires authentication. Apply normal public rate limiting and Zod validation.

Request:

```ts
type ValidateCartItemsRequest = {
  items: Array<{
    productId: string;
    quantity: number;
    clientPrice?: number; // optional cached VND price; never trusted for checkout
  }>;
};
```

Response:

```ts
type ValidateCartItemsResponse = {
  valid: boolean;
  items: Array<{
    productId: string;
    status: "OK" | "OUT_OF_STOCK" | "NOT_FOUND" | "HIDDEN";
    currentPrice: number;
    priceChanged: boolean;
  }>;
};
```

Validation rules:

- Accept `1..20` distinct item IDs and quantity `1..99`.
- `HIDDEN` means a product exists but fails the public storefront predicate.
- `NOT_FOUND` means no product exists.
- `OUT_OF_STOCK` means requested quantity exceeds current stock.
- `currentPrice` is `0` for `NOT_FOUND`; otherwise it is the authoritative VND integer.
- `priceChanged` compares authoritative price with `clientPrice` when supplied; when `clientPrice` is omitted, return `false`.
- `clientPrice` is comparison-only. Checkout and order creation always read the authoritative database price.
- `valid` is true only when every item has status `OK`.
- A network or `5xx` failure blocks checkout and shows `Không thể xác minh giỏ hàng, vui lòng thử lại`.

## Schema / Prisma Changes

Add explicit catalog visibility so wishlist cleanup and admin controls do not depend only on slug conventions:

```prisma
model Product {
  // existing fields
  isVisible Boolean @default(false)

  @@index([isVisible, isBlindBox])
}
```

Migration and backfill:

1. Add `Product.isVisible` with default `false`.
2. Set `isVisible = true` only for `slug = "vanie-blind-box"`.
3. Keep Vanie 1 through Vanie 10 and all other legacy products at `false`.
4. Apply the same schema update to both Prisma schema copies.
5. Run `prisma validate`, generate the client, and verify the backfill before enabling the public filter.

Existing fields already express the required roles:

- `Product.isBlindBox`.
- `Product.isVisible`.
- `Product.blindBoxSetId`.
- `Product.isCollector`.
- `Product.setId`.
- `Product.setSlotNumber`.

Application invariants:

- `vanie-blind-box` is the only product with `isVisible = true`.
- The blind-box SKU has `isBlindBox = true`, `isCollector = false`, and a valid `blindBoxSetId`.
- Vanie variants have `isCollector = true`, `isBlindBox = false`, `price = 0`, and valid set slots.
- Internal variants must never pass the public storefront predicate.

Future expansion may add an explicit `catalogStatus` enum such as `PUBLIC`, `INTERNAL`, and `ARCHIVED`, but that is outside this release.

### Seed Changes

Update the Vanie seed to guarantee:

- The SKU title is exactly `Túi mù Vanie`.
- The SKU slug remains `vanie-blind-box`.
- The SKU cover image is committed at `/images/blind-box/vanie-blind-box-cover.png`.
- The cover must not visually resemble any single Vanie variant.
- If final artwork is unavailable, use the committed plain orange `#e85d00` placeholder at that path.
- The SKU has `isVisible = true`.
- All 10 variants remain collector products and pool entries.
- All variants have `isVisible = false`.
- Variant prices remain `0`.
- The active pool contains exactly 10 entries.
- The seed is idempotent.

Do not delete legacy products as part of the seed. Public filtering hides them while preserving historical foreign keys.

## Frontend Changes

### Homepage

- Fetch only the public blind-box SKU.
- Hero content must not rotate through hidden variants.
- Product section renders one card.
- Remove fallback catalog behavior that injects unrelated products when the database query succeeds with zero public products.
- If the SKU is missing, show an explicit unavailable state rather than legacy merchandise.

### Shop

- Render a single product card for `Túi mù Vanie`.
- Filters and sort may remain visually present, but they cannot reveal hidden products.
- Prefer simplifying or hiding filters that have no effect with one SKU.
- Pagination must not show extra pages.

### Search

- Return only the blind-box SKU.
- Empty queries and variant-name queries must not expose individual variants.
- Search reads authoritative database fields without applying legacy merchandise templates.

### Product Card

- Show badge `TÚI MÙ`.
- Show SKU image, `150.000đ` or current authoritative price, and stock state.
- Link only to `/product/vanie-blind-box`.

### Product Detail

Render:

- Blind-box cover image.
- Product name, price, stock, description, quantity, and purchase actions.
- Section `10 MẪU VANIE CÓ THỂ NHẬN`.
- Ten cards ordered by `slotNumber`.
- Variant image.
- Variant name.
- Localized rarity label.
- Rarity badge with accessible text and sufficient contrast.

Do not render:

- Numeric weights.
- Exact percentages.
- Add-to-cart controls for variants.
- Variant stock.

Responsive layout:

- Two columns on small mobile.
- Three to five columns on wider screens.
- Images use `next/image`, stable aspect ratios, and descriptive alt text.
- Long names do not overflow cards.

### Authoritative Catalog Data

Public catalog surfaces must read these fields directly from the database:

- `title`.
- `mainImage`.
- `price`.
- `inStock`.
- `isCollector`.
- `isBlindBox`.
- `isVisible`.

`toMerchProduct()` is forbidden on:

- `GET /api/products`.
- Public product detail.
- Public search results.
- Homepage and shop product cards.
- Cart and wishlist revalidation.

`toMerchProduct()` may remain only for legacy admin display if still required. It must never overwrite authoritative customer-facing prices, stock, identity, or collector flags.

### Cart And Wishlist

- Remove hidden stale products after revalidation.
- Show one Vietnamese toast explaining the removal.
- Prevent hidden products from being added through UI actions.

## Backend Changes

1. Add a shared TypeScript public-catalog policy/helper for Next.js and Prisma queries.
2. Remove the public `mode=admin` bypass and move admin listing to authenticated `GET /api/admin/products`.
3. Mirror the same predicate in Express public product/search/slug controllers until those endpoints are retired.
4. Apply the policy to list queries and count queries.
5. Enforce sellability again inside atomic checkout.
6. Implement `POST /api/catalog/validate-items`.
7. Extend the rarity endpoint with variant images and full active-pool validation.
8. Replace wishlist user-ID routes with session-derived routes and transactional stale-row cleanup.
9. Preserve unrestricted internal queries for admin, pool, allocation, redemption, and collection.
10. Add structured logs when checkout rejects a hidden product, without logging redemption codes or personal data.
11. Remove `toMerchProduct()` from every public catalog surface.
12. Implement authenticated `PATCH /api/admin/blind-box/pool/publish` as the canonical pool-publication endpoint.
13. On successful pool publication, invalidate public rarity data:
    - Call `revalidateTag("rarity-data")`.
    - Call `revalidatePath("/product/vanie-blind-box")`.

`PATCH /api/admin/blind-box/pool/publish` requires a valid NextAuth admin session, delegates to the shared atomic publish service, and performs both invalidations only after the transaction commits. Any legacy publish route must delegate to this endpoint's service or be removed; it must not duplicate publication logic.

Suggested helper contracts:

```ts
export const PUBLIC_BLIND_BOX_SLUG = "vanie-blind-box";

export function publicStorefrontProductWhere(): Prisma.ProductWhereInput;

export function isPubliclySellableProduct(product: {
  slug: string;
  isVisible: boolean;
  isBlindBox: boolean;
  isCollector: boolean;
}): boolean;
```

## Implementation Steps

1. Add the shared public storefront policy and unit tests.
2. Update homepage Prisma query and remove unrelated fallback products.
3. Add the `isVisible` migration/backfill in both Prisma schemas.
4. Remove public `mode=admin` and secure `GET /api/admin/products`.
5. Update Express product, search, and slug queries.
6. Update shop pagination/count behavior and exact response mapper.
7. Enforce `PRODUCT_NOT_SELLABLE` in atomic checkout.
8. Implement cart validation and blocking UI states.
9. Extend the rarity endpoint and product-page query with variant images.
10. Build the 10-variant product-detail grid.
11. Implement fixed `308` redirects and SEO exclusions.
12. Replace wishlist routes, enforce session ownership, and clean stale rows transactionally.
13. Remove `toMerchProduct()` from public surfaces.
14. Update the Vanie seed and committed cover asset reference.
15. Add cache invalidation to pool publication.
16. Add integration and end-to-end coverage.
17. Run type-check, tests, Prisma validation, build, and storefront smoke tests.

## Test Cases

### Unit

- Public storefront predicate accepts `vanie-blind-box`.
- Predicate rejects every collector variant.
- Predicate rejects unrelated legacy products.
- Variant presentation mapper returns image/name/slot/rarity and no weight.
- Cart validation marks hidden products without removing them; wishlist cleanup transactionally deletes hidden rows without changing valid rows.
- Product-list mapper returns the exact typed response contract.
- Public mappers preserve authoritative database price, stock, image, and flags.

### API / Integration

- `GET /api/products` returns exactly one product with slug `vanie-blind-box`.
- `GET /api/products?mode=admin` returns `400` or `404` and never returns hidden products.
- Product count and pagination use the same predicate.
- Searching `Vanie`, `Vanie 1`, and `Túi mù` never returns collector variants.
- Direct product URLs `/product/vanie-1` through `/product/vanie-10` return `308` with `Location: /product/vanie-blind-box`.
- Rarity endpoint returns 10 ordered variants with images and rarity tiers.
- Rarity endpoint never returns `drawWeight`, percentages, or pool IDs.
- Checkout accepts `vanie-blind-box`.
- Checkout rejects `vanie-1` through `vanie-10` with `422 PRODUCT_NOT_SELLABLE`.
- Wishlist mutation rejects hidden variants.
- Unauthenticated `GET /api/wishlist` returns `401`.
- A request attempting another user's wishlist identity returns `403`.
- `GET /api/wishlist` with another user's `userId` supplied in a header returns `403`.
- Wishlist reads delete stale hidden rows transactionally.
- Cart validation returns `HIDDEN`, `NOT_FOUND`, and `OUT_OF_STOCK` deterministically.
- Checkout remains disabled after cart-validation network failure.
- Admin pool APIs still return all 10 variants.
- Existing allocation and collection reads still resolve variant products.

### End-to-End

- Homepage shows one product card.
- Shop shows one product card and no extra pages.
- Search never exposes separately purchasable variants.
- Blind-box detail shows all 10 variant images and rarity labels.
- No variant card contains a purchase button or direct variant link.
- A stale cart containing `vanie-1` shows a blocking inline warning and keeps the item until the customer removes it.
- Purchasing the blind box still creates one stable allocation per quantity.
- Order confirmation and collection pages still show the drawn variant.

### Regression

- Historical orders containing legacy products remain readable.
- Admin can edit pool weights for all 10 variants.
- Warehouse packing list still displays allocated variant data.
- Redemption codes still unlock their corresponding variant slots.
- No public response exposes numeric odds.
- Pool publication invalidates `rarity-data` and revalidates `/product/vanie-blind-box`.
- Hidden variants are absent from `sitemap.xml` and disallowed by `robots.txt`.

## Acceptance Criteria

- The public homepage, shop, search, and product APIs expose only `Túi mù Vanie`.
- `GET /api/products` returns the exact `PublicProductListResponse` contract, including 1-indexed `page`, `total`, `totalPages`, and default `pageSize = 12`.
- `GET /api/products?mode=admin` returns `400` or `404` and never exposes hidden products.
- Admin product listing is available only from authenticated `GET /api/admin/products`.
- `Vanie 1` through `Vanie 10` cannot be purchased directly through UI or API.
- `GET /product/vanie-[1-10]` returns `308` to `/product/vanie-blind-box`.
- The blind-box detail page shows exactly 10 ordered variants with image and rarity.
- An invalid active pool returns `503 { error: "ACTIVE_POOL_INVALID" }` and writes a server error log.
- Exact weights and percentages are not visible publicly.
- Checkout rejects hidden product IDs server-side.
- Cart cannot add hidden variants and marks existing hidden variants until customer removal; wishlist cannot add or retain hidden variants after a read.
- Cart hydration and checkout submission require successful `POST /api/catalog/validate-items`.
- Cart validation failure blocks checkout and displays the required Vietnamese warning.
- Hidden cart items remain visible with an inline warning until the customer removes them.
- Unauthenticated wishlist requests return `401`.
- Authenticated cross-user wishlist attempts return `403`.
- Hidden product IDs submitted to wishlist return `422 PRODUCT_NOT_AVAILABLE`.
- Stale hidden wishlist rows are deleted transactionally on read.
- Admin, pool, fulfillment, allocation, redemption, and collection flows continue to access the internal variants.
- Existing order and allocation history remains intact.
- Public catalog surfaces never call `toMerchProduct()`.
- `PATCH /api/admin/blind-box/pool/publish` requires an admin session and calls `revalidateTag("rarity-data")` plus `revalidatePath("/product/vanie-blind-box")` after commit.
- `/images/blind-box/vanie-blind-box-cover.png` is committed and does not visually resemble any single Vanie variant.
- Hidden variant URLs are excluded from `sitemap.xml`.
- `robots.txt` disallows `/product/vanie-1` through `/product/vanie-10`.
- Vietnamese-first copy and the dark `#070707` plus orange `#e85d00` theme are preserved.

## Risks / Resolved Decisions

### Confirmed Assumptions

- `Túi mù Vanie` is the only public SKU for this release.
- The 10 Vanie records remain `Product` rows for internal relational integrity.
- Public rarity disclosure includes tiers but not numeric odds.

### Resolved Decisions

- Direct known Vanie variant URLs always return `308`; `404` is not allowed for those 10 routes.
- Public product lists use the typed paginated object contract in this spec.
- Cart validation uses `POST /api/catalog/validate-items` and blocks checkout on validation failure.
- Hidden cart items are marked, not auto-removed.
- Hidden wishlist rows are deleted transactionally on read.
- Wishlist identity is derived only from NextAuth session.
- The committed cover path is `/images/blind-box/vanie-blind-box-cover.png`.
- `Product.isVisible` is added in this release.
- Public catalog data is never transformed by `toMerchProduct()`.
- Pool publishing invalidates both the rarity cache tag and blind-box product page.
- No implementation-blocking questions remain.

### Risks

- Applying the public filter to admin or fulfillment queries would break pool management and packing.
- Filtering list queries without filtering count queries would create incorrect pagination.
- UI-only hiding would leave a direct checkout exploit.
- Existing browser carts and wishlists can retain stale variants until revalidated.
- Reusing a variant image as the blind-box cover can mislead customers into expecting that exact character.

### Mitigations

- Centralize the public predicate and test every public surface.
- Add checkout and wishlist server-side guards.
- Keep historical/internal queries explicitly separate.
- Use a dedicated blind-box cover asset.
- Add end-to-end assertions for product count and hidden direct URLs.
