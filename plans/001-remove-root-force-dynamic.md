# 001 — Remove root-layout force-dynamic; restore ISR on public routes

**Written against:** current HEAD  
**Scope:** `app/layout.tsx`, `lib/i18n-server.ts`, `components/LanguageProvider.tsx`, `tests/unit/redemptionCodeSpecWiring.test.ts`  
**Out of scope:** API routes, auth routes, `app/account/**`  
**Executor model:** mid-tier (requires understanding React context + cookie API)

---

## Background

`app/layout.tsx` is async and calls:
1. `getServerLocale()` → reads `cookies()` from `next/headers`
2. `getServerSession()` → reads request headers

Both are request-bound APIs. Next.js 15 detects either call in the root layout
and forces the entire app dynamic — making `export const dynamic = "force-dynamic"`
at line 38 a symptom, not the cause.

Fix: move locale reading to the client inside `LanguageProvider`. The root layout
becomes a static shell. `SessionProvider` already works client-side (next-auth
ships a client `SessionProvider` that fetches session via `/api/auth/session`).

---

## Pre-flight

```bash
npm run db:generate
npm run type-check                              # must pass
npx vitest run --exclude "tests/otp/**"        # must pass (153 tests)
```

> `npm run build` requires a live MySQL connection (sitemap prerender calls
> Prisma). Skip in isolated executor. Human reviewer runs build verification
> manually in Step 4 on main checkout with real DATABASE_URL.

---

## Steps

### Step 1 — Update `LanguageProvider` to read cookie client-side

File: `components/LanguageProvider.tsx`

The component currently receives `initialLocale` as a prop from layout.
Add a fallback: if no prop, read the cookie on the client.

Find the component definition and update to read cookie directly when mounted:

```tsx
'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { normalizeLocale } from '@/lib/i18n'

// ... existing context/type definitions unchanged ...

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode
  initialLocale?: string   // now optional
}) {
  const [locale, setLocale] = useState(
    initialLocale ?? 'vi'  // default to 'vi' on server render
  )

  useEffect(() => {
    // Hydrate from cookie on client if not provided by server
    if (!initialLocale) {
      const match = document.cookie.match(/(?:^|;\s*)site_lang=([^;]*)/)
      const cookieLocale = match ? normalizeLocale(decodeURIComponent(match[1])) : 'vi'
      setLocale(cookieLocale)
    }
  }, [initialLocale])

  // ... rest of provider unchanged ...
}
```

**STOP condition:** If `LanguageProvider` is not a `'use client'` component,
add the directive at the top before making this change.

**Verification:**
```bash
npm run type-check
# expected: no errors
```

---

### Step 2 — Make root layout a static async function (remove request-bound calls)

File: `app/layout.tsx`

**Delete** line 38:
```ts
export const dynamic = "force-dynamic"
```

**Remove** `getServerLocale` from the `Promise.all` and its import:

Before:
```ts
import { getServerLocale } from "@/lib/i18n-server";
// ...
const [session, locale, navigation] = await Promise.all([
  getServerSession(),
  getServerLocale(),
  getNavigationData(),
]);
```

After:
```ts
// remove the getServerLocale import entirely
const [session, navigation] = await Promise.all([
  getServerSession(),
  getNavigationData(),
]);
```

**Update** `<html lang>` to static default:
```tsx
<html lang="vi" data-theme="light">
```

**Update** `<LanguageProvider>` — remove `initialLocale` prop (it is now optional,
client will hydrate from cookie):
```tsx
<LanguageProvider>
  ...
</LanguageProvider>
```

**STOP condition:** If `getNavigationData()` internally calls `cookies()` or
`headers()`, the build will still show Dynamic. Verify:
```powershell
Get-Content "lib\navigation.ts" | Select-String "cookies|headers"
# expected: no output
```
If found, that function also needs to be moved client-side or cached — stop and
report.

**Verification:**
```bash
npm run type-check
# expected: no errors
```

---

### Step 3 — Handle session without server call in layout

`getServerSession()` in layout is also request-bound. However, `SessionProvider`
from next-auth accepts `session={null}` and fetches client-side automatically.

Update layout:
```ts
// Remove getServerSession import and call
// Change Promise.all to single call:
const navigation = await getNavigationData()
```

Update JSX:
```tsx
<SessionProvider session={null}>
```

**Note:** This means initial server render won't have session data — components
that need session will get it after client hydration via next-auth's
`useSession()`. If `Header` uses session server-side, it will work fine via
`useSession()` on client. Verify Header is a client component:
```powershell
Get-Content "components\Header.tsx" | Select-String "use client"
# expected: finds 'use client'
```

If Header is a server component that reads session, stop and report.

---

### Step 4 — Build verification (run manually on main checkout, not in worktree)

Before manual build verification, update any stale wiring test that still
asserts root `force-dynamic`. The test should assert:

- `app/layout.tsx` does not contain `force-dynamic`
- `app/layout.tsx` does not contain `getServerLocale` or `getServerSession`
- `components/LanguageProvider.tsx` accepts optional `initialLocale` and reads
  `site_lang` from `document.cookie` when no server locale is provided

Do not add broad implementation tests in this plan; this is only to align the
existing wiring assertion with the new architecture.

After executor commits, pull changes to main checkout then run:

```bash
npm run type-check
npx vitest run --exclude "tests/otp/**"
npm run build
```

Look for `/` listed as **Static** or **ISR**, not Dynamic.

**STOP condition:** If `/` still shows Dynamic, run:
```powershell
Get-ChildItem -Recurse -Include "*.tsx","*.ts" app/ | Select-String "cookies\(\)|headers\(\)|useSearchParams"
```
Identify which file in the layout tree is still calling request-bound APIs and report.

---

## Done criteria

- [ ] `Get-Content app\layout.tsx | Select-String "force-dynamic"` → no output
- [ ] `Get-Content app\layout.tsx | Select-String "getServerLocale|getServerSession"` → no output
- [ ] `npm run type-check` passes (executor)
- [ ] `npx vitest run --exclude "tests/otp/**"` passes (executor)
- [ ] `npm run build` shows `/` as Static/ISR — verified manually on main checkout
- [ ] Locale still works client-side
- [ ] Session still works after hydration
