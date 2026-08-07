# Plan 020: Đồng bộ đơn hàng hai chiều với Google Sheets

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat adc2b26..HEAD -- prisma/schema.prisma prisma/migrations app/api/orders/route.ts app/api/admin/orders app/api/cron lib integrations tests README.md .env.example vercel.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against live code before proceeding. If an order
> mutation path or status rule has changed, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: Plan 019 must be migrated and operational because payment
  confirmation, expiry, cancellation, and renewal all change synchronized
  order status.
- **Category**: direction
- **Planned at**: commit `adc2b26`, 2026-08-06

## Why this matters

Orders created and maintained in the shop database need to appear in the
Google workbook used by operations, while a status edit made by an authorized
operator in the Sheet must flow back through the same business rules as an
admin-dashboard edit. Direct synchronous Google API calls inside checkout
would make order creation depend on an external service, and a naive two-way
poller would create update loops or overwrite newer data. This plan uses a
database-backed, coalescing outbox, signed integration endpoints, stable UUID
row identity, monotonic revisions, and an installable Apps Script `onEdit`
trigger. Realtime delivery is attempted after commit; a bounded cron performs
retry and reconciliation.

The target workbook contains customer names, phone numbers, email addresses,
and shipping addresses. Treat it as a PII-bearing production system: grant
least privilege, never log row payloads, never put credentials in cells, and
rotate the shared integration secret if it is exposed.

## Confirmed product contract

- Direction: two-way.
- Timing: realtime plus cron fallback.
- DB → Sheet fields:
  - `#orderNumber`
  - customer name (`name` + `lastname`)
  - phone
  - email
  - full shipping address
  - products and quantities
  - total in integer VND
  - order status
  - order creation time
- Sheet → DB writable field: **order status only**. All other displayed fields
  are database-authoritative snapshots and must be restored on the next
  outbound sync if a user edits them. Product quantities and totals must not be
  edited from a spreadsheet because doing so would bypass inventory,
  blind-box allocation, payment, and audit invariants.
- One managed row represents exactly one `Customer_order`.
- The existing `Tháng 8/2026` tab is historical/manual and must not be
  rewritten or normalized by this feature.

## Live Sheet facts (read-only inspection on 2026-08-06)

- Workbook: `Báo cáo đơn hàng`
- Spreadsheet ID: `1Dj4aXMLMNnL-QI5oMAhJk3NoRVrF7phy4IVbhcKVdg0`
- Target URL:
  `https://docs.google.com/spreadsheets/d/1Dj4aXMLMNnL-QI5oMAhJk3NoRVrF7phy4IVbhcKVdg0/edit`
- Existing tab: `Tháng 8/2026`, `sheetId: 0`, 999 rows × 28 columns,
  frozen header row and first two columns.
- Existing visible headers A:J are `STT`, `Tên`, `Mã đơn`, `Số điện thoại`,
  `Địa chỉ`, `Số lượng đơn`, `Ngày đặt`, two manual workflow columns, and
  `Ghi Chú`.
- Some existing cells group multiple order numbers in one row, so neither row
  position nor the visible order-number cell is a safe two-way identity key.
- Existing workflow dropdown values do not map one-to-one to the Prisma
  `OrderStatus` enum.

Create a separate managed tab named `Đơn hàng đồng bộ`. Do not modify tab
`Tháng 8/2026`. The managed tab must have these columns:

| Col | Header | Ownership | Notes |
|---|---|---|---|
| A | `Order ID` | system | hidden UUID, immutable row key |
| B | `Mã đơn` | DB | display `#${orderNumber}` |
| C | `Tên khách hàng` | DB | `${name} ${lastname}` trimmed |
| D | `Số điện thoại` | DB | plain text to preserve leading zero |
| E | `Email` | DB | plain text |
| F | `Địa chỉ giao hàng` | DB | deterministic joined address |
| G | `Sản phẩm + số lượng` | DB | one line per item, `title × quantity` |
| H | `Tổng tiền` | DB | numeric VND with number format |
| I | `Trạng thái đơn` | two-way | dropdown; only user-editable data field |
| J | `Thời gian đặt` | DB | real datetime in workbook timezone |
| K | `DB Revision` | system | hidden monotonic integer |
| L | `Sheet Revision` | system | hidden monotonic integer |
| M | `Sync Error` | system | protected; empty on success |

