# Issue #1 Comment: CMS Homepage Slider

Sources:

- Issue: https://github.com/danh2002/khunglongshop/issues/1
- Comment: https://github.com/danh2002/khunglongshop/issues/1#issuecomment-4688964545
- Related autoplay comment: https://github.com/danh2002/khunglongshop/issues/1#issuecomment-4688351387

## Overview

The latest issue comment requests:

> Tôi muốn slider có thể thêm thông tin hình ảnh ở trong CMS, và cứ 1s là tự động chuyển sang ảnh khác

The homepage currently renders `components/Hero.tsx` from `app/page.tsx`. The current slide data is derived from the public Vanie blind-box product plus variant/gallery images returned by `lib/homepage-products.ts`. That is useful as a fallback, but it does not satisfy the CMS requirement because admins cannot manage homepage-specific slide title, subtitle, CTA, link, order, or visibility independently from product data.

This spec defines a CMS-managed homepage slider with a one-second autoplay interval.

## Goals

- Allow admins to create, edit, reorder, enable, disable, and delete homepage slider slides from CMS.
- Store each slide's image and display information independently from product gallery images.
- Render CMS-managed slides on the homepage hero.
- Auto-advance the homepage slider every `1000ms` when at least two active slides exist.
- Preserve accessible manual controls and reduced-motion behavior.
- Keep the current dark/orange homepage visual direction.
- Trigger immediate homepage revalidation after CMS slider mutations.

## Non-Goals

- No checkout, cart, blind-box allocation, redemption code, order, or rarity logic changes.
- No change to public product visibility rules.
- No replacement of the whole homepage design.
- No external carousel library.
- No drag-and-drop requirement for v1; explicit move up/down or numeric order is enough.
- No multilingual CMS fields unless a future i18n issue requests it.

## Current Codebase Findings

- `app/page.tsx` calls `getHomepageProducts()` and renders `<Hero products={products} variantImages={variantImages} />`.
- `components/Hero.tsx` currently derives slides from `featured.mainImage` and `variantImages`, capped at five images.
- `hooks/useCarouselAutoplay.ts` owns timer, reduced-motion, visibility, pause, restart, and cleanup behavior.
- `lib/homepage-products.ts` currently loads the public blind-box product and variant images from active pool entries plus product gallery fallback.
- Product CMS already supports image upload through `components/admin/ImageManager.tsx` and `app/api/admin/upload/route.ts`.
- Admin pages live under `app/(dashboard)/admin/*`, and admin API routes live under `app/api/admin/*`.
- Admin auth is enforced with `requireAdminApi()` for API routes and existing admin dashboard access patterns.
- `Product.images` is a JSON string gallery field with a max of eight images. It should not become the long-term homepage slider data model because homepage slides need independent copy, CTA, order, and visibility.
- `app/page.tsx` currently exports `revalidate = 60`; this remains an ISR fallback only, not the CMS mutation freshness mechanism.

## Functional Requirements

### FR-1: CMS Slide Data

Admins must be able to manage homepage slider slides in CMS.

Each slide must support:

- `imageUrl`: required local image path under `/images/...`.
- `title`: required display title.
- `subtitle`: optional supporting text.
- `eyebrow`: optional small label, for example `Ra mắt 2025`.
- `ctaLabel`: optional button label.
- `ctaUrl`: optional internal link target.
- `altText`: required image alt text.
- `sortOrder`: required integer order.
- `isActive`: required boolean visibility flag.

Rules:

- Only active slides appear on the public homepage.
- Slides render in ascending `sortOrder`, then ascending `id` for deterministic fallback.
- Empty or `null` `ctaLabel` and `ctaUrl` mean no CTA button for that slide.
- If only one of `ctaLabel` or `ctaUrl` is provided, validation must reject the request.
- CTA links are internal paths only.
- `ctaUrl` must start with `/`.
- `ctaUrl` must not start with `//`.
- `ctaUrl` must not contain `javascript:`.
- `ctaUrl` must not be an external URL and must not start with `http://` or `https://`.
- Empty string is accepted for `ctaUrl` and normalized to `null`, which means no CTA.
- `imageUrl` must use the same local image path policy as product image uploads.
- `altText` must not be empty because slides are image-heavy content.
- Duplicate `sortOrder` values are allowed.
- Duplicate `sortOrder` ties are sorted by `id asc` as a deterministic fallback.
- Admin UI shows the current order value and does not auto-normalize duplicate sort values.

### FR-2: Admin CMS UI

Add a new admin section for homepage slider management.

Required UI:

- Admin navigation item: `Slider trang chủ`.
- List page: `/admin/homepage-slider`.
- Create page or inline create form.
- Edit existing slide.
- Upload/select slide image using the existing admin upload endpoint/pattern.
- Store uploaded homepage slider assets under `/images/homepage-slider`.
- Preview slide thumbnail.
- Toggle active/inactive.
- Edit order using numeric `sortOrder` or move up/down controls.
- Delete a slide after confirmation.
- Deleting a slide hard-deletes the database row only.
- Uploaded image files are retained on disk; no filesystem cleanup is part of this issue.

Validation UX:

- Show field errors returned by the API.
- Disable save while uploading or submitting.
- Preserve entered values if validation fails.
- Use readable UTF-8 Vietnamese copy.

### FR-3: Admin API

Add admin-only API routes for slide management.

Required routes:

```ts
GET    /api/admin/homepage-slider
POST   /api/admin/homepage-slider
GET    /api/admin/homepage-slider/:id
PATCH  /api/admin/homepage-slider/:id
DELETE /api/admin/homepage-slider/:id
```

Rules:

- All routes require admin authorization via `requireAdminApi()`.
- `GET /api/admin/homepage-slider` returns all slides, including inactive slides, ordered by `sortOrder asc, id asc`.
- Public homepage data must not use admin routes.
- Validation failures return status `400` with the existing admin error shape.
- Missing slide returns `404 SLIDE_NOT_FOUND`.
- Delete is allowed even if the slide is active because slides are independent marketing content.
- `POST`, `PATCH`, and `DELETE` must call `revalidatePath("/")` after successful mutation.
- Homepage `revalidate = 60` is ISR fallback only; CMS mutations must trigger immediate revalidation.
- Hard delete removes the database row only; uploaded image files are retained on disk.
- No filesystem cleanup on delete is included in this issue.

### FR-4: Public Homepage Data

The homepage must load CMS-managed active slides for `Hero` through one concrete public data contract.

Add `getActiveCmsSlides(): Promise<HomepageSlide[]>` in `lib/homepageSlides.ts`.

Public slide type:

```ts
type HomepageSlide = {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  altText: string;
  sortOrder: number;
  isActive: boolean;
};
```

Rules:

- Public query reads only active slides.
- Public query includes `eyebrow` and `altText` so CMS-configured slide copy and image accessibility text are preserved.
- Public query orders by `sortOrder asc, id asc`.
- Public query limits slides to a safe maximum, recommended `10`.
- `app/page.tsx` calls `getHomepageProducts()` and `getActiveCmsSlides()` in parallel.
- If `getActiveCmsSlides()` returns at least one slide, `Hero` receives `slides={cmsSlides}`.
- If `getActiveCmsSlides()` returns an empty array, `Hero` receives `slides={null}` and falls back to product-derived slides.
- If `getActiveCmsSlides()` throws, log the error and silently pass `slides={null}` so product-derived slides remain visible.
- `Hero.tsx` receives `slides: HomepageSlide[] | null`; `null` means use product fallback.
- Fallback behavior must be clearly marked as temporary compatibility behavior.

### FR-5: One-Second Autoplay

Homepage slider autoplay interval must be `1000ms`.

Rules:

