# 009 - Slim admin sidebar hydration and icon cost

**Written against:** `1b1a769`
**Scope:** `app/(dashboard)/admin/layout.tsx`, `components/DashboardSidebar.tsx`, optional new components under `components/admin/`
**Out of scope:** public header/footer split, API routes, database schema, visual redesign
**Executor model:** any Next.js App Router executor

---

## Background

`/admin` root itself does not import charts or rich editors. The dashboard page renders server-side counts and small tables in `app/(dashboard)/admin/page.tsx:27-42`.

The shared admin sidebar is client-rendered for every admin route:

- `components/DashboardSidebar.tsx:1` is `"use client"`.
- `components/DashboardSidebar.tsx:5-6` imports icons from both `react-icons/fa6` and `react-icons/md`.
- `app/(dashboard)/admin/layout.tsx:1` imports `DashboardSidebar`.
- `app/(dashboard)/admin/layout.tsx:8` renders it on every admin page.

Because the sidebar is only interactive for active-link detection via `usePathname`, most of this UI can be server-rendered or reduced to a tiny client island.

---

## Pre-flight

```bash
git rev-parse HEAD
npm run type-check
npx vitest run --exclude "tests/otp/**"
```

Optionally capture current admin route script requests in Chrome DevTools Network for `/admin`.

---

## Steps

### Step 1 - Keep the layout server-rendered

File: `app/(dashboard)/admin/layout.tsx`

Do not add `"use client"` to this file. It should remain a server component that renders the admin shell and `children`.

### Step 2 - Split the sidebar into static markup plus a tiny active-link client component

Refactor `components/DashboardSidebar.tsx` so the large static markup and nav item data are server-rendered.

Create a small client component only for active path styling, for example:

```text
components/admin/AdminSidebarLink.tsx
```

That component may use `usePathname()` and receive only:

- `href`
- `label`
- `iconKey` or pre-rendered icon

Avoid passing imported icon component constructors through the client boundary if possible.

**STOP condition:** If preserving exact active styling without flicker requires keeping the whole sidebar client-side, skip this step and proceed to Step 3.

### Step 3 - Remove heavy `react-icons` usage from the admin sidebar

Replace the sidebar's `react-icons` imports with local lightweight SVG/icon components or CSS/icon text equivalents under `components/admin/`.

Current imports to remove from `components/DashboardSidebar.tsx`:

```ts
import { FaBagShopping, FaGear, FaRegUser, FaStore, FaTable, FaTicket, FaTrophy } from "react-icons/fa6";
import { MdCategory, MdDashboard, MdPhotoLibrary } from "react-icons/md";
```

Keep visible icon sizes, spacing, and labels unchanged.

Do not remove `react-icons` from the whole project in this plan. Only reduce admin sidebar cost.

### Step 4 - Confirm `/admin` does not load icon-heavy chunks unnecessarily

Run:

```bash
npm run type-check
npx vitest run --exclude "tests/otp/**"
```

If a live database is available:

```bash
npm run build
```

Then compare `/admin` in Chrome DevTools Network:

- fewer admin layout JS bytes
- no new visual regression in the sidebar
- active link still works on `/admin`, `/admin/products`, `/admin/orders`, and `/admin/users`

---

## Done Criteria

- [ ] Admin layout remains a server component.
- [ ] Sidebar active-link logic is the only sidebar client behavior.
- [ ] Sidebar no longer imports broad `react-icons/fa6` and `react-icons/md` sets.
- [ ] `/admin` sidebar looks the same on desktop and mobile.
- [ ] `npm run type-check` passes.
- [ ] `npx vitest run --exclude "tests/otp/**"` passes.
