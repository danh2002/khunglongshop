# Plan 012: Reduce /shop client startup and LCP cost

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report - do not improvise. When done, update the status row for this plan
> in `plans/README.md` unless a reviewer tells you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 7518e8e..HEAD -- "app/(public)/shop/[[...slug]]/page.tsx" "app/(public)/bo-suu-tap/page.tsx" components/Products.tsx components/ProductItem.tsx components/Filters.tsx components/Breadcrumb.tsx components/design-system.tsx components/index.ts lib/publicCatalog.ts tests/unit`
>
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `7518e8e`, 2026-07-07

## Why this matters

Vercel Speed Insights reports production `/shop` desktop with FCP `4.26s` and
LCP `4.27s`, while TTFB is only `0.11s`. That shape means the server is fast
and the slow part is browser-side startup, hydration, image discovery, or
render-blocking CSS/JS. The current `/shop` route renders product data on the
server, but the visible product cards and shell cross client-component
boundaries that pull cart state, toast, styled-components runtime, and
framer-motion into the first paint path.

## Findings

| # | Finding | Impact | Effort | Risk | Evidence |
|---|---|---|---|---|---|
| 1 | Product cards are fully client components | The first 24 cards on `/shop` hydrate cart/toast/zustand even though image/title/price can be static HTML. This can delay FCP/LCP after a fast TTFB. | M | MED | `components/ProductItem.tsx:1`, `components/ProductItem.tsx:5-8`, `components/Products.tsx:48-49` |
| 2 | `/shop` imports a client design-system module that also imports framer-motion | Static shell wrappers (`SectionShell`, `Wrapper`) are exported from a `"use client"` file that imports `LazyMotion`, `domAnimation`, and `m`. This risks adding motion runtime to routes that only need static layout. | S | MED | `components/design-system.tsx:1-5`, `components/design-system.tsx:63-70`, `app/(public)/shop/[[...slug]]/page.tsx:4` |
| 3 | Product images above the fold have no priority/eager hint | If the LCP element is a first-row product image, the browser discovers it through normal lazy `next/image` behavior. | S | LOW | `components/ProductItem.tsx:148-153` |
| 4 | Source product images are very large PNGs | Several product PNGs are 1254x1254 and 1.5-2.2 MB before optimization. Next/Image helps, but source decode/optimizer and cache misses still have a real cost. | M | LOW | `public/images/products/1781155227331-7d4a8253-Blindbox.png` is 2,082,186 bytes; `public/images/products/1782718451467-cd549a86-Vanie---Dien-Tieu---1.png` is 2,211,713 bytes |
| 5 | Filter state writes URL from an effect and has known missing deps | The effect rewrites URL params after hydration and can trigger an extra navigation/render on pages that mount it. Even if currently unused on `/shop`, it is the filter component in scope and should not be reintroduced as the primary shop driver. | S | LOW | `components/Filters.tsx:55-65` |
| 6 | Barrel import can pull unrelated component graph into route analysis | `/shop` imports `Breadcrumb` and `Products` from `@/components`; the barrel also exports admin and many client components. Previous homepage performance work already avoided this pattern. | S | LOW | `app/(public)/shop/[[...slug]]/page.tsx:3`, `components/index.ts:1-48` |

## Current state

- `app/(public)/shop/[[...slug]]/page.tsx` is the production `/shop` route:

```tsx
// app/(public)/shop/[[...slug]]/page.tsx:1-18
export const revalidate = 60;

import { Breadcrumb, Products } from "@/components";
import { SectionShell, Wrapper } from "@/components/design-system";