- Export or define `HERO_AUTOPLAY_INTERVAL_MS = 1000`.
- Autoplay starts only when there are at least two slides.
- After the last slide, autoplay wraps to the first slide.
- Manual next/previous/dot controls continue to work.
- Manual navigation resets the timer.
- Autoplay must not run when `prefers-reduced-motion: reduce` is active.
- Autoplay pauses while the tab is hidden.
- Autoplay resumes when the tab becomes visible.
- Autoplay must not be paused just because the mouse is resting over the general hero image area.
- Hover pause may apply to carousel controls only, so users can interact with arrows/dots without slide movement.
- Carousel must include a visible pause/play toggle button.
- Pause/play toggle is positioned bottom-right of the hero, above the dots.
- Clicking pause stops autoplay.
- Clicking play resumes autoplay when no other pause source is active.
- Reduced-motion users see the button in paused state by default.
- Pause button aria-label: `Tạm dừng tự động chuyển slide`.
- Play button aria-label: `Tiếp tục tự động chuyển slide`.

### FR-6: Hero Rendering

`Hero` must support CMS slide objects without losing existing product fallback.

Recommended public prop shape:

```ts
type HomepageHeroSlide = {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  altText: string;
};

type HeroProps = {
  slides?: HomepageHeroSlide[] | null;
  products?: Product[];
  variantImages?: string[];
};
```

Rules:

- Prefer `slides` when provided and non-empty.
- Keep `products` and `variantImages` only as fallback compatibility input.
- Normalize image paths with the existing image normalization helper or equivalent.
- The CTA button renders from slide-specific `ctaLabel` and `ctaUrl`.
- If a slide has no CTA, no empty link is rendered.
- Active dot continues to expose a current/selected state.
- Non-active slides remain `aria-hidden`.

### FR-7: Accessibility

The slider must stay accessible despite the faster interval.

Rules:

- Keep `aria-roledescription="carousel"`.
- Keep readable carousel label: `Sản phẩm nổi bật`.
- Each dot uses `aria-label="Xem slide N"`.
- Active dot uses `aria-current="true"` or equivalent.
- Previous arrow label: `Slide trước`.
- Next arrow label: `Slide tiếp theo`.
- Reduced-motion users must not get one-second automatic movement.
- Keyboard focus inside controls pauses autoplay until focus leaves the hero controls/container.

## Data Model

Add a new Prisma model:

```prisma
model HomepageSliderSlide {
  id        String   @id @default(cuid())
  imageUrl  String
  title     String
  subtitle  String?
  eyebrow   String?
  ctaLabel  String?
  ctaUrl    String?
  altText   String
  sortOrder Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([isActive, sortOrder])
}
```

Migration notes:

- Requires Prisma migration.
- `HomepageSliderSlide` belongs to root `prisma/schema.prisma` only.
- The server folder schema does not receive this model.
- Run `prisma migrate dev` from the project root, not from the `server` folder.
- No existing product data should be migrated automatically.
- Optional seed may create initial slides from current Vanie product/variant images for local development only.
- Duplicate `sortOrder` values are allowed and resolved by `id asc`.

## API Contracts

### Admin Slide Payload

```ts
type AdminHomepageSliderSlide = {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  altText: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
```

### Create/Update Input

```ts
type HomepageSliderSlideInput = {
  imageUrl: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  altText: string;
  sortOrder: number;
  isActive: boolean;
};
```

### Public Slide Payload

```ts
type HomepageHeroSlide = {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  altText: string;
};
```

### Error Shape

Use the existing admin error style:

```ts
type AdminApiError = {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
};
```

New error codes:

- `VALIDATION_ERROR`
- `SLIDE_NOT_FOUND`
- `INTERNAL_ERROR`

## Architecture Decisions

### Decision 1: Create A Dedicated Slider Model

Use a new `HomepageSliderSlide` model instead of storing homepage slides inside `Product.images`.

Rationale:

- The issue asks for CMS-managed image information, not just product gallery images.
- Homepage slide copy/link/order/visibility are marketing content and should not mutate product catalog semantics.
- Dedicated model keeps homepage behavior simple and avoids coupling slider order to blind-box pool order.

Rejected alternative:

- Reuse `Product.images`.
- Rejected because `Product.images` has no per-image title, CTA, alt text, active state, or order contract beyond array position.

### Decision 2: Store Slider Uploads Separately

Store homepage slider images under `/images/homepage-slider` for v1.

Rationale:

- Marketing slider assets should be separate from product gallery images.
- A dedicated subfolder makes future cleanup and media auditing easier.
- The upload implementation can reuse the existing validation rules, but the destination for slider uploads is `/images/homepage-slider`.

### Decision 3: CMS Slides Override Product-Derived Slides

If CMS has active slides, they are the source of truth for `Hero`.

Rationale:

- Admin intent in CMS should be what visitors see.
- Product-derived slides remain useful as a deployment fallback but should not override configured marketing slides.

### Decision 4: One-Second Interval Is Confirmed

Set homepage autoplay to `1000ms` for this issue.

Rationale:

- The comment explicitly says: `cứ 1s là tự động chuyển sang ảnh khác`.
- Faster movement increases accessibility risk, so reduced-motion and focus/tab pause behavior remain mandatory.

### Decision 5: Add Visible Pause/Play Control

Add a visible pause/play toggle button to the hero.

Rationale:

- A one-second carousel is intentionally fast and needs an explicit user control.
- Reduced-motion users should see the carousel in paused state by default.
- The control makes autoplay state understandable without requiring hover behavior.

### Decision 6: Internal CTA Links Only

Allow only internal `ctaUrl` paths for v1.

Validation contract:

```ts
const nullableTextSchema = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional()
  .transform((value) => value ?? null);

const ctaUrlSchema = nullableTextSchema.refine(
  (value) =>
    value === null ||
    (value.startsWith("/") &&
      !value.startsWith("//") &&
      !value.toLowerCase().includes("javascript:") &&
      !value.toLowerCase().startsWith("http://") &&
      !value.toLowerCase().startsWith("https://")),
  "CTA URL phải là đường dẫn nội bộ"
);
```

Rules:

- Must start with `/`.
- Must not start with `//`.
- Must not contain `javascript:` in any casing.
- Must not start with `http://` or `https://` in any casing.
- Empty string and `null` are accepted and normalized to `null`, which means no CTA.
- `ctaLabel` uses the same empty string and `null` normalization.
- Validation rejects requests where exactly one of `ctaLabel` or `ctaUrl` is non-null.

### Decision 7: Immediate Homepage Revalidation

Call `revalidatePath("/")` after every successful create, update, and delete mutation.

Rationale:

- Admins expect saved CMS slider changes to be visible on the next homepage request.
- Homepage `revalidate = 60` remains an ISR fallback only.

### Decision 8: Root Prisma Schema Only

Add `HomepageSliderSlide` only to root `prisma/schema.prisma`.

Rationale:

- This feature is owned by the Next.js homepage/admin CMS path.
- The server folder schema does not need this model for Issue #1.

## Implementation Plan

1. Add Prisma model `HomepageSliderSlide` to root `prisma/schema.prisma`.
2. Run `prisma migrate dev` from the project root and regenerate Prisma client.
3. Add validation helper, for example `lib/adminHomepageSlider.ts`, with:
   - image path validation.
   - title/alt required validation.
   - CTA pair validation.
   - internal-only `ctaUrl` validation using `nullableTextSchema` and `ctaUrlSchema`.
   - sortOrder integer validation.
4. Add admin API list/create route:
   - `app/api/admin/homepage-slider/route.ts`.
5. Add admin API detail/update/delete route:
   - `app/api/admin/homepage-slider/[id]/route.ts`.
