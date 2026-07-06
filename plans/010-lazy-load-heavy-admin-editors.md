# 010 - Lazy-load heavy admin route editors

**Written against:** `1b1a769`
**Scope:** `app/(dashboard)/admin/products/**`, `app/(dashboard)/admin/collector-sets/**`, `components/AdminProductForm.tsx`, `components/admin/ImageManager.tsx`, `components/admin/BlindBoxPoolEditor.tsx`, `components/admin/CollectorSetMetadataForm.tsx`, `components/admin/ImageUploadDropzone.tsx`
**Out of scope:** `/admin` dashboard root shell split, public routes, API routes, database schema
**Executor model:** any Next.js App Router executor

---

## Background

This plan is secondary for the `/admin` root metric, but important for the admin area after navigation.

Heavy admin editors are currently loaded synchronously on their routes:

- `app/(dashboard)/admin/products/[id]/page.tsx:1` is a full client page.
- `app/(dashboard)/admin/products/[id]/page.tsx:3` imports `AdminProductForm`.
- `components/AdminProductForm.tsx:4` imports `ImageManager`.
- `components/admin/ImageManager.tsx:1` is client-side and uses `styled-components` at `components/admin/ImageManager.tsx:5`.
- `app/(dashboard)/admin/collector-sets/[id]/page.tsx:4` imports `BlindBoxPoolEditor`.
- `app/(dashboard)/admin/collector-sets/[id]/page.tsx:68` renders `BlindBoxPoolEditor` directly.
- `components/admin/ImageUploadDropzone.tsx:6` imports `react-icons/fa6`.

The current source search found no `next/dynamic` usage in admin routes for these heavy widgets.

---

## Pre-flight

```bash
git rev-parse HEAD
npm run type-check
npx vitest run --exclude "tests/otp/**"
```

Optional with live database:

```bash
npm run build
```

Record current route chunk sizes for:

- `/admin/products/[id]`
- `/admin/products/new`
- `/admin/collector-sets/[id]`
- `/admin/homepage-slider`

---

## Steps

### Step 1 - Dynamically import image management UI

File: `components/AdminProductForm.tsx`

Replace the static `ImageManager` import with `next/dynamic`:

```tsx
import dynamic from "next/dynamic";

const ImageManager = dynamic(() => import("@/components/admin/ImageManager"), {
  ssr: false,
  loading: () => <div className="min-h-[180px]" />,
});
```

Keep props and behavior unchanged.

**STOP condition:** If the placeholder causes a visible layout jump, match the current image manager dimensions more closely.

### Step 2 - Dynamically import blind-box pool editor

File: `app/(dashboard)/admin/collector-sets/[id]/page.tsx`

Replace the static `BlindBoxPoolEditor` import with `next/dynamic`:

```tsx
import dynamic from "next/dynamic";

const BlindBoxPoolEditor = dynamic(() => import("@/components/admin/BlindBoxPoolEditor"), {
  ssr: false,
  loading: () => <div className="min-h-[220px]" />,
});
```

Keep it rendered in the same location.

### Step 3 - Convert product edit pages back toward server-first if feasible

Files:

- `app/(dashboard)/admin/products/[id]/page.tsx`
- `app/(dashboard)/admin/products/new/page.tsx`

These pages are currently full client pages. If feasible, split them into:

- a server page that loads initial product/reference data
- a client form island for editing/saving

If this is too risky for one pass, leave this as a follow-up and only complete Steps 1-2.

### Step 4 - Remove unnecessary icon imports from upload-only controls

File: `components/admin/ImageUploadDropzone.tsx`

Replace `react-icons/fa6` usage with tiny local SVG components or CSS-only affordances if the UI can remain visually equivalent.

Do not change upload behavior.

### Step 5 - Verify admin routes

```bash
npm run type-check
npx vitest run --exclude "tests/otp/**"
```

Manual smoke:

- `/admin/products/[id]`: images render, main image change still uploads and persists.
- `/admin/products/new`: image upload still works.
- `/admin/collector-sets/[id]`: metadata form renders immediately, pool editor loads below it, save/update behavior still works.

---

## Done Criteria

- [ ] `ImageManager` is no longer in the initial product form client chunk.
- [ ] `BlindBoxPoolEditor` is no longer in the initial collector set page chunk.
- [ ] Upload/edit behavior still works.
- [ ] No layout jump while lazy components load.
- [ ] `npm run type-check` passes.
- [ ] `npx vitest run --exclude "tests/otp/**"` passes.
