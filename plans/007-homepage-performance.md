# Plan 007: Reduce homepage startup payload without changing UI

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report; do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 11aabeb..HEAD -- app/page.tsx app/layout.tsx next.config.mjs lib/homepage-products.ts components/Header.tsx components/NotificationBell.tsx hooks/useNotifications.ts components/index.ts components/ProductItem.tsx components/NewArrivals.tsx components/ProductsSection.tsx components/FeaturedSeries.tsx`
>
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding. On a
> meaningful mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `11aabeb`, 2026-06-30

## Why this matters

The production homepage is already ISR/static cached, so the main performance
cost is client startup: JavaScript, hydration work, global CSS, and image
delivery. A read-only production check on 2026-06-30 found `/` serving about
122 KB raw HTML, about 318 KB Brotli-compressed JS/CSS, and multiple source
images in `public/images` above 1.5 MB. This plan reduces the `/` startup
payload while preserving the exact storefront UI and interactions.

## Current state

- `app/page.tsx` is the homepage. It imports `Hero` and `ProductsSection` from
  the broad barrel `@/components`, while the barrel also exports many unrelated
  client/admin/cart modules.

```tsx
// app/page.tsx:1-9
import { Hero, ProductsSection } from "@/components";
import CollectorBanner from "@/components/CollectorBanner";
import FeaturedSeries from "@/components/FeaturedSeries";
import HomeMarquee from "@/components/HomeMarquee";
import NewArrivals from "@/components/NewArrivals";
import { getHomepageProducts } from "@/lib/homepage-products";
import { getActiveCmsSlides } from "@/lib/homepageSlides";

export const revalidate = 60;
```

- `components/index.ts` exports many modules unrelated to the homepage.

```ts
// components/index.ts:1-9, 32, 39, 42, 47
export { default as Header } from "./Header";
export { default as HeaderTop } from "./HeaderTop";
export { default as SearchInput } from "./SearchInput";
export { default as ProductItem } from "./ProductItem";
export { default as ProductsSection } from "./ProductsSection";
export { default as CartElement } from "./CartElement";
export { default as Hero } from "./Hero";
export { default as DashboardSidebar } from "./DashboardSidebar";
export { default as NotificationBell } from "./NotificationBell";
```

- `app/layout.tsx` globally imports `svgmap` CSS even though repository search
  only finds `svgmap/dist/svgMap.min.css` in this file. It also mounts several
  client wrappers around every route.

```tsx
// app/layout.tsx:3-12, 41-55
import "./globals.css";
import 'svgmap/dist/svgMap.min.css';
import SessionProvider from "@/utils/SessionProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Providers from "@/Providers";
import SessionTimeoutWrapper from "@/components/SessionTimeoutWrapper";
import { LanguageProvider } from "@/components/LanguageProvider";
import StyledComponentsRegistry from "@/lib/registry";
import { getNavigationData } from "@/lib/navigation";

const navigation = await getNavigationData();
...
<SessionProvider session={null}>
  <LanguageProvider>
    <SessionTimeoutWrapper />
    <Header categories={navigation.categories} collectorSets={navigation.collectorSets} />
    <Providers>{children}</Providers>
    <Footer />
  </LanguageProvider>
</SessionProvider>
```

- `components/Header.tsx` is a client component that mixes static nav markup,
  search state, route state, auth session state, cart/wishlist stores, and
  notifications in one hydration boundary.

```tsx
// components/Header.tsx:1-24
"use client";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useProductStore } from "@/app/_zustand/store";
import { useWishlistStore } from "@/app/_zustand/wishlistStore";
import NotificationBell from "./NotificationBell";