6. Call `revalidatePath("/")` after every successful create, update, and delete mutation.
7. Add upload support for `/images/homepage-slider`.
8. Add public data helper `lib/homepageSlides.ts` with `getActiveCmsSlides(): Promise<HomepageSlide[]>`.
9. Update `app/page.tsx` to call `getHomepageProducts()` and `getActiveCmsSlides()` in parallel.
10. Pass `slides={cmsSlides}` to `Hero` when CMS slides exist; otherwise pass `slides={null}`.
11. Update `Hero` props to prefer CMS `slides` and preserve product fallback.
12. Change `HERO_AUTOPLAY_INTERVAL_MS` to `1000`.
13. Add visible pause/play toggle above dots at bottom-right of the hero.
14. Ensure general hero hover does not pause autoplay; keep pause on controls/focus/tab/reduced-motion.
15. Add admin page `/admin/homepage-slider`.
16. Add create/edit form component, reusing the upload helper pattern from `ImageManager`.
17. Add admin sidebar navigation item `Slider trang chủ`.
18. Add tests for validation, admin API, revalidation, public slide selection, pause/play, and hero interval/wiring.
19. Run:
    - `npm run db:generate`.
    - Prisma migration validation.
    - `npm run type-check`.
    - focused Vitest tests.
    - `npm run lint`.
    - build if the local `.next` directory is not locked by a running dev server.

## Acceptance Criteria

- Admin can open `/admin/homepage-slider`.
- Admin can upload/select an image for a slide.
- Admin can enter title, subtitle, eyebrow, CTA label, CTA URL, alt text, order, and active state.
- Admin can create a slide.
- Admin can edit a slide.
- Admin can delete a slide after confirmation.
- Deleting a slide removes the database row but retains uploaded image files on disk.
- Admin can control display order.
- Duplicate order values are allowed and render deterministically by `id asc`.
- External CTA URLs are rejected with `VALIDATION_ERROR`.
- Inactive slides do not appear on the public homepage.
- Active slides appear on the homepage in configured order.
- If active CMS slides exist, the homepage hero uses them instead of product-derived slides.
- If no active CMS slides exist, the homepage falls back to current product-derived slides.
- If CMS slide loading fails, the error is logged and homepage silently falls back to product-derived slides.
- Slider automatically advances every one second when at least two slides exist.
- Slider wraps from last slide to first.
- Slider does not autoplay with zero or one slide.
- Slider does not autoplay when reduced motion is enabled.
- Slider pauses while the tab is hidden and resumes when visible.
- Slider is not paused merely because the mouse rests over the hero image area.
- Pause button stops autoplay; play button resumes it when no other pause source is active.
- Reduced-motion users see the pause/play button in paused state by default.
- Manual arrows and dots remain usable.
- Active dot exposes current state.
- After slide create/update/delete, homepage reflects the change on the next request.
- All visible/admin Vietnamese copy is readable UTF-8.

## Test Strategy

### Unit Tests

- `adminHomepageSliderSchema` accepts valid slide input.
- Schema rejects missing `imageUrl`.
- Schema rejects missing `title`.
- Schema rejects missing `altText`.
- Schema rejects external image URLs.
- Schema rejects CTA label without CTA URL.
- Schema rejects CTA URL without CTA label.
- External URL in `ctaUrl` is rejected with `VALIDATION_ERROR`.
- `javascript:` in `ctaUrl` is rejected with `VALIDATION_ERROR`.
- Empty string and `null` CTA fields are normalized to `null`.
- Schema normalizes legacy `images/...` paths to `/images/...` if this behavior is reused.
- Public slide mapper returns only active slides in `sortOrder asc, id asc`.
- Public slide mapper preserves `eyebrow` and `altText`.
- Public fallback uses product-derived slides only when active CMS slides are empty.
- Autoplay hook advances after `1000ms`.
- Autoplay does not start with one slide.
- Autoplay respects reduced motion and hidden tab pause.
- Pause button stops autoplay; play button resumes it.