export default function ShopPage() {
  return (
    <SectionShell>
      <Wrapper>
        <Breadcrumb />
        ...
        <Products />
```

- `app/(public)/bo-suu-tap/page.tsx` is the collection route and uses the same
  shell plus `Products`. It has a hero image for character-filtered URLs:

```tsx
// app/(public)/bo-suu-tap/page.tsx:24-31
<Image
  src={characterHero.image}
  alt={characterHero.title}
  fill
  priority
  sizes="100vw"
  className="object-cover"
  style={{ objectFit: "cover", objectPosition: "center" }}
/>
```

- `components/Products.tsx` is already a server component that queries Prisma
  directly and limits to 24 products:

```tsx
// components/Products.tsx:13-23
const Products = async ({ categorySlug, characterSlug }: ProductsProps = {}) => {
  const isCollectorGallery = Boolean(characterSlug);
  const products = await prisma.product.findMany({
    where: isCollectorGallery
      ? buildCollectorGalleryWhere({ characterSlug })
      : buildPublicStorefrontWhere({ categorySlug }),
    orderBy: isCollectorGallery
      ? [{ set: { name: "asc" } }, { setSlotNumber: "asc" }, { title: "asc" }, { id: "asc" }]
      : [{ title: "asc" }, { id: "asc" }],
    take: 24,
```

- `components/ProductItem.tsx` is the expensive first-paint boundary:

```tsx
// components/ProductItem.tsx:1-8
"use client";

import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import styled from "styled-components";
import { useProductStore } from "@/app/_zustand/store";
```

- The current image markup has no LCP hint:

```tsx
// components/ProductItem.tsx:148-153
<Image
  src={normalizeCatalogImage(product.mainImage)}
  alt={sanitize(product.title) || "Hinh anh san pham"}
  fill
  sizes={compact ? "220px" : "(max-width: 768px) 50vw, 25vw"}
  style={{ objectFit: "contain" }}
/>
```

- `components/design-system.tsx` mixes static shell exports with framer-motion:

```tsx
// components/design-system.tsx:1-5
"use client";

import Link from "next/link";
import styled, { css } from "styled-components";
import { LazyMotion, domAnimation, m } from "framer-motion";
```

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Generate Prisma client | `npm run db:generate` | exit 0 |
| Typecheck | `npm run type-check` | exit 0, no TypeScript errors |
| Unit tests | `npx vitest run --exclude "tests/otp/**"` | exit 0, all non-OTP tests pass |
| Build | `npm run build` | exit 0 if the environment has a live `DATABASE_URL`; if not, record that build is manual |
| Source scan | `rg -n "from \"@/components\"" "app/(public)/shop" "app/(public)/bo-suu-tap"` | no output |

## Scope

**In scope**:

- `app/(public)/shop/[[...slug]]/page.tsx`
- `app/(public)/bo-suu-tap/page.tsx`
- `components/Products.tsx`
- `components/ProductItem.tsx`
- `components/Filters.tsx`
- `components/Breadcrumb.tsx`
- `components/design-system.tsx` or a new public-shell module next to it
- `components/index.ts`
- `lib/publicCatalog.ts` only if a type needs to move or narrow
- `tests/unit/*` source-inspection tests for these changes

**Out of scope**:

- Any admin route or component
- Checkout, account, auth, and API behavior
- Database schema or migrations
- Visible UI/UX changes
- Recompressing the entire image library in this plan

## Git workflow

- Branch: `advisor/012-shop-performance-client-boundary-lcp`
- Commit message style in recent history is short imperative, for example
  `Reduce homepage startup payload`. Use a similar message such as
  `Reduce shop startup payload`.
- Do not push unless the operator explicitly asks.

## Steps

### Step 1: Measure the current LCP element before changing code

Open production `/shop` in Chrome with DevTools Performance or Lighthouse. Also
run this in the console after the page loads:

```js
performance.getEntriesByType("largest-contentful-paint").slice(-1).map((entry) => ({
  startTime: Math.round(entry.startTime),
  element: entry.element?.tagName,
  text: entry.element?.textContent?.trim()?.slice(0, 120),
  src: entry.element?.currentSrc || entry.element?.src || null,
  className: entry.element?.className || null,
}));
```

Record the result in the PR notes. If this returns no entries, use Lighthouse's
LCP element panel instead.

**Verify**: You have identified one of:

- a product image in the first grid row,
- the `/images/backgroundshop.png` shell background,
- the page heading/breadcrumb text,
- or a different element with selector/source recorded.

### Step 2: Remove barrel imports from the `/shop` and `/bo-suu-tap` route pages

Replace route imports from `@/components` with direct imports:

```tsx
import Breadcrumb from "@/components/Breadcrumb";
import Products from "@/components/Products";
```

Do this in:

- `app/(public)/shop/[[...slug]]/page.tsx`
- `app/(public)/bo-suu-tap/page.tsx`

Do not change markup.

**Verify**:

```bash
rg -n "from \"@/components\"" "app/(public)/shop" "app/(public)/bo-suu-tap"
```

Expected: no output.

### Step 3: Split static shop shell exports away from framer-motion

Create a server-safe module, for example `components/public-shell.tsx`, that
contains only the static styled-components needed by `/shop` and
`/bo-suu-tap`:

- `sectionPattern`
- `SectionShell`
- `Wrapper`

This new module must not include `"use client"` and must not import
`framer-motion`.

Then either:

1. update `/shop` and `/bo-suu-tap` to import `SectionShell` and `Wrapper` from
   the new server-safe module, or
2. refactor `components/design-system.tsx` so static exports live in a
   server-safe file and motion exports stay in a small client-only file.

Keep all CSS values identical, including the `/images/backgroundshop.png`
background and wrapper padding.

**Verify**:

```bash
rg -n "framer-motion|LazyMotion|domAnimation|MDiv" "app/(public)/shop" "app/(public)/bo-suu-tap" components/public-shell.tsx components/design-system.tsx
```

Expected: no `framer-motion`, `LazyMotion`, `domAnimation`, or `MDiv` match in
the `/shop` or `/bo-suu-tap` import path used for `SectionShell`/`Wrapper`.

### Step 4: Make the visible product card mostly server-rendered

Split the current `ProductItem` into:

- a server component that renders `Card`, `Media`, `Image`, `Link`, `Name`,
  `Price`, and `Stock`;
- a small client component only for the add-to-cart button and toast.

One acceptable shape:

- `components/ProductItem.tsx` becomes a server component with no `"use client"`.
- `components/ProductQuickAdd.tsx` is the new client component that imports
  `toast` and `useProductStore`.
- `ProductItem` renders `<ProductQuickAdd ... />` only when `viewOnly` is false.

Do not change visible labels, spacing, hover behavior, or disabled behavior.
If styled-components nested selectors need to keep the hover behavior, either
keep the selectors in the server `ProductItem` or move only the button style
into `ProductQuickAdd` while preserving generated markup.

**Verify**:

```bash
Select-String -LiteralPath components/ProductItem.tsx -Pattern '"use client"|react-hot-toast|useProductStore'
```

Expected: no output.

```bash
Select-String -LiteralPath components/ProductQuickAdd.tsx -Pattern '"use client"|react-hot-toast|useProductStore'
```

Expected: matches all three concepts in the new small client component.

### Step 5: Add an opt-in priority/eager hint for only above-fold product images

Extend `ProductItem` with a prop such as:

```ts
imagePriority?: boolean;
```

Pass it through to `next/image`:

```tsx
<Image
  ...
  priority={imagePriority}
  loading={imagePriority ? "eager" : "lazy"}
  fetchPriority={imagePriority ? "high" : "auto"}
/>
```

In `components/Products.tsx`, set `imagePriority` only for the first row:

- desktop grid is 3 columns in this file, so prioritize indexes `0`, `1`, `2`;
- if this route is later changed to 4 columns, adjust this to first visible row
  only.

Do not set priority on all 24 images.

**Verify**:

```bash
Select-String -LiteralPath components/Products.tsx -Pattern "imagePriority"
Select-String -LiteralPath components/ProductItem.tsx -Pattern "fetchPriority|priority="
```

Expected: both commands show the new prop usage.

### Step 6: Keep filters URL-driven and avoid effect-driven initial redirects

If `Filters` is mounted on `/shop` during the refactor, change it so initial
render state comes from `searchParams`, and URL changes happen only in direct
input event handlers or form submission. Do not keep the current "write URL in
useEffect after hydration" behavior.

If `Filters` is not mounted on `/shop`, keep it out of the page until a separate
product-filter plan is written.

At minimum, fix the missing dependency warning if the effect remains:

```tsx
}, [inputCategory, sortBy, page, pathname, replace]);
```

Prefer removing the effect over expanding it.

**Verify**:

```bash
npx vitest run --exclude "tests/otp/**"
```

Expected: exit 0.

### Step 7: Add source-inspection regression tests

Add or update unit tests in `tests/unit` following the existing source-scanning
style used by `tests/unit/routeLoading.test.ts` and
`tests/unit/redemptionCodeSpecWiring.test.ts`.

Cover:

- `/shop` and `/bo-suu-tap` do not import from the `@/components` barrel.
- `ProductItem.tsx` is not a client component and does not import
  `react-hot-toast` or `useProductStore`.
- The new quick-add client component is the only product-card file importing
  cart store/toast.
- First-row image priority is wired in `Products.tsx`.
- The static shell used by `/shop` does not import `framer-motion`.

**Verify**:

```bash
npx vitest run --exclude "tests/otp/**"
```

Expected: all non-OTP tests pass.

### Step 8: Build and compare `/shop`

Run:

```bash
npm run db:generate
npm run type-check
npx vitest run --exclude "tests/otp/**"
npm run build
```

Expected:

- typecheck passes;
- non-OTP tests pass;
- build passes when `DATABASE_URL` reaches the production-like MySQL/TiDB DB;
- route table keeps `/shop` as ISR/static (`revalidate = 60`) and does not make
  it dynamic.

After deploying, re-check Vercel Speed Insights for `/shop`. The target is:

- FCP below `1.8s` on desktop P75, or at least a clear drop from `4.26s`;
- LCP below `2.5s` on desktop P75, or at least a clear drop from `4.27s`;
- TTFB remains under `0.3s`;
- INP and CLS do not regress.

## Test plan

- Source-inspection tests as described in Step 7.
- Manual browser smoke after deploy:
  - open `/shop`;
  - product cards still show image, name, price, stock;
  - add-to-cart still works for sellable blind-box products;
  - `/bo-suu-tap`, `/bo-suu-tap?nhanvat=vanie`, `/bo-suu-tap?nhanvat=heni`,
    and `/bo-suu-tap?nhanvat=ricon` still render.

## Done criteria

- [ ] `/shop` and `/bo-suu-tap` import `Breadcrumb` and `Products` directly.
- [ ] The `/shop` shell path used by `SectionShell`/`Wrapper` does not import
      `framer-motion`.
- [ ] `components/ProductItem.tsx` is server-rendered and no longer imports
      `react-hot-toast` or `useProductStore`.
- [ ] Add-to-cart behavior remains in a small client component.
- [ ] Only first-row product images are marked priority/eager/high priority.
- [ ] `npm run type-check` passes.
- [ ] `npx vitest run --exclude "tests/otp/**"` passes.
- [ ] `npm run build` passes in an environment with live `DATABASE_URL`.
- [ ] Production `/shop` Speed Insights is re-measured after deploy.

## STOP conditions

Stop and report back if:

- The LCP element is not product grid, shell background, or page heading, and the
  required fix would touch files outside this plan's scope.
- Splitting `ProductItem` requires changing cart store semantics or public cart
  behavior.
- Styled-components server rendering breaks or causes hydration warnings after
  moving shell exports.
- The build route table changes `/shop` from ISR/static to dynamic.
- The fix requires changing DB schema, product API response shape, or admin
  code.

## Maintenance notes

- Do not solve the image-library weight by bulk recompressing assets in this
  plan. If FCP/LCP remains poor after reducing client JS, write a separate image
  compression/CDN plan.
- Keep product cards reusable by homepage and search. If a route needs a
  no-cart card, pass `viewOnly`; do not add route-specific forks unless a future
  plan justifies it.
- Any future filter work should be server/searchParam driven for the initial
  render. Avoid client-side `useEffect` fetches or initial URL rewrites for
  product grids.