// components/Header.tsx:515-524
const pathname = usePathname();
const router = useRouter();
const { status } = useSession();
const cartQuantity = useProductStore((state) => state.allQuantity);
const wishQuantity = useWishlistStore((state) => state.wishQuantity);
const [mobileOpen, setMobileOpen] = useState(false);
const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
const [mobileMenu, setMobileMenu] = useState<OpenMenu>(null);
const [searchOpen, setSearchOpen] = useState(false);
const [searchTerm, setSearchTerm] = useState("");
```

- `components/NotificationBell.tsx` and `hooks/useNotifications.ts` already
  gate SSE behind an authenticated session; keep that behavior.

```ts
// hooks/useNotifications.ts:190-227
export const useUnreadCount = () => {
  const { unreadCount, setUnreadCount } = useNotificationStore();
  const { data: session } = useSession();
  ...
  useEffect(() => {
    if (!session?.user?.id) return;
    const eventSource = new EventSource("/api/notifications/stream");
    ...
    return () => eventSource.close();
  }, [fetchUnreadCount, session?.user?.id, setUnreadCount]);
```

- `lib/homepage-products.ts` fetches more fields than the homepage cards appear
  to use. Product cards use `id`, `slug`, `title`, `price`, `mainImage`,
  `inStock`, and sorting uses `isCollector`. `FeaturedSeries` also needs the
  first product `mainImage/title` and `variantImages`.

```ts
// lib/homepage-products.ts:57-101
const products = await prisma.product.findMany({
  where: PUBLIC_STOREFRONT_PRODUCT_WHERE,
  take: 8,
  select: {
    id: true,
    slug: true,
    title: true,
    price: true,
    rating: true,
    description: true,
    mainImage: true,
    images: true,
    manufacturer: true,
    categoryId: true,
    inStock: true,
    setId: true,
    setSlotNumber: true,
    isCollector: true,
    isBlindBox: true,
    isVisible: true,
    blindBoxSetId: true,
    category: { select: { name: true } },
    blindBoxSet: { ... },
  },
});
```

- Project conventions from `AGENTS.md`: Next.js App Router, TypeScript,
  styled-components, Vietnamese UI strings, MySQL/Prisma, npm scripts. Keep the
  dark storefront UI unchanged.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Generate Prisma client | `npm run db:generate` | exit 0 |
| Typecheck | `npm run type-check` | exit 0, no TypeScript errors |
| Unit tests | `npx vitest run --exclude "tests/otp/**"` | exit 0 |
| Production build | `npm run build` | exit 0; `/` remains Static or ISR |
| Bundle/resource spot check | see Step 1 script | lower or equal JS/CSS total after changes |

## Scope

**In scope**:
- `app/page.tsx`
- `app/layout.tsx`
- `next.config.mjs`
- `lib/homepage-products.ts`
- `components/Header.tsx`
- new header subcomponents under `components/` if needed
- `components/NotificationBell.tsx`
- `hooks/useNotifications.ts`
- homepage product-card files only if needed for narrower product types:
  `components/ProductItem.tsx`, `components/NewArrivals.tsx`,
  `components/ProductsSection.tsx`, `components/FeaturedProductsGrid.tsx`,
  `components/FeaturedSeries.tsx`
- image assets under `public/images/homepage-slider/` and
  `public/images/products/` only if preserving paths and visual appearance

**Out of scope**:
- Database schema or Prisma migrations
- API behavior changes
- Admin product/order/redemption logic
- Any UI redesign, text rewrite, layout change, or visible visual change
- Auth/session semantics
- Cart/wishlist store behavior

## Git workflow

- Branch: `advisor/007-homepage-performance`
- Commit message style in recent history is imperative sentence case, e.g.
  `Remove registration OTP requirement`. Use a similar message.
- Do not push or open a PR unless the operator instructs it.

## Steps

### Step 1: Capture a local and production baseline

Run the verification commands before editing:

```bash
npm run db:generate
npm run type-check
npx vitest run --exclude "tests/otp/**"
```

Then run a production resource snapshot:

```bash
node - <<'NODE'
const https = require("https");
const root = "https://khunglongshop-kappa.vercel.app/";
function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      const chunks = [];
      res.on("data", (d) => chunks.push(d));
      res.on("end", () => resolve({
        url,
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks),
      }));
    }).on("error", reject);
  });
}
(async () => {
  const page = await get(root);
  const html = page.body.toString("utf8");
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)]
    .map((m) => new URL(m[1], root).href);
  const css = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)]
    .map((m) => new URL(m[1], root).href);
  let total = 0;
  for (const url of [...scripts, ...css]) {
    const res = await get(url, { "Accept-Encoding": "br,gzip" });
    total += res.body.length;
  }
  console.log({
    htmlBytes: page.body.length,
    jsCssCompressedBytes: total,
    scriptCount: scripts.length,
    cssCount: css.length,
    cache: page.headers["x-vercel-cache"],
  });
})();
NODE
```

**Verify**: commands exit 0. Record the snapshot numbers in your final report.

### Step 2: Replace homepage barrel imports with direct imports

In `app/page.tsx`, replace:

```ts
import { Hero, ProductsSection } from "@/components";
```

with direct file imports:

```ts
import Hero from "@/components/Hero";
import ProductsSection from "@/components/ProductsSection";
```

Do not change rendered JSX.

**Verify**:

```bash
npm run type-check
```

Expected: exit 0.

### Step 3: Remove unused global `svgmap` CSS from the root layout

Repository search currently shows the only reference to `svgmap/dist/svgMap.min.css`
is `app/layout.tsx`. Remove this import from `app/layout.tsx`:

```ts
import 'svgmap/dist/svgMap.min.css';
```

Do not remove the `svgmap` dependency in this plan.

**Verify**:

```bash
rg -n "svgMap|min.css|svgmap" app components lib server
npm run type-check
```

Expected: no remaining `svgmap/dist/svgMap.min.css` import in app code, and
typecheck exits 0.

### Step 4: Improve optimized-image caching

In `next.config.mjs`, add a conservative `images.minimumCacheTTL` so generated
`/_next/image` AVIF/WebP variants are reusable by Vercel/Next instead of being
revalidated too aggressively. Keep existing `formats` and `remotePatterns`.

Target shape:

```js
images: {
  formats: ["image/avif", "image/webp"],
  minimumCacheTTL: 60 * 60 * 24 * 30,
  remotePatterns: [
    // existing patterns unchanged
  ],
},
```

**Verify**:

```bash
npm run type-check
```

Expected: exit 0.

### Step 5: Narrow homepage product payload without changing cards

In `lib/homepage-products.ts`, remove fields from the `select` only when they
are not used by the homepage components listed in Scope. Keep enough fields for:

- `ProductItem`: `id`, `slug`, `title`, `price`, `mainImage`, `inStock`
- `ProductsSection.sortFeatured`: `isCollector`
- `FeaturedSeries`: first product `mainImage`, `title`, plus `variantImages`
- `getHomepageVariantImages`: `images` and active `blindBoxSet.poolVersions.entries.product.mainImage`

Candidate fields to remove if no scoped homepage component uses them:

```ts
rating: true,
description: true,
manufacturer: true,
categoryId: true,
setId: true,
setSlotNumber: true,
isBlindBox: true,
isVisible: true,
blindBoxSetId: true,
category: { select: { name: true } },
```

If TypeScript complains because the project-wide `Product` type requires fields
that the homepage no longer selects, introduce a local `HomepageProduct` type
in `lib/homepage-products.ts` and update only the scoped homepage component
props to accept that narrower type. Do not weaken types with `any`.

**Verify**:

```bash
npm run type-check
npx vitest run --exclude "tests/otp/**"
```

Expected: both exit 0.

### Step 6: Split the header client boundary only if it can be done without visual drift

This is the highest-risk step. Attempt it only after Steps 2-5 are green.

Goal: keep static header markup server-rendered where practical, and isolate
client-only behavior into smaller components. A safe target is:

- Keep `Header` props and visual DOM structure equivalent.
- Move route/search/menu/cart/wishlist/auth/notification interactivity into one
  or more small client components.
- Keep `NotificationBell` mounted only for authenticated users. The current
  `useUnreadCount` hook already opens `EventSource("/api/notifications/stream")`
  only when `session?.user?.id` exists; preserve that exact guard.

Acceptable fallback: if splitting the header would require a large rewrite of
styled-components or materially changes markup, STOP and leave this as a
separate future plan. Steps 2-5 are still valuable and should remain.

**Verify**:

```bash
npm run type-check
npx vitest run --exclude "tests/otp/**"
```

Expected: both exit 0.

Manual smoke after build:

- Desktop header still shows logo, dropdowns, search, account, heart, bag.
- Mobile menu still opens/closes.
- Search still routes to `/search?q=...`.
- Logged-out users do not open `/api/notifications/stream`.
- Logged-in users still see notification behavior.

### Step 7: Audit large image assets, but preserve paths

List largest images:

```powershell
Get-ChildItem -LiteralPath public/images -Recurse -File |
  Sort-Object Length -Descending |
  Select-Object -First 30 @{n='MB';e={[math]::Round($_.Length/1MB,2)}}, FullName
