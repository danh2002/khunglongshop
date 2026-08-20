# Plan 025: Make product-card images resilient and keep mobile grids consistent

> **Executor instructions:** Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first):** `git diff --stat 07b74d6..HEAD -- components/ProductItem.tsx components/FeaturedSeries.tsx components/Products.tsx components/ProductCardImage.tsx tests/unit/productCardImage.test.tsx tests/unit/responsiveProductCardImages.test.ts plans/README.md`
>
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding. A mismatch
> is a STOP condition.

## Status

- **Priority:** P1
- **Effort:** S
- **Risk:** LOW
- **Depends on:** none
- **Category:** bug
- **Planned at:** commit `07b74d6`, 2026-08-20

## Why this matters

The mobile screenshots show product-card images failing while the homepage hero
continues to render. That pattern is consistent with unavailable legacy remote
product objects, but the storefront currently exposes a broken-image icon and
alt text instead of a deliberate fallback. Separately, the mobile shop grid
switches to one column below 500px while equivalent homepage cards remain two
columns, and the random-collector slots under-declare their mobile width. This
plan makes the displayed product-card surfaces degrade gracefully without
changing catalog data, Blob/R2 storage, upload behavior, or the shared image
configuration.

## Current state

- `components/ProductItem.tsx` is the shared server-rendered product card for
  homepage featured products, homepage blind boxes, shop listings, search, and
  collector galleries. It currently renders `next/image` directly:

```tsx
// components/ProductItem.tsx:185-219
export default function ProductItem({ product, compact = false, ... }) {
  ...
  <Image
    src={normalizeCatalogImage(product.mainImage)}
    alt={sanitize(product.title) || "Hình ảnh sản phẩm"}
    fill
    sizes={compact ? "220px" : "(max-width: 768px) 50vw, 25vw"}
    priority={imagePriority}
    loading={imagePriority ? "eager" : "lazy"}
    fetchPriority={imagePriority ? "high" : "auto"}
    style={{ objectFit: "contain" }}
  />
}
```

  `ProductItem` must remain a Server Component; `tests/unit/shopStartupPayload.test.ts`
  checks that it has no `"use client"`, cart-store, or toast import. An
  `onError` state handler therefore belongs in a narrow child Client Component,
  not in `ProductItem` itself.

- `components/NewArrivals.tsx` renders compact `ProductItem` cards in a
  horizontal row with `flex: 0 0 220px`, so its existing `sizes="220px"` is
  correct. `components/FeaturedProductsGrid.tsx` renders four/three/two columns
  and its mobile cards are about `(100vw - 62px) / 2`; the existing `50vw`
  declaration is safe but imprecise.

- `components/Products.tsx` renders the public `/shop` card grid. It has a
  conflicting one-column rule below 500px:

```tsx
// components/Products.tsx:46
<div className="grid grid-cols-3 justify-items-center gap-x-5 gap-y-8 max-[1300px]:grid-cols-3 max-lg:grid-cols-2 max-[500px]:grid-cols-1">
```

  At a 440px viewport this produces one column, unlike the homepage product
  grid. The shop wrapper has 16px minimum horizontal padding and the grid gap
  is 20px, so two mobile cards are approximately `(100vw - 52px) / 2` wide.

- `components/FeaturedSeries.tsx` renders the homepage “Túi mù random” cover
  plus collector product slots. Only the slots use remote product images:

```tsx
// components/FeaturedSeries.tsx:108-115, 285-292
@media (max-width: 520px) {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
...
<Image
  src={normalizeCatalogImage(product.mainImage)}
  alt={product.title}
  fill
  sizes="120px"
  style={{ objectFit: "contain" }}
/>
```

  At 440px, after the section’s 24px gutters, the panel’s 32px padding, and
  the 12px grid gap, each slot is about 158px—not 120px. The decorative local
  `"/tui-mu-random.png"` cover does not need this fallback behavior.

- `lib/publicCatalog.ts:116-121` already normalizes `null`, `undefined`, and
  blank catalog values to a non-empty string before `next/image` receives it:

