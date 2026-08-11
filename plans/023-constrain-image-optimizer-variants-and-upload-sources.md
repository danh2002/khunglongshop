# Plan 023: Constrain Vercel image variants and normalize Blob upload sources

> **Executor instructions:** Follow this plan step by step. Run every verification command. If a STOP condition occurs, stop and report; do not improvise. When complete, update this plan's status in `plans/README.md`.
>
> **Drift check (run first):** `git diff --stat 2b604a5..HEAD -- next.config.mjs app/api/admin/upload/route.ts lib/publicCatalog.ts components app tests/unit package.json package-lock.json`

## Status

- **Priority:** P1
- **Effort:** M
- **Risk:** MED
- **Depends on:** 022 (deploy first, then measure image-request savings separately)
- **Category:** perf
- **Planned at:** commit `2b604a5`, 2026-08-11
- **Vercel resources targeted:** Image Optimization Cache Writes, Image Optimization Transformations, Blob Data Transfer, Fast Origin Transfer

## Why this matters

Vercel reports 145K/100K image-optimization cache writes, 5K/5K transformations, and 10GB/10GB Blob transfer. Blob URLs are explicitly allowed as remote `next/image` inputs and are rendered in product cards, the home carousel, account views, and admin previews. The current configuration uses Next.js's broad default width sets, every uploaded JPEG/PNG may be up to 5MB and is stored unchanged, and there is no image quality/size policy. Restricting generated widths to the rendered sizes and normalizing new uploads reduces the number of cache keys, optimizer work, and bytes fetched from Blob while preserving responsive image behavior.

## Current state

```js
// next.config.mjs:8-29
images: {
  formats: ['image/avif', 'image/webp'],
  minimumCacheTTL: 60 * 60 * 24 * 30,
  unoptimized: process.env.NODE_ENV === "development",
  remotePatterns: [
    { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
  ],
},
```

```ts
// app/api/admin/upload/route.ts:9-16, 73-90
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
...
const fileBuffer = Buffer.from(await file.arrayBuffer());
const blob = await put(`images/${folder}/${filename}`, fileBuffer, {
  access: "public",
  contentType: file.type,
  cacheControlMaxAge: BLOB_CACHE_MAX_AGE,
});
```

```tsx
// components/ProductItem.tsx:210-218
<Image
  src={normalizeCatalogImage(product.mainImage)}
  fill
  sizes={compact ? "220px" : "(max-width: 768px) 50vw, 25vw"}
  priority={imagePriority}
  loading={imagePriority ? "eager" : "lazy"}
/>
```

The audited image calls generally already have a `sizes` prop; do not rewrite all image components or mark more images `priority`. Existing plans 007 and 012 already cover homepage/shop card priority and client-boundary work.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Add only needed image processor | `npm install sharp` | exit 0; only package manifest/lock changes |
| Type check | `npm run type-check` | exit 0 |
| Tests | `npx vitest run --exclude "tests/otp/**"` | exit 0 |
| Build | `npm run build` | exit 0 with a reachable `DATABASE_URL` |
| Image scan | `rg -n '<Image|sizes=|priority=' app components` | all production `Image` calls remain reviewed |

## Scope

**In scope:**

- `next.config.mjs`
- `app/api/admin/upload/route.ts`
- a new narrow server-only image-normalization helper under `lib/`
- `package.json` and `package-lock.json` for `sharp` only
- focused tests under `tests/unit/`
- `plans/README.md` status row only

**Out of scope:**

- Product/database schema, image URL fields, and a backfill/rewrite of existing Blob objects.
- `next/image` call sites, their `sizes`, and `priority` behavior.
- GIF animation conversion, direct Blob URLs, an external CDN, or Vercel plan changes.
- Deleting old Blob files; no deletion occurs in this plan.

## Steps

### Step 1: Capture a production baseline and turn rendered sizes into a finite width policy

Before changing configuration, record Vercel Usage counts and a browser network export for `/`, `/shop`, one product detail, and an account collection page. From the source, keep only widths needed by current `sizes` values: fixed icon/thumbnail widths (24, 38, 48, 52, 56, 60, 72, 80, 120, 180, 220, 340, 360) and a small responsive device-width set sufficient for the `100vw`, `50vw`, `25vw`, and product-detail hero cases.

Choose the final `images.imageSizes` and `images.deviceSizes` using Next.js's configuration rules: every `imageSizes` value must be smaller than the smallest `deviceSizes` value. Document the selected values in a nearby comment and add a test that prevents accidental return to broad defaults.

**Verify:** the planned values map each existing `sizes` declaration to a width no smaller than its rendered CSS width in the representative browser captures.

### Step 2: Configure bounded widths and an explicit quality policy

Update `next.config.mjs` under `images` with the bounded `deviceSizes`, `imageSizes`, and a single reviewed quality policy compatible with Next.js 15. Do not broaden `remotePatterns`; keep the existing exact Blob host suffix and `placehold.co`/localhost entries unchanged.

