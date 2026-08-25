# Plan 026: Export filtered admin orders to a two-sheet Excel workbook

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 9e76e29..HEAD -- package.json package-lock.json "app/(dashboard)/admin/orders/page.tsx" app/api/admin/orders/export components/admin/OrderExportButton.tsx lib/adminOrderExport.ts tests/unit/adminOrderExportApi.test.ts tests/unit/adminOrderExcel.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `9e76e29`, 2026-08-25

## Why this matters

Administrators can filter and page through orders, but cannot take the full
matching dataset into an accounting-friendly workbook. This plan adds an
admin-only JSON export endpoint and generates the `.xlsx` file in the browser,
so the server only performs a narrow database read and never spends function
time constructing a workbook. The workbook includes order-level data and
revenue statistics whose revenue calculations count `COMPLETED` orders only.

The export represents the filters currently applied in the page URL. Editing a
filter input without submitting `Lọc` does not change the applied filter and
therefore does not change the export. Pagination (`page`) must never constrain
the export.

## Current state

- `app/(dashboard)/admin/orders/page.tsx` is an async server component. It
  parses `search`, `status`, `dateFrom`, and `dateTo`, constructs a Prisma
  `where`, and displays 20 matching orders per page:

  ```ts
  // app/(dashboard)/admin/orders/page.tsx:21-49
  const search = typeof params.search === "string" ? params.search.trim() : "";
  const dateFrom = typeof params.dateFrom === "string" ? params.dateFrom : "";
  const dateTo = typeof params.dateTo === "string" ? params.dateTo : "";
  const rawStatus = typeof params.status === "string" ? params.status : "";
  const status = Object.values(OrderStatus).includes(rawStatus as OrderStatus)
    ? (rawStatus as OrderStatus)
    : undefined;
  const where: Prisma.Customer_orderWhereInput = {
    ...(status ? { status } : {}),
    ...(dateFrom || dateTo
      ? {
          dateTime: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
          },
        }
      : {}),
    ...buildAdminOrderSearchWhere(search),
  };
  ```

- The filter form ends with the existing `Lọc` submit button. The export
  button must be immediately adjacent and must use `type="button"` so it does
  not submit the form:

  ```tsx
  // app/(dashboard)/admin/orders/page.tsx:74-77
  <button className={adminSecondaryButtonClass} type="submit">
    Lọc
  </button>
  ```

- `app/api/admin/orders/route.ts` is an authenticated, paginated list endpoint.
  It uses `requireAdminApi`, validates with Zod, selects safe fields, and calls
  `parseAdminPagination`. Do not overload it for export because its `limit` is
  capped and the export must contain every matching order.

- `utils/adminAuth.ts` provides the required API boundary. New admin endpoints
  call `requireAdminApi()` first and return its `response` before parsing or
  querying:

  ```ts
  const { response } = await requireAdminApi();
  if (response) return response;
  ```

- `lib/adminOrderSearch.ts` is the shared search implementation. Both the page
  and existing admin orders API spread `buildAdminOrderSearchWhere(search)`
  into their Prisma filter. The export endpoint must reuse it.

- `prisma/schema.prisma:28-33` defines exactly four order statuses:
  `PENDING_PAYMENT`, `PROCESSING`, `COMPLETED`, and `CANCELLED`.
  `prisma/schema.prisma:281-323` defines `Customer_order`; relevant export
  fields are `orderNumber`, `name`, `lastname`, `email`, `phone`, `status`,
  integer `total`, and nullable `dateTime`.

- The Vietnamese labels already used by the admin page are:

  ```ts
  PENDING_PAYMENT: "Chờ thanh toán",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã huỷ",
  ```

- `xlsx` is absent from `package.json` and `package-lock.json`. The public npm
  registry is frozen at `xlsx@0.18.5`; SheetJS identifies its CDN as the
  authoritative distribution and currently documents the `0.20.3` tarball for
  npm/bundler installs. Use that tarball, which still imports as `xlsx`:
  <https://docs.sheetjs.com/docs/getting-started/installation/frameworks/>.

- API unit tests mock `requireAdminApi` and `@/utils/db` before importing route
  handlers; use `tests/unit/adminUserApi.test.ts` as the structural pattern.
  Source-wiring assertions are an accepted convention; see
  `tests/unit/adminOrderSearch.test.ts`.