Freeze row 1 and columns A:B, hide A and K:M, protect DB-owned columns, add a
filter, and set the status dropdown to exactly:

| Prisma status | Sheet label |
|---|---|
| `PENDING_PAYMENT` | `Chờ thanh toán` |
| `PROCESSING` | `Đang xử lý` |
| `COMPLETED` | `Hoàn thành` |
| `CANCELLED` | `Đã hủy` |

## Current state

- `prisma/schema.prisma:281-318` defines `Customer_order`. It already contains
  the selected business fields and relations but has no durable Sheet sync
  state or inbound event ledger:

  ```prisma
  model Customer_order {
    id          String  @id @default(uuid())
    orderNumber Int     @unique @default(autoincrement())
    name        String
    lastname    String
    phone       String
    email       String
    adress      String
    dateTime    DateTime? @default(now())
    status      OrderStatus @default(PENDING_PAYMENT)
    city        String
    country     String
    total       Int
    products    customer_order_product[]
  }
  ```

- `app/api/orders/route.ts:295-318` creates the order inside the existing
  checkout transaction. Any sync enqueue must be in this transaction, but no
  HTTP request to Google or Apps Script may run inside it.
- `app/api/admin/orders/[id]/status/route.ts:36-76` validates status
  transitions with `canTransitionOrderStatus` and then updates Prisma.
- Status is also mutated in `lib/paymentConfirmation.ts`,
  `lib/orderCancellation.ts`, `lib/paymentExpiry.ts`,
  `lib/orderRestoration.ts`, and `lib/paymentRenewal.ts`. Every successful
  mutation must enqueue sync atomically.
- `lib/orderTransitions.ts` is the source of ordinary transition rules.
  Payment confirmation, cancellation, and restoration have additional domain
  rules and must be invoked through their existing services rather than
  bypassed with a raw status update.
- `app/api/cron/payment-expiry/route.ts` demonstrates the cron authorization
  convention: exact `Authorization: Bearer ${CRON_SECRET}` comparison and a
  bounded batch.
- `vercel.json` currently schedules only daily payment expiry, reflecting the
  documented Vercel Hobby limitation.
- No Google runtime SDK is installed. Use built-in `fetch` and Node
  `crypto`; do not add the large `googleapis` package. Apps Script is the
  narrowly scoped Sheet gateway.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Generate Prisma | `npm run db:generate` | exit 0 |
| Validate schema | `npx prisma validate` | exit 0 |
| Typecheck | `npm run type-check` | exit 0, no errors |
| Focused tests | `npx vitest run tests/unit/orderSheetSync*.test.ts` | all pass |
| Full tests | `npx vitest run --exclude "tests/otp/**"` | all pass |
| Build | `npm run build` | exit 0 with an approved DB connection |
| Diff hygiene | `git diff --check` | exit 0 |

## Scope

**In scope** (the only production files to modify/create):

- `prisma/schema.prisma`
- `prisma/migrations/<timestamp>_add_order_sheet_sync/migration.sql` (create)
- `lib/orderSheetSync.ts` (create)
- `lib/orderSheetSyncAuth.ts` (create)
- `lib/orderSheetStatus.ts` (create)
- `lib/paymentConfirmation.ts`
- `lib/orderCancellation.ts`
- `lib/paymentExpiry.ts`
- `lib/orderRestoration.ts`
- `lib/paymentRenewal.ts`
- `app/api/orders/route.ts`
- `app/api/admin/orders/[id]/status/route.ts`
- `app/api/integrations/google-sheets/orders/webhook/route.ts` (create)
- `app/api/cron/order-sheet-sync/route.ts` (create)
- `integrations/google-apps-script/Code.gs` (create)
- `integrations/google-apps-script/README.md` (create)
- `.env.example`
- `README.md`
- `vercel.json`
- `tests/unit/orderSheetSync*.test.ts` (create)
- existing focused order mutation tests when their mocks require the enqueue
  call
- `plans/README.md`

**Out of scope**:

- Any modification to workbook tab `Tháng 8/2026` or its historical rows.
- Any Sheet-driven edit of customer identity, contact details, address,
  products, quantities, prices, totals, payment references, or timestamps.