```ts
export function normalizeCatalogImage(path: string | null | undefined) {
  const imagePath = path?.trim();
  if (!imagePath) return "/product_placeholder.jpg";
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  return `/${imagePath.replace(/^\/+/, "")}`;
}
```

  The database selects `mainImage` as a required field for homepage and shop
  product queries (`lib/homepage-products.ts` and `components/Products.tsx`).
  There is no evidence that an undefined `src` causes these card failures.
  `public/product_placeholder.jpg` is absent, however, so the client fallback
  must use the verified existing local `public/images/logo.png` asset rather
  than that nonexistent path.

- `next.config.mjs` already allows both the legacy Blob suffix and the R2
  hostname, and `normalizeCatalogImage` preserves HTTPS URLs. Do not change it.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused fallback/grid tests | `npx vitest run tests/unit/productCardImage.test.tsx tests/unit/responsiveProductCardImages.test.ts` | exit 0 |
| Type check | `npm run type-check` | exit 0 |
| Full non-OTP tests | `npx vitest run --exclude "tests/otp/**"` | exit 0 |
| Scope check | `git diff --stat -- components/ProductItem.tsx components/FeaturedSeries.tsx components/Products.tsx components/ProductCardImage.tsx tests/unit/productCardImage.test.tsx tests/unit/responsiveProductCardImages.test.ts plans/README.md` | only in-scope paths |

## Scope

**In scope** (the only files the executor may modify):

- `components/ProductCardImage.tsx` (create): the small Client Component that
  owns image-error state for product-card media.
- `components/ProductItem.tsx`: replace its direct product `Image` with the
  wrapper and support a caller-provided responsive `sizes` value.
- `components/FeaturedSeries.tsx`: use the wrapper for collector product slots
  and correct the mobile slot `sizes` value.
- `components/Products.tsx`: keep a two-column mobile shop grid and pass the
  shop-specific `sizes` declaration to `ProductItem`.
- `tests/unit/productCardImage.test.tsx` (create): behavior test for fallback.
- `tests/unit/responsiveProductCardImages.test.ts` (create): source-level
  regression guard for every affected product-card surface and grid rule.
- `plans/README.md`: this plan’s status row only.

**Out of scope** (do not touch):

- `app/api/admin/upload/route.ts`, `lib/r2.ts`, `next.config.mjs`, environment
  variables, Vercel Blob/R2 objects, database fields, and migrations.
- `lib/publicCatalog.ts` and `lib/adminProduct.ts`. This plan does not backfill
  empty source values or rewrite normalization; it handles browser load errors
  in the product-card UI.
- `components/Hero.tsx`, homepage-slider media, `components/FeaturedDrop.tsx`,
  product-detail galleries, account/cart/wishlist/admin thumbnails, and any
  non-product `Image` call. The reported regression is homepage/shop product
  cards; do not turn this into a global image refactor.
- `public/` assets. Reuse existing `/images/logo.png`; do not add, convert, or
  delete image files.
- Changing image priority/loading behavior. Preserve the current
  `imagePriority`, `loading`, and `fetchPriority` behavior exactly.

## Git workflow

- Work on the current branch unless the operator instructs otherwise.
- Commit only if the operator requests it; recent history uses concise
  imperative messages such as `Fix: allow R2 URLs in all admin product image validations`.
- Do not push or open a pull request unless explicitly instructed.

## Steps

### Step 1: Confirm current product-card surfaces and safety boundaries

Run the drift check first. Confirm all of the following before editing:

1. `ProductItem` is still a Server Component and directly imports `next/image`.
2. `NewArrivals`, `FeaturedProductsGrid`, and `Products` still render
   `ProductItem`; `FeaturedSeries` still renders collector slot images directly.
3. `public/images/logo.png` exists and `public/product_placeholder.jpg` does
   not exist.
4. `next.config.mjs` still includes the existing Blob and R2 remote patterns.

If any statement differs, stop and report rather than widening the plan.

**Verify:** `rg -n 'ProductItem|next/image|/images/logo.png|product_placeholder|public\.blob\.vercel-storage|r2\.dev' components lib next.config.mjs` -> output confirms the facts above.

### Step 2: Create a narrow Client Component for product-card image fallback