- CI gates are `npm run db:generate`, `npm run type-check`, and
  `npx vitest run --exclude "tests/otp/**"`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install SheetJS | `npm install --save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` | exit 0; only package manifest/lock change |
| Confirm SheetJS | `npm ls xlsx` | exit 0; reports `xlsx@0.20.3` |
| Generate Prisma | `npm run db:generate` | exit 0 |
| API test | `npx vitest run tests/unit/adminOrderExportApi.test.ts` | all pass |
| Workbook test | `npx vitest run tests/unit/adminOrderExcel.test.ts` | all pass |
| Typecheck | `npm run type-check` | exit 0, no errors |
| Full tests | `npx vitest run --exclude "tests/otp/**"` | all pass |
| Diff hygiene | `git diff --check` | exit 0, no output |

## Scope

**In scope** (the only files to modify or create):

- `package.json`
- `package-lock.json`
- `app/(dashboard)/admin/orders/page.tsx`
- `app/api/admin/orders/export/route.ts` (create)
- `components/admin/OrderExportButton.tsx` (create)
- `lib/adminOrderExport.ts` (create)
- `tests/unit/adminOrderExportApi.test.ts` (create)
- `tests/unit/adminOrderExcel.test.ts` (create)
- `plans/README.md` (status row only after all gates pass)

**Out of scope** (do not touch):

- `prisma/schema.prisma` and migrations; no schema change is required.
- `app/api/admin/orders/route.ts`; it remains the paginated list endpoint.
- Order mutation, payment, cancellation, restoration, Google Sheets sync, and
  order-detail code.
- Public/customer order pages and APIs.
- Server-side workbook generation or returning an `.xlsx` body from the API.
- Adding a page-size cap. The requirement is all matching orders; minimize the
  endpoint's `select` instead.
- Changes to existing filter meanings or pagination links.
- CI audit allowlist changes. A new SheetJS advisory is a STOP condition, not
  a reason to suppress it.

## Git workflow

- Work on the current branch unless the operator provides a branch.
- Keep changes scoped to the files above.
- Use the repository's imperative commit style; suggested final commit:
  `Add Excel export for admin orders`.
- Do not push or open a pull request unless explicitly instructed.

## Steps

### Step 1: Install supported SheetJS

Run:

```text
npm install --save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

Do not install stale npm-registry `xlsx@0.18.5`. Confirm `package.json` records
an `xlsx` production dependency backed by the official tarball and the lockfile
resolves package name `xlsx`, version `0.20.3`, with integrity metadata.

Run:

```text
git diff --stat -- package.json package-lock.json
npm ls xlsx
npm audit --omit=dev --json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const a=JSON.parse(s);const v=a.vulnerabilities?.xlsx;if(v&&['high','critical'].includes(v.severity))process.exit(1)})"
```

**Verify**: only `package.json` and `package-lock.json` changed; `npm ls` exits
0 with `xlsx@0.20.3`; the audit filter exits 0 because no high/critical `xlsx`
advisory is present. Existing accepted advisories are outside this plan.

### Step 2: Add a tested workbook builder

Create browser-safe `lib/adminOrderExport.ts`. Do not import Prisma, Node
built-ins, database code, or server-only modules. Define an exported DTO:

```ts
type AdminOrderExportItem = {
  orderNumber: number;
  name: string;
  lastname: string;
  email: string;
  phone: string;
  status: "PENDING_PAYMENT" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  total: number;
  dateTime: string | null;
};
```

Export:

1. `buildAdminOrderWorkbook(XLSX, items)`, accepting the dynamically imported
   SheetJS module and returning a workbook.
2. `buildAdminOrderExportFilename(now = new Date())`, returning exactly
   `don-hang-{dd-mm-yyyy}.xlsx` with zero-padded local day/month.

Use `XLSX.utils.aoa_to_sheet` for deterministic column order.

Sheet `Tất cả đơn hàng` must have exactly these columns in order:

1. `Mã đơn` — `#${orderNumber}`
2. `Khách hàng` — trimmed `name + " " + lastname`
3. `Email`
4. `SĐT`
5. `Trạng thái` — the Vietnamese label above
6. `Tổng tiền` — numeric `total`, not a formatted string
7. `Ngày đặt` — a valid `Date` for a valid non-null timestamp, otherwise `""`

