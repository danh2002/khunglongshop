# Issue #6: Navbar Search UX

Source: https://github.com/danh2002/khunglongshop/issues/6#issue-4698183962

## Summary

The navbar search icon currently links straight to `/search`, which opens the search page with no query and shows every public product. Issue #6 asks for a real search interaction:

- Click the navbar search icon to open a compact search field.
- Submit a keyword with Enter or the confirm button.
- Navigate to `/search?q=<keyword>`.
- Close the field with Escape or an outside click without navigating.
- Make `/search` filter public products by name when `q` is present and keep showing all products when it is not.

## Current Code

- `components/Header.tsx` renders the public search action as `ActionLink href="/search"` with `FaMagnifyingGlass`.
- `app/search/page.tsx` reads `searchParams.search`, queries Prisma directly, and filters public storefront products with `PUBLIC_STOREFRONT_PRODUCT_WHERE`.
- `components/SearchInput.tsx` submits to `/search?search=...`; it is exported but not wired into the header.
- `app/api/search/route.ts` reads `query`, but the search page does not use that route.

## Scope

In scope:

- Header search toggle and submit behavior.
- `/search?q=` support.
- Backward compatibility for existing `/search?search=` links.
- Product title filtering on the public storefront product set.
- Focus, Escape, and outside-click behavior.
- Focused regression tests.

Out of scope:

- Autocomplete, suggestions, recent searches, or live result previews.
- Full-text indexes or broad search across categories, users, orders, or admin data.
- Search page redesign.
- Catalog visibility rule changes.

## Requirements

### FR-1: Header Search Toggle

The public header search icon opens a compact search form instead of navigating immediately.

Acceptance criteria:

- The search icon is a button/form trigger on non-admin pages.
- Opening the form does not navigate.
- The input auto-focuses.
- The field fits the 64px dark header and uses the existing orange focus/hover accent.
- Account, wishlist, cart, mobile menu, category, and character navigation still work.

### FR-2: Submit Search

Submitting a non-empty value routes to `/search?q=<encoded term>`.

Acceptance criteria:

- Enter submits the search.
- The confirm/search button submits the search.
- The value is trimmed before routing.
- Empty or whitespace-only values do not navigate.
- Successful submit closes the expanded header search state.

### FR-3: Dismiss Search

The expanded search can close without changing the current route.

Acceptance criteria:

- Escape closes the field without navigation.
- Clicking outside the search form closes it without navigation.
- The close behavior does not break the existing dropdown outside-click behavior.
- Header search state resets after route changes.

### FR-4: Search Page Query Contract

`q` is the canonical query param for public search.

Acceptance criteria:

- `/search?q=vanie` uses `vanie` as the search term.
- `/search` and `/search?q=` show all public products.
- `/search?search=vanie` still works as a legacy fallback.
- If both `q` and `search` are present, `q` wins.
- New header submissions use `q`, not `search`.

### FR-5: Product Filtering

Search filters public storefront products by product name.

Acceptance criteria:

- Filtering uses `Product.title` with partial matching.
- Matching is case-insensitive.
- Results continue to include only products allowed by `PUBLIC_STOREFRONT_PRODUCT_WHERE`.
- Product cards continue to render through `ProductItem`.
- Description matching is optional, but title matching is required and must be covered by tests.

### FR-6: Mobile

Search remains usable when the desktop nav is hidden.

Acceptance criteria:

- A search affordance remains visible or available in the mobile menu.
- The input does not overflow the viewport.
- Mobile search submit also routes to `/search?q=<term>`.

## Implementation Notes

- Implement the header interaction in `components/Header.tsx`; the search icon already lives there and the component already owns dropdown/mobile state.
- Use `useRouter` for submit routing.
- Use an input ref for autofocus.
- Prefer `URLSearchParams` for query construction.
- Either update `components/SearchInput.tsx` to submit `q` or leave it as legacy only if it has no active call sites. Do not create a second public query contract.
- Keep the `/search` page server-rendered with its current Prisma query path. The API route can be aligned later if needed.

## Test Plan

Add focused tests for:

- Header no longer uses a direct `/search` link for the icon.
- Header submit path uses `/search?q=`.
- Search query normalization:
  - trims `q`;
  - falls back to `search`;
  - lets non-empty `q` override `search`;
  - treats whitespace-only values as empty.
- Search page filtering includes `title: { contains: query }`.
- `/search` with no query keeps the all-products path.

Manual QA:

- Desktop: open search, autofocus, submit with Enter, submit button, Escape close, outside-click close.
- Mobile: search is reachable, fits the viewport, and submits to `q`.
- Search URLs: `/search`, `/search?q=vanie`, `/search?q=VAN`, `/search?search=vanie`, `/search?q=abc&search=vanie`.

## Risks

- Header crowding on desktop. Prefer a compact absolute overlay near the action icons if inline layout pushes nav items.
- Outside-click handling can conflict with existing dropdown logic. Reuse the existing header containment pattern.
- Case-insensitive matching may depend on MySQL collation. Confirm locally; add a small tested fallback only if needed.

## Definition of Done

- Search icon opens a focused input instead of navigating immediately.
- Enter/confirm routes to `/search?q=<term>`.
- Escape/outside click closes without navigation.
- `/search?q=` filters public products by title.
- `/search` still shows all public products.
- Legacy `/search?search=` still works.
- Header actions and mobile navigation still work.
- Targeted tests and `npm run type-check` pass.