- The legacy Express server under `server/`.
- Replacing the admin orders UI.
- Google OAuth UI, user-consent flows, or storing Google credentials in the DB.
- Making checkout success depend on Sheet availability.
- Bulk importing historical Sheet rows into the DB.

## Git workflow

- Branch: `advisor/020-two-way-google-sheets-order-sync`
- Use the repository's recent conventional style, for example
  `feat(orders): add durable Google Sheets synchronization`.
- Commit by logical layer: schema, sync core/routes, Apps Script/docs/tests.
- Do not push, deploy, change the live Sheet, or apply production migrations
  unless the operator explicitly authorizes those actions.

## Steps

### Step 1: Add durable per-order sync state and inbound idempotency

Extend `Customer_order` with an optional one-to-one relation to a new
`OrderSheetSyncState` model. Use the order UUID as both primary key and foreign
key. The state must include:

- `orderId String @id`
- `revision Int @default(1)` — latest DB revision requested for export
- `syncedRevision Int @default(0)` — latest revision acknowledged by Apps Script
- `sheetRevision Int @default(0)` — latest inbound edit revision applied/seen
- `attempts Int @default(0)`
- `nextAttemptAt DateTime @default(now())`
- `lastSyncedAt DateTime?`
- `lastErrorCode String?` with a bounded VARCHAR
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`
- indexes for `(syncedRevision, nextAttemptAt)` or an equivalent queryable
  pending-state representation supported by Prisma/TiDB

Add `OrderSheetSyncEvent` with an opaque `eventId` primary key, `orderId`,
`sheetRevision`, outcome enum/string, optional bounded error code, and
`createdAt`. Index `createdAt` for retention cleanup. Do not store row payloads
or PII in this ledger.

Write explicit TiDB-compatible migration SQL. Existing orders do not need sync
state rows immediately; the first backfill/reconcile pass creates them lazily.

**Verify**:

```powershell
npx prisma validate
npm run db:generate
```

Expected: both exit 0; generated types expose both new models.

### Step 2: Define the canonical row and status contract

**Before writing any code in this step**, confirm the actual `OrderStatus`
enum values in the live schema:

```powershell
grep -A 12 "enum OrderStatus" prisma/schema.prisma
```

Reconcile the output against the status map table in the "Confirmed product
contract" section above. If the enum does not contain `PENDING_PAYMENT` or
`COMPLETED`, update the table to match the real values before proceeding.
Do not assume enum values from this document — the schema is authoritative.
If enum values differ, also update the managed-tab column I dropdown list
and the Apps Script status map in Step 4 to match.

Create `lib/orderSheetStatus.ts` with exhaustive maps in both directions.
Unknown labels must produce a typed `SHEET_STATUS_INVALID` error; do not fall
back to a status. Use a compile-time exhaustive check so a future Prisma enum
addition breaks type-check until explicitly mapped.

Create the pure serialization portion of `lib/orderSheetSync.ts`:

- Query/select only the required order and product snapshot fields.
- Return the 13-column managed-row contract above.
- Use `id` in hidden column A and `#${orderNumber}` in B.
- Join and trim customer name deterministically.
- Build address from `apartment`, `adress`, `city`, `country`, and
  `postalCode`, omitting empty pieces without emitting duplicate separators.
- Sort products by stable order-item ID and render `productTitle × quantity`,
  one line per item.
- Keep `total` numeric; Apps Script applies VND formatting.
- Serialize `dateTime` as ISO 8601; Apps Script converts it to a real Sheet
  datetime in timezone `Etc/GMT-7`.
- Never include `paymentRef`, internal blind-box allocation data, user IDs,
  audit metadata, or secrets.

Add pure unit tests for every status mapping, Unicode names/addresses, multiple
products, empty optional address segments, numeric total, and stable ordering.

**Verify**:

`npx vitest run tests/unit/orderSheetSyncSerializer.test.ts` → all tests pass.

### Step 3: Implement signed Apps Script transport without new dependencies

Create `lib/orderSheetSyncAuth.ts` using Node `crypto` and Web Crypto-safe
primitives already available in the runtime. Validate these environment
variables at call time with a typed configuration error:

- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SHEETS_TAB_NAME` (production value: `Đơn hàng đồng bộ`)
- `GOOGLE_SHEETS_WEB_APP_URL` (HTTPS only)
- `GOOGLE_SHEETS_SYNC_SECRET`
- `GOOGLE_SHEETS_SYNC_ACTOR_ID`
- optional `ORDER_SHEET_SYNC_TIMEOUT_MS`, default 3000, bounded 500–10000

For app → Apps Script requests, send a JSON envelope containing `timestamp`,
`eventId`, `payload`, and a lowercase hex HMAC-SHA256 signature over the exact
canonical string documented in both TypeScript and Apps Script. Apps Script
web apps do not expose arbitrary inbound request headers reliably, so the
signature belongs in the envelope. Require a five-minute timestamp window.

For Apps Script → app webhooks, send the same timestamp/event/signature values
as `x-order-sync-*` headers and sign the raw body. On the Next.js side, read
`request.text()` once, verify signature with `timingSafeEqual`, then parse JSON
with Zod. Never log the secret, signature, raw body, customer data, or Sheet
row contents. Logs may contain event ID, order UUID, revision, result code,
attempt count, and latency.

Test valid signatures, altered body, expired timestamp, malformed hex,
different-length signature, missing configuration, and timeout/abort behavior.

**Verify**:

`npx vitest run tests/unit/orderSheetSyncAuth.test.ts` → all tests pass.

### Step 4: Build the Apps Script gateway and managed-tab bootstrap

Create `integrations/google-apps-script/Code.gs` and deployment documentation.
The script must:

1. Store `SYNC_SECRET`, `APP_WEBHOOK_URL`, `SPREADSHEET_ID`, and managed tab
   name in Apps Script Properties, never cells or committed source.
2. Provide an idempotent `setupManagedSheet()` that creates only
   `Đơn hàng đồng bộ`, validates existing headers before changing anything,
   applies the required format/protection/validation, and refuses to touch
   `sheetId: 0` / `Tháng 8/2026`. Guard every idempotent setup call:
   check `sheet.getFrozenRows() === 0` before calling `setFrozenRows(1)`,
   check `sheet.getFrozenColumns() === 0` before calling
   `setFrozenColumns(2)`, and check whether a data-validation rule already
   exists on column I before applying the status dropdown. Running
   `setupManagedSheet()` twice on an already-configured sheet must produce
   no error and no change.
3. Implement signed `doPost(e)` actions:
   - `upsertOrders`: find by hidden UUID column A, insert or update one row,
     reject a lower DB revision, and acknowledge each event/revision.
   - `listChangedStatuses`: return a bounded page of rows whose Sheet revision
     may exceed the DB cursor supplied by the caller.
4. Use `LockService.getDocumentLock()` around row lookup/upsert so concurrent
   requests cannot create duplicate UUID rows.

**Apps Script fetch safety**: all `UrlFetchApp.fetch()` calls must pass
`muteHttpExceptions: true` and check `response.getResponseCode()`
explicitly. If the app webhook returns non-2xx, log only the status code
and event ID — never the response body. Do not rely on Apps Script to retry
a failed `onEdit` POST; the outbound cron is the recovery path.

5. Install an **installable** `onEdit` trigger. Ignore edits outside the
   managed tab or status column I. Validate the dropdown value, increment the
   row's Sheet revision, and POST the signed minimal payload
   `{ eventId, orderId, dbRevision, sheetRevision, statusLabel }` to the app.
6. Script-originated writes must not enqueue another inbound edit. Add an
   explicit guard even though Google edit triggers normally fire only for user
   edits.
7. On webhook rejection/conflict, put only a bounded error code in column M;
   never place stack traces or secrets in the workbook.

Document manual deployment: bind/create the script, configure properties,
deploy as a web app executed as the owner, restrict workbook sharing, run
`setupManagedSheet()`, install the trigger, and copy the deployment URL to
Vercel. Include secret rotation and rollback steps.

**Verify**: Apps Script deployment checklist completed in a non-production
copy of the workbook; running `setupManagedSheet()` twice creates one managed
tab and preserves the legacy tab byte-for-byte/cell-for-cell.

### Step 5: Implement coalescing outbound enqueue and bounded delivery

In `lib/orderSheetSync.ts`, add:

- `enqueueOrderSheetSync(tx, orderId)`: transactionally upsert sync state and
  increment `revision`. Multiple mutations coalesce into the newest canonical
  snapshot.
- `flushOrderSheetSync({ orderId?, limit, now })`: select at most `limit`
  states where `syncedRevision < revision` and `nextAttemptAt <= now`, load
  canonical rows, send one bounded batch to Apps Script, and update only
  acknowledged revisions.
- Exponential retry with jitter, a capped delay, and a bounded error code.
  Never persist exception messages that may contain URLs or payload fragments.
- Idempotency: Apps Script upserts by UUID and ignores older/equal event
  revisions, so concurrent or repeated delivery cannot duplicate rows.
- Partial success handling: acknowledge successful rows independently and
  retain failed rows for retry.

No Google/Apps Script request may execute while a Prisma transaction is open.
Realtime callers must invoke a best-effort flush **after commit**, catch/log a
sanitized failure, and still return the successful order/admin response.

**Verify**:

`npx vitest run tests/unit/orderSheetSyncOutbound.test.ts` → tests cover
coalescing, retry, timeout, partial success, duplicate acknowledgment, stale
acknowledgment, and checkout success when the gateway is unavailable.

### Step 6: Enqueue every DB-side synchronized mutation atomically

Call `enqueueOrderSheetSync(tx, orderId)` inside the same transaction as every
successful relevant mutation:

- initial creation in `app/api/orders/route.ts`
- payment confirmation in `lib/paymentConfirmation.ts`
- cancellation in `lib/orderCancellation.ts`
- expiry in `lib/paymentExpiry.ts`
- restoration in `lib/orderRestoration.ts`
- payment renewal/reactivation in `lib/paymentRenewal.ts`
- ordinary admin status update in
  `app/api/admin/orders/[id]/status/route.ts` (wrap update + enqueue in one
  transaction)

For checkout idempotency hits, do not bump the revision merely because the
same request was replayed. If a sync state is missing for an existing order,
create it once without changing order data.

After commit, call the order-scoped best-effort flush where a request handler
is available. Background/batch mutations may rely on the cron flush.

Add source-wiring regression tests listing every mutation file. The test must
fail if a new raw `customer_order.update/updateMany/create` that changes a
synced field is introduced without enqueue coverage or an explicit documented
exception.

**Verify**:

```powershell
npx vitest run tests/unit/orderSheetSyncMutationWiring.test.ts
npx vitest run tests/unit/paymentCheckout.test.ts tests/unit/paymentExpiry.test.ts tests/unit/paymentRenewal.test.ts
```

Expected: all pass and external transport mocks confirm no call occurs inside
the transaction callback.

### Step 7: Apply inbound Sheet status edits through domain services

Create
`app/api/integrations/google-sheets/orders/webhook/route.ts`. It must:

1. Verify HMAC/timestamp before parsing or querying the DB.
2. Validate the minimal payload with strict Zod schemas and bounded strings.
3. Insert `OrderSheetSyncEvent` by `eventId`; duplicate events return 200 with
   `{ duplicate: true }` and perform no mutation.
4. Load the active admin integration actor identified by
   `GOOGLE_SHEETS_SYNC_ACTOR_ID`; require `role = admin` and
   `isActive = true`. If the actor cannot be loaded or fails either check,
   return HTTP 503 with typed code `SYNC_ACTOR_INVALID` and emit a
   server-side log line containing only the code, the order UUID, and the
   event ID — no PII. This code must be monitorable as a non-PII metric
   label so an inactive/missing actor is detectable without inspecting
   payloads.
5. Compare DB and Sheet revisions. A stale edit must not overwrite newer DB
   state; enqueue the canonical row and return a typed conflict result.
6. Map status and use existing business operations:
   - `PENDING_PAYMENT → PROCESSING`: call `confirmOrderPayment` so `paidAt`,
     payment rules, and audit behavior remain correct.
   - `PENDING_PAYMENT|PROCESSING → CANCELLED`: call the shared cancellation
     service with reason `GOOGLE_SHEETS_SYNC` and the integration actor.
   - `PROCESSING → COMPLETED`: use the same transition service as admin PATCH;
     extract one if necessary rather than duplicating validation.
   - same status: record/acknowledge the Sheet revision without changing DB.
   - restoration or any other invalid transition: reject with a typed code and
     enqueue a canonical Sheet repair. Never bypass inventory/payment rules.
7. Write an `AdminAuditLog` record inside the same transaction/service path,
   identifying the integration actor and storing only old/new status,
   Sheet event ID, and Sheet revision.
8. Return minimal JSON without PII.

If the existing domain service cannot accept an integration actor or shared
transaction cleanly, extract a service first. Do not copy stock, allocation,
payment, or transition loops into the webhook.

**Verify**:

`npx vitest run tests/unit/orderSheetSyncWebhook.test.ts` → cover unauthorized,
tampered, duplicate, stale, same-status, every allowed transition, every
rejected transition, inactive actor, rollback, audit, and canonical repair.

### Step 8: Add cron retry and two-way reconciliation

Create `app/api/cron/order-sheet-sync/route.ts` following the existing
`CRON_SECRET` bearer convention. In one invocation:

1. Flush at most 50 pending outbound orders.
2. Request at most 100 changed status rows from Apps Script.
3. Feed each change through the same idempotent inbound service used by the
   webhook; do not issue internal HTTP calls to the app itself.
4. Stop within a defined time budget and return counts only: scanned,
   exported, imported, duplicate, conflict, failed, remaining.
5. Never return or log PII.

Add a second `vercel.json` cron entry. Keep it once daily if the deployment is
on Vercel Hobby. **On Vercel Hobby, the best-effort post-commit flush inside
checkout and admin mutation routes is the primary outbound delivery path — not
the cron.** If the flush fails, the order remains pending until the next daily
cron run (up to ~24 h staleness). Document the expected max staleness per tier
in `README.md`:

- Hobby: up to 24 h recovery latency on flush failure.
- Pro (5-minute cron): up to 5 min recovery latency.
- Apps Script `onEdit`: realtime inbound only; not affected by cron tier.

If sub-hour outbound recovery is required on Hobby, the operator must upgrade
to Pro or add an external scheduler before deploying this feature.

Also provide a one-time authenticated/back-office reconciliation command or
script that enqueues all DB orders in bounded pages. It must default to dry-run,
require explicit confirmation to enqueue, and never delete Sheet rows.

**Verify**:

`npx vitest run tests/unit/orderSheetSyncCron.test.ts` → authorization, batch
bounds, time budget, partial failure, and count-only response all pass.

### Step 9: Document configuration, operations, and failure recovery

Add placeholder-only variables to `.env.example` and explain them in
`README.md`. Never place the spreadsheet secret or Apps Script deployment URL
value in tracked files. Document:

- provisioning and least-privilege workbook sharing
- managed-tab bootstrap
- Vercel/Apps Script secret configuration
- production migration ordering
- initial DB → Sheet reconciliation
- monitoring the pending sync-state count and oldest pending age
- retry/error-code triage
- secret rotation
- disabling the Apps Script trigger and cron as rollback
- retention cleanup for `OrderSheetSyncEvent`
- why the legacy monthly tab is not synchronized
- why only status is writable from Sheet

Remove the temporary full-error `detail: String(err)` response from the
top-level checkout 500 handler if it is still present; return the stable error
code while keeping server-side stack logging. This avoids exposing internal
details in production and is in scope because the sync work adds another
external failure surface to checkout.

**Verify**: `rg -n "GOOGLE_SHEETS_SYNC_SECRET=" . --glob '!node_modules/**'`
finds only an empty/placeholder `.env.example` declaration and documentation,
never a real value.

### Step 10: Run full verification and staged smoke tests

Run locally against a disposable DB and a copy of the workbook first:

```powershell
npm run db:generate
npx prisma validate
npm run type-check
npx vitest run tests/unit/orderSheetSync*.test.ts
npx vitest run --exclude "tests/otp/**"
git diff --check
npm run build
```

Then perform these smoke tests in order:

1. Create one paid-test-path and one pending-payment order. Each appears once
   in the managed tab with exact fields and UUID hidden.
2. Replay the same checkout/idempotency request. No duplicate Sheet row.
3. Disable/unpublish Apps Script, create an order, and confirm checkout still
   succeeds while sync remains pending. Restore it and run cron; the row
   appears and pending state clears.
4. Edit Sheet status through each valid transition and confirm DB/admin UI,
   audit log, and canonical Sheet value converge.
5. Attempt an invalid/stale transition; DB remains unchanged and Sheet is
   restored with a bounded error code.
6. Edit name, phone, address, products, or total in Sheet; the next outbound
   reconciliation restores the DB-authoritative value and DB remains unchanged.
7. Trigger webhook/cron duplicates and concurrent upserts; one row remains.
8. Confirm no PII, row payload, signature, URL query secret, or stack trace is
   present in Vercel/Apps Script logs.
9. Confirm `Tháng 8/2026` is unchanged.

Only after all checks pass should the operator deploy Apps Script and Vercel
production configuration, apply the reviewed migration, bootstrap the managed
tab, and run initial reconciliation.

## Test plan

Create focused Vitest files modeled after existing unit/source-wiring tests:

- `tests/unit/orderSheetSyncSerializer.test.ts`
- `tests/unit/orderSheetSyncAuth.test.ts`
- `tests/unit/orderSheetSyncOutbound.test.ts`
- `tests/unit/orderSheetSyncWebhook.test.ts`
- `tests/unit/orderSheetSyncCron.test.ts`
- `tests/unit/orderSheetSyncMutationWiring.test.ts`

Required cases include canonical formatting, complete status mapping,
signature/replay defense, coalescing/idempotency, failure retry, no external
call inside a DB transaction, every order mutation path, inbound domain-rule
enforcement, audit atomicity, stale revision repair, batch bounds, and PII-free
responses/log metadata.

Do not make unit tests call the live workbook. Manual/staging smoke uses a
copied workbook; production workbook access is never part of CI.

## Done criteria

- [ ] `npm run db:generate` exits 0.
- [ ] `npx prisma validate` exits 0.
- [ ] `npm run type-check` exits 0.
- [ ] All `orderSheetSync*.test.ts` tests pass.
- [ ] Full non-OTP Vitest suite passes.
- [ ] `npm run build` exits 0 with approved environment access.
- [ ] `git diff --check` exits 0.
- [ ] Checkout succeeds while Apps Script is unavailable and leaves retryable
  sync state.
- [ ] One DB order always maps to one managed Sheet row by hidden UUID.
- [ ] Replayed outbound and inbound events are idempotent.
- [ ] Valid Sheet status edits update DB only through existing domain rules.
- [ ] Non-status Sheet edits never modify DB and are self-healed.
- [ ] Legacy tab `Tháng 8/2026` remains unchanged.
- [ ] Logs/responses contain no PII, row payloads, secrets, or stack traces.
- [ ] Cron and installable `onEdit` trigger are deployed and verified.
- [ ] `plans/README.md` status row is updated.

## STOP conditions

Stop and report; do not improvise if:

- The operator requires product quantities, prices, totals, payment data, or
  customer PII to be editable from Sheet. That is an order-editing/inventory
  feature and needs a separate product specification and threat model.
- The existing legacy tab must be overwritten instead of creating the managed
  tab. Its grouped rows do not provide a safe one-row/one-order identity.
- Production is on Vercel Hobby but the operator requires cron recovery more
  frequent than daily and will not approve Pro or an external scheduler.
- Apps Script cannot be deployed with an installable edit trigger or a secret
  stored in Script Properties.
- A newly discovered order mutation path cannot enqueue in the same DB
  transaction.
- TiDB rejects the reviewed migration SQL or production migration history does
  not match the schema baseline.
- The integration actor is absent, inactive, or not an admin.
- Any implementation step would log or persist the Google secret, signatures,
  customer row payloads, or unbounded exception details.
- Live Sheet headers/tab identity differ from the facts recorded above.

## Maintenance notes

- Adding an `OrderStatus` must fail type-check until both status maps and Sheet
  validation are updated.
- Adding a new order mutation path requires transactional enqueue coverage.
- Apps Script deployments are versioned separately from Vercel; record both
  deployment versions during releases and rollbacks.
- Monitor pending count, oldest pending age, retry rate, inbound conflicts, and
  invalid transitions. Do not use PII as metric labels.
- Prune idempotency events on a bounded retention schedule only after the
  maximum replay/reconciliation window is agreed.
- Review Sheet sharing periodically because it contains operational PII.
- If operations later need editable shipping/customer fields, plan a dedicated
  admin order-edit service with validation and audit before enabling those
  columns in Sheet.
- Monitor `SYNC_ACTOR_INVALID` log events. If the integration actor
  (`GOOGLE_SHEETS_SYNC_ACTOR_ID`) is deactivated or deleted, all inbound
  Sheet edits will be silently rejected until the env var is updated to an
  active admin. Add a runbook entry for actor rotation alongside secret
  rotation.