Sheet `Tổng hợp doanh thu` must be a `Chỉ số` / `Giá trị` table with rows in
this exact order:

1. `Tổng đơn hàng` — all exported rows
2. `Tổng đơn thành công` — `COMPLETED` count
3. `Tổng đơn đang xử lý` — `PROCESSING` count
4. `Tổng đơn chờ thanh toán` — `PENDING_PAYMENT` count
5. `Tổng đơn đã huỷ` — `CANCELLED` count
6. `Tổng doanh thu` — sum of `total` for `COMPLETED` only
7. `Doanh thu trung bình/đơn thành công` — completed revenue / completed count,
   or numeric `0` when there are no completed orders

Append the sheets in that order with those exact names. Set reasonable `!cols`
widths. Apply currency display formatting to total/revenue cells without
converting underlying values to strings. Do not create formulas from customer
data.

Create `tests/unit/adminOrderExcel.test.ts` using the real SheetJS module.
Cover exact sheet names/order; exact Sheet 1 headers and mappings; mixed-status
counts and completed-only revenue; zero completed orders; null dates; and fixed
date filename `don-hang-05-09-2026.xlsx`.

**Verify**: `npx vitest run tests/unit/adminOrderExcel.test.ts` → all pass.

### Step 3: Add the admin-only unpaginated export endpoint

Create `app/api/admin/orders/export/route.ts` with `GET(request: NextRequest)`.

Required order:

1. Call `requireAdminApi()` and immediately return its auth response.
2. Validate `search`, `status`, `dateFrom`, `dateTo`. Match the page contract:
   trimmed search up to 100 characters; native `OrderStatus`; valid
   `YYYY-MM-DD` dates. Malformed filters return `validationError` and 400.
3. Build `Prisma.Customer_orderWhereInput` with optional exact status,
   `dateFrom` inclusive, `dateTo + "T23:59:59"` inclusive, and
   `...buildAdminOrderSearchWhere(search)`.
4. Call one `prisma.customer_order.findMany`, ordered by
   `{ dateTime: "desc" }`. Do not set `skip`, `take`, or read `page`/`limit`.
   Select only `orderNumber`, `name`, `lastname`, `email`, `phone`, `status`,
   `total`, and `dateTime`.
5. Return `{ items }` with `Cache-Control: private, no-store`. Do not log PII.

Create `tests/unit/adminOrderExportApi.test.ts`, hoisting auth/database mocks
before importing the handler. Cover:

- Auth response returned unchanged and no database query.
- Invalid status, malformed date, and overlong search return 400/no query.
- No filters produce `where: {}`, narrow select, descending date order, and no
  `skip`/`take`.
- All four filters produce shared multi-field search, exact status, inclusive
  date boundaries, and no page semantics.
- Success JSON is `{ items }` and cache control contains `no-store`.

**Verify**: `npx vitest run tests/unit/adminOrderExportApi.test.ts` → all pass.

### Step 4: Add a lazy client-side export button

Create `components/admin/OrderExportButton.tsx` with `"use client"`. Props are
the four applied filter values: `search`, optional `status`, `dateFrom`, and
`dateTo`.

On click:

1. Disable the button and display `Đang xuất...`.
2. Build `URLSearchParams` from non-empty filter props only. Never add `page`
   or `limit`.
3. Fetch `/api/admin/orders/export?${params}` with `cache: "no-store"`.
4. Parse JSON safely. For failure, prefer the structured admin error message,
   else `Không thể xuất đơn hàng.`.
5. After JSON succeeds, lazy-load with `await import("xlsx")`. Do not use a
   top-level runtime import; SheetJS must stay out of the initial route chunk.
6. Build the workbook and call `writeFileXLSX` with compression and the helper
   filename.
7. Restore enabled state in `finally`; show Vietnamese success/failure toast.
   Never log order PII.

Use `adminSecondaryButtonClass` and `type="button"`.

Update `app/(dashboard)/admin/orders/page.tsx` to import and render the button
immediately after `Lọc`, passing normalized values already used by the table:

```tsx
<OrderExportButton
  search={search}
  status={status}
  dateFrom={dateFrom}
  dateTo={dateTo}
/>
```

Add source-wiring assertions to `tests/unit/adminOrderExcel.test.ts` confirming
the page passes all four filters, the button is `type="button"`, the request
targets `/api/admin/orders/export` without `page`, and `xlsx` is dynamically
imported rather than top-level runtime-imported.

**Verify**: `npx vitest run tests/unit/adminOrderExcel.test.ts` → all pass.

### Step 5: Run full verification and close the plan

Run in order:

```text
npm run db:generate
npm run type-check
npx vitest run tests/unit/adminOrderExportApi.test.ts tests/unit/adminOrderExcel.test.ts
npx vitest run --exclude "tests/otp/**"
git diff --check
git status --short
```

`git status --short` may list only in-scope files. If all commands pass, update
Plan 026 in `plans/README.md` to `DONE` and commit with
`Add Excel export for admin orders` unless instructed otherwise.

**Verify**: every command exits 0, no tests fail, `git diff --check` prints
nothing, and the final commit contains no out-of-scope file.

## Test plan

- `tests/unit/adminOrderExportApi.test.ts`: admin authorization, validation,
  filter translation, unpaginated narrow selection, and no-store headers.
- `tests/unit/adminOrderExcel.test.ts`: actual workbook names, columns, labels,
  revenue rules, zero-success behavior, filename, and UI wiring.
- Model API mocks after `tests/unit/adminUserApi.test.ts`; model source checks
  after `tests/unit/adminOrderSearch.test.ts`.
- Focused command:
  `npx vitest run tests/unit/adminOrderExportApi.test.ts tests/unit/adminOrderExcel.test.ts`.
- Regression command: `npx vitest run --exclude "tests/otp/**"`.

## Done criteria

- [ ] Manifest/lock resolve official SheetJS `xlsx@0.20.3`; no high/critical
  `xlsx` advisory is introduced.
- [ ] Only an active admin can receive export data.
- [ ] The endpoint returns every matching order with the exact eight selected
  fields and no pagination clause.
- [ ] `search`, `status`, `dateFrom`, and `dateTo` match page semantics; `page`
  never affects export.
- [ ] The adjacent export button cannot submit the form, preserves applied
  filters, handles errors, and prevents duplicate clicks.
- [ ] SheetJS loads only after a successful click/request path.
- [ ] Workbook sheets are exactly `Tất cả đơn hàng` and
  `Tổng hợp doanh thu`, in order, with every required column/statistic.
- [ ] Revenue and average use only `COMPLETED`; other statuses remain counted
  but add zero revenue.
- [ ] Empty/zero-completed datasets use numeric zero, never `NaN`/`Infinity`.
- [ ] Filename matches `don-hang-{dd-mm-yyyy}.xlsx`.
- [ ] Prisma generation, typecheck, focused tests, full non-OTP tests, and
  `git diff --check` pass.
- [ ] No out-of-scope file is modified; Plan 026 is marked `DONE`.

## STOP conditions

Stop and report; do not improvise if:

- Drift changes an in-scope file so it no longer matches Current state.
- SheetJS `0.20.3` cannot be installed from the official tarball, conflicts
  with the toolchain, or adds a high/critical `xlsx` advisory. Do not fall back
  to npm-registry `0.18.5` or change the CI allowlist.
- Orders no longer use the four listed statuses, or total is no longer integer
  `Customer_order.total`.
- `requireAdminApi` is no longer the admin API boundary.
- All-orders export requires server-side workbook generation, truncation,
  pagination, a background job, or a schema change.
- The page must be converted wholesale to a client component.
- A verification command fails twice after a reasonable correction.
- An out-of-scope file must be touched.

## Maintenance notes

- Summary figures intentionally cover the filtered export dataset. Filtering
  to one status makes non-matching status counts zero.
- If filters change, update the page props, export endpoint, button query, and
  tests together; filter drift is the main maintenance risk.
- The endpoint is intentionally unpaginated. Monitor response size and
  function memory. If volume becomes unsafe, plan a queued/streamed export
  instead of silently truncating results.
- Keep monetary cells numeric for sorting/formulas.
- Reviewers should verify cancelled totals never enter revenue and SheetJS
  remains lazy-loaded.
