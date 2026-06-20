# Issue 7: Character Collection Hero CMS

## Summary

Add CMS-managed hero content for character collection pages such as `/bo-suu-tap?nhanvat=ricon`.

Today the page special-cases Ricon inside `app/bo-suu-tap/page.tsx` with a hardcoded image, hardcoded copy, and a `characterSlug !== "ricon"` guard. Replace that with hero metadata on `CollectorSet`, since the current app already uses collector sets as the public "character" source for navigation and filtering.

## Scope

- Add optional hero fields to `CollectorSet`.
- Expose those fields in the admin collector set create/edit UI.
- Validate and persist the fields in the admin collector set API routes.
- Replace the Ricon-only page logic with a generic collector set hero resolver.
- Keep product filtering, active pool visibility gates, header navigation, and homepage slider behavior unchanged.

## Non-Goals

- Do not introduce a separate `Character` model in v1.
- Do not redesign the product grid or product cards.
- Do not change blind box pool publication rules.
- Do not require every collector set to have a hero banner.

## Current Findings

- `app/bo-suu-tap/page.tsx` reads `searchParams.nhanvat`, then calls Ricon-specific hero logic.
- `CollectorSet` currently has `name`, `slug`, `image`, `description`, `totalSlots`, reward fields, and product/pool relations.
- Admin collector set forms live in:
  - `components/admin/CollectorSetCreateForm.tsx`
  - `components/admin/CollectorSetMetadataForm.tsx`
- Admin API validation lives in:
  - `app/api/admin/collector-sets/route.ts`
  - `app/api/admin/collector-sets/[id]/route.ts`
- Header character links come from `CollectorSet` in `lib/navigation.ts`.
- Public collector filtering uses `buildCollectorGalleryWhere({ characterSlug })` in `lib/publicCatalog.ts`.

## Requirements

### Data

Add these optional fields to `CollectorSet`:

```prisma
model CollectorSet {
  // existing fields
  heroImage             String?
  heroBadge             String?
  heroTitle             String?
  heroSubtitle          String?
  heroPrimaryCtaLabel   String?
  heroPrimaryCtaUrl     String?
  heroSecondaryCtaLabel String?
  heroSecondaryCtaUrl   String?
  showHero              Boolean @default(true)
}
```

Migration behavior:

- Existing sets get `showHero=true`.
- Existing `image` values remain unchanged.
- Optional hero strings default to `NULL`.
- Backfill Ricon with the current hero image/copy so removing hardcoded logic does not change the visible page.

### Admin CMS

Collector set create/edit screens should include a compact hero section with:

- Hero banner image path
- Badge
- Title
- Subtitle
- Primary CTA label and URL
- Secondary CTA label and URL
- Show hero toggle

Empty optional strings should be normalized to `null`.

### Validation

Use the existing collector set API route validation style. Suggested limits:

- `heroImage`: 500 characters
- `heroBadge`: 80 characters
- `heroTitle`: 180 characters
- `heroSubtitle`: 300 characters
- CTA labels: 80 characters

CTA URLs must be internal paths:

- Must start with `/`
- Must not start with `//`
- Must not allow `http://`, `https://`, or `javascript:`
- Label and URL must be provided as a pair

For v1, hero image input should follow the current site image path convention, preferably an existing `/images/...` path. External hero image support is not required.

### Public Resolver

Add a server-side resolver such as `getCollectorSetHero(characterSlug)` in `lib/collectorSetHero.ts`.

Resolver behavior:

- Return `null` when `characterSlug` is missing or equals `"all"`.
- Find the collector set by slug, matching the current public filter behavior.
- Return `null` when `showHero === false`.
- Resolve image in this order:
  1. `collectorSet.heroImage`
  2. `collectorSet.image`
  3. first slotted collector product `mainImage`
- Return `null` if no usable image exists.
- Resolve copy in this order:
  - Badge: `heroBadge ?? collectorSet.name`
  - Title: `heroTitle ?? collectorSet.name`
  - Subtitle: `heroSubtitle ?? collectorSet.description`
- Only render CTAs when both label and URL are present.

### Public Page

Update `app/bo-suu-tap/page.tsx` to render a reusable hero from resolver data.

Remove:

- `RICON_HERO_FALLBACK_BANNER`
- `getRiconHeroImages`
- `characterSlug !== "ricon"` hero gate
- Ricon-only copy embedded in page logic

Keep `/bo-suu-tap` and `/bo-suu-tap?nhanvat=all` on the existing non-character collection flow.

### Cache

After collector set create/update/delete, revalidate:

- `/bo-suu-tap`
- Existing navigation/layout cache paths or tags already used by the app

## Acceptance Criteria

- Admin can create and edit collector set hero fields.
- Empty optional hero fields save as `null`.
- Invalid external CTA URLs are rejected.
- CTA label without URL, and URL without label, are rejected.
- `/bo-suu-tap?nhanvat=ricon` renders from CMS/backfilled data, not hardcoded page logic.
- Another collector set, for example Vanie, can render a hero when it has CMS or fallback image data.
- `/bo-suu-tap` and `/bo-suu-tap?nhanvat=all` do not render a character-specific hero.
- Product grid filtering and active pool visibility gates still work.
- Homepage hero slider is unaffected.

## Implementation Plan

1. Add Prisma fields and migration.
2. Extend collector set admin API create/update schemas and persistence.
3. Add the hero field group to collector set create/edit forms.
4. Add the server-side collector set hero resolver.
5. Replace Ricon-only hero logic in `app/bo-suu-tap/page.tsx`.
6. Backfill Ricon hero data.
7. Add focused tests and run verification.

## Tests

Suggested unit coverage:

- Resolver returns `null` for missing slug, `"all"`, disabled hero, and missing image.
- Resolver prefers CMS hero image over set image and product fallback.
- Resolver uses fallback copy from collector set fields.
- CTA pair validation accepts complete pairs and rejects incomplete/external values.
- Collection page no longer contains Ricon-only hero constants or guards.

Manual QA:

- Create or edit a collector set with hero fields in admin.
- Visit `/bo-suu-tap?nhanvat=<slug>` and confirm the hero renders above the grid.
- Toggle `showHero=false` and confirm the hero disappears.
- Confirm product filtering remains correct for Ricon and Vanie.

## Risks

- Ricon hero could disappear if backfill is skipped before removing the hardcoded fallback.
- Admin UI can become noisy if hero fields are not grouped clearly.
- Image paths can be invalid; reuse existing image normalization/display helpers where possible.

## Open Questions

Resolved for v1:

- Secondary CTA only renders when CMS provides both label and URL.
- Admins enter an existing hero image path manually, preferably `/images/...`; image picker/upload is future scope.
