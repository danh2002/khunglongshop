# 008 - Split admin from public root chrome

**Written against:** `1b1a769`
**Scope:** `app/layout.tsx`, route-group layouts under `app/`, admin route preservation under `app/(dashboard)/admin/**`
**Out of scope:** API routes, database schema, public UI redesign
**Executor model:** any Next.js App Router executor

---

## Background

Vercel Speed Insights reports `/admin` desktop as FCP `3.36s` and LCP `3.46s`, while TTFB is `0.09s`. A browser LCP probe on production `/admin` after admin login found the LCP element is not an admin table or chart. It is the public header logo image:

```json
{
  "tagName": "IMG",
  "src": "https://khunglongshop-kappa.vercel.app/_next/image?url=%2Fimages%2Flogo.png&w=48&q=75",
  "startTime": 856,
  "size": 14700
}
```

The current root layout always renders the public shell around every route:

- `app/layout.tsx:42` calls `getNavigationData()`.
- `app/layout.tsx:46-57` wraps all routes in `StyledComponentsRegistry`, `SessionProvider`, `LanguageProvider`, `SessionTimeoutWrapper`, public `Header`, public `Providers`, and public `Footer`.
- `components/Header.tsx:610-617` renders the public logo on `/admin`; it is already `priority`, so preloading the logo is not the real fix.
- `components/Footer.tsx:118-170` is also mounted on admin routes even though admin already has its own layout.

The high-leverage fix is to make `app/layout.tsx` minimal and move public chrome into a public route-group layout. Admin should keep only auth/session primitives and the admin dashboard layout.

---

## Pre-flight

```bash
git rev-parse HEAD
npm run type-check
npx vitest run --exclude "tests/otp/**"

# Optional but recommended with live DATABASE_URL:
npm run build
```

Record current build output for `/admin` and current production Speed Insights values if available.

---

## Steps

### Step 1 - Make the root layout chrome-free

File: `app/layout.tsx`

Keep only global document concerns:

- fonts
- `globals.css`
- `StyledComponentsRegistry`
- `SessionProvider`
- analytics components
- `{children}`

Remove public-only concerns from root:

- `getNavigationData()`
- `Header`
- `Footer`
- `LanguageProvider` if it is only used by public chrome
- `SessionTimeoutWrapper` if it is public/user-facing only
- `Providers` if it only contains cart/wishlist/public providers

**STOP condition:** If any removed provider is required for admin authentication or admin pages, keep that provider in root and document why.

### Step 2 - Add a public route-group layout

Create a public group such as:

```text
app/(public)/layout.tsx
```

Move the public chrome removed from root into this layout:

```tsx
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Providers from "@/Providers";
import SessionTimeoutWrapper from "@/components/SessionTimeoutWrapper";
import { LanguageProvider } from "@/components/LanguageProvider";
import { getNavigationData } from "@/lib/navigation";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const navigation = await getNavigationData();

  return (
    <LanguageProvider>
      <SessionTimeoutWrapper />
      <Header categories={navigation.categories} collectorSets={navigation.collectorSets} />
      <Providers>{children}</Providers>
      <Footer />
    </LanguageProvider>
  );
}
```

Then move public/user-facing routes into `app/(public)/...` without changing URLs. Route groups do not affect the URL.

Typical folders/pages to move:

- `app/page.tsx` -> `app/(public)/page.tsx`
- `app/about/**`
- `app/bo-suu-tap/**`
- `app/product/**`
- `app/cart/**`
- `app/checkout/**`
- `app/login/**`
- `app/register/**`
- `app/account/**`
- `app/wishlist/**`
- `app/search/**`

Do not move `app/api/**`.

### Step 3 - Keep admin under a separate lightweight route group

Keep existing admin routes under `app/(dashboard)/admin/**`.

`app/(dashboard)/layout.tsx` already performs server-side admin authorization:

```ts
await requireAdmin();
```

`app/(dashboard)/admin/layout.tsx` should continue to render only the admin shell/sidebar and `children`.

### Step 4 - Verify URLs did not change

Run URL existence checks locally or in preview:

```bash
npm run type-check
npx vitest run --exclude "tests/otp/**"
npm run build
```

Manual smoke routes:

- `/`
- `/bo-suu-tap`
- `/product/ricon-blind-box`
- `/cart`
- `/checkout`
- `/login`
- `/register`
- `/account`
- `/admin`

### Step 5 - Re-measure `/admin`

After deploy, open Vercel Speed Insights and compare `/admin`:

- FCP should move below `3s`.
- LCP should no longer be the public header logo.
- `/admin` should not load public header/footer chunks.

Use DevTools Elements to confirm there is no public `Header` or `Footer` in `/admin`.

---

## Done Criteria

- [ ] `/admin` does not render public `Header`.
- [ ] `/admin` does not render public `Footer`.
- [ ] `/admin` still requires admin auth.
- [ ] Public URLs remain unchanged.
- [ ] `npm run type-check` passes.
- [ ] `npx vitest run --exclude "tests/otp/**"` passes.
- [ ] `npm run build` passes with live `DATABASE_URL`.
- [ ] Production Speed Insights shows `/admin` FCP/LCP improved.