Choose quality by visual comparison, not assumption. Start with a lower quality for catalog/card media only if it can be expressed without changing source URLs or generating a second quality key for the same route. If a global quality change makes hero imagery visibly unacceptable, retain the current quality and report that outcome; do not introduce multiple arbitrary per-component qualities.

**Verify:** `npm run build` -> exits 0 with a reachable approved database, and no Next.js invalid-image-config error is emitted.

### Step 3: Normalize new JPEG/PNG uploads before storing them in Blob

Install `sharp` and add a server-only helper, for example `lib/imageUploadNormalization.ts`. For `image/jpeg` and `image/png` uploads:

- read metadata safely;
- rotate according to EXIF;
- resize without enlargement to a documented maximum appropriate to its folder (`products` square-card source vs. wide `homepage-slider` source);
- encode to WebP with a reviewed quality;
- return the output bytes, `image/webp`, and a `.webp` filename extension.

Keep already-WebP uploads only if their dimensions and byte size meet the same policy; otherwise normalize them. Preserve animated GIF behavior: do not silently flatten or change it. Either retain a GIF under the current size cap with a documented warning, or reject it with the existing typed API error shape; choose only after confirming actual admin requirements.

Use the helper immediately before `put` and the local-development `writeFile` branch, so both storage modes receive identical normalized bytes and content type. Keep the public Blob cache lifetime at 30 days and retain `access: "public"`.

**Verify:** add a focused unit test using generated in-memory JPEG/PNG fixtures. It must prove output is WebP, does not exceed the configured dimensions, preserves no-upscale behavior, and the returned content type/extension agree. Run `npx vitest run tests/unit/<image-normalization-test>.test.ts` -> exit 0.

### Step 4: Keep upload API behavior stable

Update `app/api/admin/upload/route.ts` to use the helper without changing its success JSON shape: it must still return exactly `{ url: string }`. Retain authorization, allowed-type validation, max input size, sanitized names, folders, error response shape, and Node runtime. Add a focused route/source test that checks the helper is used for both Blob and local branches, while no Blob token value is read or asserted.

**Verify:** `npm run type-check` -> exit 0.

### Step 5: Deploy, verify visual quality, and measure future-only savings

Run the complete verification table, deploy normally, upload one representative product image and one slider image in an approved non-production environment, and inspect their Blob content type/dimensions. Check `/`, `/shop`, a product detail page, and admin image previews on mobile and desktop. Record Vercel resource readings before deployment, after cache warm-up, and after a comparable traffic interval. Existing Blob objects and previously created optimizer cache keys remain, so judge the reduction by the growth rate rather than expecting counters to fall.

**Verify:** the deployed image requests use only the configured `w` values and all smoke-test images render without aspect-ratio, EXIF-orientation, or animation regressions.

## Test plan

- Unit tests for JPEG/PNG orientation, resize ceiling, WebP output/content-type filename agreement, and no enlargement.
- Configuration/source test that bounded image sizes are present and remote host scope is not broadened.
- Manual browser checks for every representative image surface listed in Step 5.
- Vercel dashboard checks: cache-write and transformation growth is lower after cache warm-up; Blob and Fast Origin transfer growth does not regress.

## Done criteria

- [ ] `next.config.mjs` has reviewed finite `deviceSizes` and `imageSizes` aligned with current rendered sizes.
- [ ] No new remote image host is allowed.
- [ ] New JPEG/PNG uploads are orientation-corrected, size-capped, and stored as WebP in both Blob and local-development paths.
- [ ] Animated GIF handling is explicit and covered by a test or documented rejection response.
- [ ] Upload success response remains `{ url: string }`.
- [ ] `npm run type-check` exits 0.
- [ ] `npx vitest run --exclude "tests/otp/**"` exits 0.
- [ ] `npm run build` exits 0 with an approved reachable database, or its environment prerequisite is recorded.
- [ ] Production usage is compared by post-deploy growth rate, not historical totals.

## STOP conditions

- Next.js 15 rejects the chosen `images` configuration or the configured width values make images smaller than the measured rendered slot.
- `sharp` cannot run in the Vercel Node runtime/package setup without a platform-specific workaround or a major dependency change.
- A required animated GIF would be flattened, or normalization requires a database schema/image-URL migration.
- Visual checks show an unacceptable loss of product/hero fidelity at the selected output sizes/quality.
- Metrics show cache-write or Blob-transfer growth increases after a comparable cache-warm traffic sample.

## Maintenance notes

New image layouts must declare `sizes` and be added to the width-policy review; otherwise they can reintroduce cache-key proliferation or oversized transfer. This plan intentionally does not migrate historical originals. If their Blob transfer remains the dominant source after this change, prepare a separately approved, reversible backfill plan with an inventory and rollback strategy.