Create `components/ProductCardImage.tsx` with `"use client"`. It must be a
small wrapper around `next/image`, not a client conversion of `ProductItem`.

Use a module constant:

```ts
const PRODUCT_IMAGE_FALLBACK = "/images/logo.png";
```

Accept exactly the card-image inputs needed by existing callers: normalized
`src`, `alt`, `sizes`, optional `priority`, optional `loading`, optional
`fetchPriority`, and optional `style`. Render `Image` with `fill` and pass
through the existing optimization props unchanged.

Track the displayed source in local state. On image error, replace it with
`PRODUCT_IMAGE_FALLBACK` only when it is not already that fallback. This avoids
an error loop if the local asset is ever unavailable. Do not add a blur
placeholder: there is no static blur payload for remote catalog images, and it
would not handle an HTTP/optimizer failure after render.

The fallback alt text must remain the product’s original alt text. Do not log a
remote URL or expose storage details to the user.

**Verify:** `npx vitest run tests/unit/productCardImage.test.tsx` -> exit 0.

### Step 3: Route all homepage/shop product-card media through the wrapper

Update `components/ProductItem.tsx`:

- Remove its direct `next/image` import and render `ProductCardImage` inside
  the existing `ImageLink`.
- Continue passing `normalizeCatalogImage(product.mainImage)` and the existing
  sanitized alt text.
- Add an optional `imageSizes` prop. Preserve compact cards as `"220px"`;
  retain `"(max-width: 768px) 50vw, 25vw"` as the default for homepage grid
  cards unless Step 4 supplies an override.
- Pass through the unchanged `imagePriority`, `loading`, `fetchPriority`, and
  `{ objectFit: "contain" }` style.
- Do not add `"use client"` to this file or move cart/toast code into it.

Update `components/FeaturedSeries.tsx`:

- Keep the local `/tui-mu-random.png` cover as the current direct `Image`.
- Replace only the `product ?` collector-slot `Image` with `ProductCardImage`.
- Preserve `fill`, product title alt text, and contain styling.
- Correct the slot declaration to:

```tsx
sizes="(max-width: 520px) calc((100vw - 124px) / 2), 120px"
```

  The subtraction accounts for 48px section gutters, 64px panel padding, and
  the 12px inter-card gap. It causes Next.js to select a source at least as
  large as the real mobile slot while preserving the 120px desktop slot.

**Verify:** `npx vitest run tests/unit/productCardImage.test.tsx tests/unit/responsiveProductCardImages.test.ts` -> exit 0.

### Step 4: Keep `/shop` at two columns on mobile and declare its card width

Update only the product-list grid in `components/Products.tsx`:

- Remove `max-[500px]:grid-cols-1`; keep `max-lg:grid-cols-2` as the mobile
  rule. Do not change the empty-state heading’s independent text-size rule.
- Pass this shop-specific value to each `ProductItem`:

```tsx
imageSizes="(max-width: 1024px) calc((100vw - 52px) / 2), 33vw"
```

  At the 440px target viewport this matches two cards inside the 16px wrapper
  gutters with a 20px column gap. Above the `lg` breakpoint the 33vw branch
  safely covers the three-column shop grid. Do not change the grid’s product
  query, ordering, priority threshold, `viewOnly`, or Tailwind gap classes.

**Verify:** `npx vitest run tests/unit/responsiveProductCardImages.test.ts` -> exit 0.

### Step 5: Add focused regression tests

Create `tests/unit/productCardImage.test.tsx` using the existing
`@testing-library/react` / Vitest pattern in
`tests/unit/carouselAutoplay.test.tsx`:

1. Mock `next/image` as a plain `img` that forwards `src`, `alt`, and
   `onError`.
2. Render `ProductCardImage` with an HTTPS product URL and a product alt text.
3. Trigger `error` on the rendered image and assert its `src` becomes
   `"/images/logo.png"` while its alt text remains unchanged.
4. Trigger another error and assert the source stays on the local fallback,
   proving the error handler does not loop.

Create `tests/unit/responsiveProductCardImages.test.ts` following the
source-inspection style in `tests/unit/shopStartupPayload.test.ts`. Assert:

1. `ProductItem` remains server-rendered and delegates to `ProductCardImage`.
2. `FeaturedSeries` uses `ProductCardImage` for collector slots and contains
   the exact responsive slot `sizes` string from Step 3.
3. `Products` no longer contains `max-[500px]:grid-cols-1`, retains
   `max-lg:grid-cols-2`, and passes the exact shop `imageSizes` string from
   Step 4.
4. `ProductCardImage` contains `onError`, the `/images/logo.png` fallback, and
   a guard against assigning the fallback repeatedly.

Do not add tests that contact Blob, R2, Vercel, or a real database.

**Verify:** `npx vitest run tests/unit/productCardImage.test.tsx tests/unit/responsiveProductCardImages.test.ts` -> exit 0 with all new tests passing.

### Step 6: Run full verification and update plan status

Run:

1. `npm run type-check` -> exit 0.
2. `npx vitest run --exclude "tests/otp/**"` -> exit 0.
3. `git diff --check` -> no whitespace errors.
4. Run the scope-check command from the table -> only in-scope files shown.

Then update Plan 025’s status in `plans/README.md` to `DONE` only if every done
criterion holds.

Finally perform manual browser checks at a 440px viewport:

- Load `/` and confirm featured, blind-box, and “Túi mù random” product slots
  retain their intended layouts; intentionally block one remote product-image
  request in DevTools and confirm the branded fallback appears without a broken
  icon.
- Load `/shop` and confirm the listing remains two columns at 440px.
- Confirm the hero slider is unchanged.

Do not infer storage availability from this UI smoke test; report remote 4xx/5xx
responses separately because storage migration is explicitly out of scope.

## Test plan

- `tests/unit/productCardImage.test.tsx`: fallback source swaps after a mocked
  `next/image` error, preserves alt text, and cannot loop.
- `tests/unit/responsiveProductCardImages.test.ts`: all three product-card
  render surfaces use the wrapper; mobile sizing and grid invariants are kept.
- Existing regression suite: `npx vitest run --exclude "tests/otp/**"`.
- Manual 440px browser checks described in Step 6, including one blocked image
  request to exercise the fallback.

## Done criteria

- [ ] Homepage featured-card, homepage blind-box-card, homepage collector-slot,
      and `/shop` product-card images use the same error-resilient wrapper.
- [ ] A failed product request shows existing local `/images/logo.png`, keeps
      meaningful alt text, and does not enter a fallback loop.
- [ ] `ProductItem` remains a Server Component; cart/toast behavior and image
      priority/loading behavior are unchanged.
- [ ] The `/shop` product listing is two columns at a 440px viewport.
- [ ] `FeaturedSeries` declares its real two-column mobile slot width instead
      of a fixed `120px`.
- [ ] No storage, upload, remote-host, catalog-normalization, schema, or asset
      file is changed.
- [ ] `npm run type-check` exits 0.
- [ ] `npx vitest run --exclude "tests/otp/**"` exits 0.
- [ ] No files outside the in-scope list are modified.
- [ ] Plan 025’s index row is updated.

## STOP conditions

Stop and report back (do not improvise) if:

- The live product card is already a Client Component or the wrapper would
  require moving cart/store/toast logic into its parent.
- The repository no longer contains `public/images/logo.png`, or that asset
  fails to render as a local Next.js image. Do not substitute a remote URL or
  create an unreviewed placeholder asset.
- The affected broken requests are not image load errors (for example, a React
  hydration exception or `next/image` invalid-host error), because an `onError`
  fallback would not address that root cause.
- Correct two-column behavior requires changing the shop route query, a shared
  layout wrapper, Tailwind configuration, image optimizer widths, or any
  out-of-scope component.
- The focused tests, type-check, or full test suite fails twice after a
  reasonable fix attempt.

## Maintenance notes

Any new product-card surface should import `ProductCardImage` rather than
adding a direct remote `next/image` call, so failed historical remote objects
have a consistent user experience. Keep its client boundary narrow; moving
state into `ProductItem` would regress the server-rendered shop startup boundary
documented by `tests/unit/shopStartupPayload.test.ts`. The fallback masks a
failed object visually but does not restore it—review network status codes and
storage lifecycle separately before considering a data or storage remediation.