```

If image tooling is available, recompress only obvious oversized homepage slider
and product images while preserving the same file paths. Do not change DB image
paths and do not rename images in this plan. If tooling is not already available
or visual quality cannot be checked, skip recompression and report the image
list as a follow-up.

**Verify**:

```powershell
Get-ChildItem -LiteralPath public/images -Recurse -File |
  Sort-Object Length -Descending |
  Select-Object -First 10 @{n='MB';e={[math]::Round($_.Length/1MB,2)}}, FullName
```

Expected: either large image sizes are reduced with identical paths, or the
executor explicitly reports that image recompression was skipped.

### Step 8: Build and compare

Run:

```bash
npm run build
npm run type-check
npx vitest run --exclude "tests/otp/**"
```

In the build route table, confirm `/` is still Static or ISR, not Dynamic.

After deploying, rerun the Step 1 production snapshot against the new deployment
URL and compare:

- `jsCssCompressedBytes` should be lower or no worse.
- `scriptCount` should be lower or no worse.
- `/` should still return 200.
- Header/cart/wishlist/language/session behavior should pass manual smoke.

## Test plan

No new unit tests are required unless component prop types are changed in Step 5.
If types are changed, add or update focused tests only where existing tests
already cover homepage catalog helpers. Prefer existing patterns in
`tests/unit/publicCatalog.test.ts`.

Required verification:

```bash
npm run type-check
npx vitest run --exclude "tests/otp/**"
npm run build
```

Manual verification:

- Homepage visually matches before/after on desktop and mobile.
- Header dropdowns, mobile nav, search, cart count, wishlist count, language,
  and session-specific account state still work.
- Logged-out homepage does not create an SSE connection.
- Logged-in notification bell still works.

## Done criteria

- [ ] `app/page.tsx` imports `Hero` and `ProductsSection` directly, not from `@/components`
- [ ] `app/layout.tsx` no longer imports `svgmap/dist/svgMap.min.css`
- [ ] `next.config.mjs` sets `images.minimumCacheTTL`
- [ ] Homepage product query no longer selects fields unused by scoped homepage components
- [ ] `npm run type-check` exits 0
- [ ] `npx vitest run --exclude "tests/otp/**"` exits 0
- [ ] `npm run build` exits 0 and `/` remains Static/ISR
- [ ] Production resource snapshot for `/` is lower or no worse for JS/CSS compressed bytes
- [ ] No visible UI changes on homepage/header

## STOP conditions

Stop and report back if:

- In-scope files drift from the excerpts above before implementation starts.
- Removing `svgmap` CSS breaks a visible map or admin page.
- Narrowing the homepage product query requires changing public API response
  shapes or Prisma schema.
- Splitting the header requires changing visible markup/layout, search behavior,
  cart/wishlist behavior, language behavior, or session behavior.
- `NotificationBell` or `useUnreadCount` would open SSE for logged-out users.
- Verification fails twice after a reasonable fix attempt.
- The fix requires touching files outside Scope.

## Maintenance notes

- Keep future homepage imports direct. Avoid importing from `@/components` in
  route files that care about bundle size.
- If a future component needs `svgmap`, import its CSS in that route/component
  instead of the root layout.
- If product cards start showing more fields later, update the
  `HomepageProduct` type and query select together.
- Consider adding a bundle analyzer or CI budget as a follow-up plan once this
  first reduction lands.