### API Tests

- Non-admin requests to admin slider routes are rejected.
- `GET /api/admin/homepage-slider` returns active and inactive slides.
- `POST /api/admin/homepage-slider` creates a slide.
- `POST` validation errors return `400 VALIDATION_ERROR`.
- `GET /api/admin/homepage-slider/:id` returns one slide.
- `PATCH /api/admin/homepage-slider/:id` updates slide fields.
- `DELETE /api/admin/homepage-slider/:id` removes the slide.
- Missing slide returns `404 SLIDE_NOT_FOUND`.
- Create, update, and delete mutations call `revalidatePath("/")`.
- After slide create/update/delete, homepage reflects the change on the next request.

### UI/Static Tests

- Admin sidebar includes `Slider trang chủ`.
- Admin slider page includes create/edit controls.
- Hero defines `HERO_AUTOPLAY_INTERVAL_MS = 1000`.
- Hero accepts CMS `slides` prop.
- Hero still supports product fallback props.
- Dot buttons expose `aria-current`.
- Source contains readable Vietnamese labels: `Sản phẩm nổi bật`, `Slide trước`, `Slide tiếp theo`.

### Manual QA

- Create two active slides in CMS.
- Open homepage and confirm the first configured slide appears.
- Wait one second and confirm the next configured slide appears.
- Confirm slide order follows CMS order.
- Disable one slide and confirm it disappears from homepage.
- Delete a slide and confirm homepage updates after refresh/revalidation.
- Enable reduced motion and confirm autoplay stops.
- Switch away from the tab for longer than one second and confirm autoplay pauses.
- Confirm mouse resting over the hero image does not stop autoplay.
- Hover/click arrow or dots and confirm controls remain usable.

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| One-second autoplay feels too fast | Poor UX, especially for text-heavy slides | Keep copy short, preserve manual controls, respect reduced motion |
| CMS slides duplicate product data | Admin confusion | Label page as homepage marketing slider, not product gallery |
| Public homepage breaks when no CMS slides exist | Blank hero | Keep product-derived fallback |
| Upload assets become disorganized | Harder media management | Store slider uploads under `/images/homepage-slider` |
| Sort order conflicts | Unexpected display order | Order by `sortOrder asc, id asc` |
| Admin deletes all active slides | Homepage loses CMS slider | Product fallback remains active |
| Fast timer causes flaky tests | Hard-to-maintain suite | Use fake timers for autoplay tests |

## Closed Review Questions

1. CMS supports only homepage hero slides for this issue.
2. CTA links are internal paths only.
3. Slide images upload to `/images/homepage-slider`.
4. CMS mutations revalidate `/` immediately with `revalidatePath("/")`.
5. `HomepageSliderSlide` belongs to root `prisma/schema.prisma` only.

## Confirmed Decisions

- CMS-managed homepage slider is required.
- Autoplay interval is `1000ms`.
- Carousel includes a visible pause/play toggle.
- Active CMS slides override product-derived slides.
- Product-derived slides remain as fallback when no active CMS slides exist.
- `app/page.tsx` calls `getHomepageProducts()` and `getActiveCmsSlides()` in parallel.
- `Hero` receives `slides: HomepageSlide[] | null`; `null` means product fallback.
- Reduced-motion, tab-hidden pause, keyboard accessibility, and manual controls remain required.
- This issue requires a Prisma migration.
- `HomepageSliderSlide` is added to root `prisma/schema.prisma` only.
- Run Prisma migration from the project root, not from the `server` folder.
- Server folder schema does not receive this model.
- CMS mutations call `revalidatePath("/")` after successful create, update, and delete.
- Homepage `revalidate = 60` is ISR fallback only.
- CTA URLs are internal paths only and external URLs are rejected.
- Duplicate `sortOrder` values are allowed and tie-break by `id asc`.
- Hard delete removes the database row only and retains uploaded image files.
