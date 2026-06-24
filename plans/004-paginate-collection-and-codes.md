# 004 — Paginate my-collection and my-codes endpoints

**Written against:** current HEAD  
**Scope:** `app/api/merch/my-collection/route.ts`, `app/api/merch/my-codes/route.ts`, `app/account/collection/page.tsx`  
**Out of scope:** admin endpoints, UI redesign, infinite scroll (cursor-based pagination)  
**Executor model:** mid-tier or above  
**Depends on:** plan 003 merged (profile counts)

---

## Background

`my-codes` loads every `redemptionCode` for the user with full `include` chain
(allocation → product → poolVersion → collectorSet), then a second `findMany`
for products, then a third for collectorSets — all unbounded.

`my-collection` loads every `collectorSet` (global, not per-user) with all
collector products included, then every `redemptionCode` for the user, then
every `setReward`. As the catalog grows this payload grows with it.

Fix: add `page`/`limit` query params to both endpoints. Default `limit=10`.
UI fetches page 1 on load; user can request more.

---

## Pre-flight

```bash
npm run db:generate
npm run type-check
npx vitest run --exclude "tests/otp/**"
```

---

## Steps

### Step 1 — Paginate `my-codes` endpoint

File: `app/api/merch/my-codes/route.ts`

**Change signature** to read query params:

```ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10))
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '10', 10))
  const skip  = (page - 1) * limit
```

**Add `skip`/`take` to the first `findMany`** (redemptionCodes):

```ts
prisma.redemptionCode.findMany({
  where: { userId },
  orderBy: { createdAt: 'desc' },
  skip,
  take: limit,
  include: { /* unchanged */ },
}),
```

**Add a count query** to the `Promise.all`:

```ts
prisma.redemptionCode.count({ where: { userId } }),
```

Update destructure:
```ts
const [redemptionCodes, setRewards, total] = await Promise.all([...])
```

**Wrap response** with pagination envelope:

```ts
return NextResponse.json({
  redemptionCodes: redemptionCodes.map(/* unchanged mapping */),
  setRewards,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  },
})
```

**Note:** `setRewards` is intentionally left unbounded — a user completing every
set is the happy path and the count is bounded by the number of sets in the
catalog, not user activity volume.

**Verification:**
```bash
npm run type-check
# Test manually: GET /api/merch/my-codes?page=1&limit=5
# Response must include pagination.total and redemptionCodes.length <= 5
```

---

### Step 2 — Paginate `my-collection` endpoint

File: `app/api/merch/my-collection/route.ts`

Pagination unit: **collectorSet** (each set is a self-contained card in the UI).

**Change signature:**

```ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10))
  const limit = Math.min(20, parseInt(searchParams.get('limit') ?? '10', 10))
  const skip  = (page - 1) * limit
```

**Add `skip`/`take`/`count` to the sets query:**

```ts
const [sets, totalSets, redemptionCodes, setRewards] = await Promise.all([
  prisma.collectorSet.findMany({
    orderBy: { createdAt: 'asc' },
    skip,
    take: limit,
    include: {
      products: {
        where: { isCollector: true },
        select: {
          id: true,
          title: true,
          mainImage: true,
          setSlotNumber: true,
        },
      },
    },
  }),
  prisma.collectorSet.count(),
  prisma.redemptionCode.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  }),
  prisma.setReward.findMany({
    where: { userId },
    orderBy: { grantedAt: 'desc' },
  }),
])
```

**Note:** `redemptionCodes` for the user stays unbounded here because
`summarizeProductOwnership` needs to know which products the user owns across
ALL sets to correctly compute slot ownership — even for sets not on the current
page. This is a known limitation; full cursor-based ownership pagination is
out of scope.

**Wrap response:**

```ts
return NextResponse.json({
  sets: sets.map(/* unchanged mapping */),
  pagination: {
    page,
    limit,
    total: totalSets,
    totalPages: Math.ceil(totalSets / limit),
  },
})
```

**Verification:**
```bash
npm run type-check
# Test manually: GET /api/merch/my-collection?page=1&limit=5
# Response must include pagination envelope and sets.length <= 5
```

---

### Step 3 — Update collection page to use paginated endpoint

File: `app/account/collection/page.tsx`

The page currently fetches with `no-store` and maps the full array response.
Update it to:

1. Read `pagination` from response
2. Pass `page=1&limit=10` on initial fetch
3. Show a "Load more" button if `page < totalPages`

**STOP condition:** If `collection/page.tsx` is a Server Component that fetches
directly (not via client hook), converting to paginated client-side fetching
requires making it a Client Component (`'use client'`). Check first:

```powershell
Get-Content "app\account\collection\page.tsx" | Select-Object -First 5
# If no 'use client' directive → it is a Server Component
```

If it is a Server Component: add `'use client'`, move the fetch into a
`useEffect`, and add local state for `page` and `sets`. This is a significant
refactor — if the file is over 200 lines, stop and report rather than
proceeding.

**Simple "Load more" pattern** (if converting to client component):

```tsx
const [sets, setSets] = useState([])
const [page, setPage] = useState(1)
const [totalPages, setTotalPages] = useState(1)

const loadMore = async () => {
  const res = await fetch(`/api/merch/my-collection?page=${page + 1}&limit=10`)
  const data = await res.json()
  setSets(prev => [...prev, ...data.sets])
  setPage(data.pagination.page)
  setTotalPages(data.pagination.totalPages)
}
```

---

### Step 4 — Verify

```bash
npm run type-check
npx vitest run --exclude "tests/otp/**"
```

Manual smoke:
- Open `/account/collection` → first page of sets loads
- If more than 10 sets exist, "Load more" button appears
- Open `/account/codes` (or equivalent) → first 10 codes load
- Network tab: response payload noticeably smaller than before

---

## Done criteria

- [ ] `GET /api/merch/my-codes?page=1&limit=5` returns `pagination.total` and `redemptionCodes.length <= 5`
- [ ] `GET /api/merch/my-collection?page=1&limit=5` returns `pagination.totalPages` and `sets.length <= 5`
- [ ] Collection page loads without error
- [ ] `npm run type-check` passes
- [ ] `npx vitest run --exclude "tests/otp/**"` passes
