# Đảo Khủng Long Shop

Đảo Khủng Long Shop is a Vietnamese collectible-toy storefront and admin dashboard. The application runs on Next.js App Router and TypeScript, uses Prisma with TiDB Cloud (MySQL-compatible), authenticates with NextAuth, stores production uploads in Vercel Blob, and deploys to Vercel.

## Stack

- Next.js App Router and TypeScript
- Prisma ORM and TiDB Cloud
- NextAuth
- Vercel Blob
- styled-components and Tailwind CSS
- Vitest
- Vercel hosting

## Prerequisites

- Node.js 24.x
- npm
- A reachable MySQL-compatible database for local development
- Service credentials for the features you intend to exercise

## Local setup

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Create a private local environment file from the tracked template:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Replace the placeholders in `.env.local`. Generate a unique, high-entropy NextAuth secret; never commit it. For example, the template uses:

   ```env
   NEXTAUTH_SECRET=replace-with-a-generated-secret
   ```

4. Generate the Prisma client:

   ```powershell
   npm run db:generate
   ```

5. Check the TypeScript project and run the non-database test suite:

   ```powershell
   npm run type-check
   npx vitest run --exclude "tests/otp/**"
   ```

6. Start the Next.js application:

   ```powershell
   npm run dev:web
   ```

The web application is available at `http://localhost:3000` by default.

## Architecture

The active application uses Next.js App Router route handlers under `app/api/`. These handlers access Prisma directly; they do not proxy all API traffic to Express.

The `server/` directory is a legacy, development-only Express application. It is not part of the Vercel production architecture. Start it only when maintaining or investigating that legacy path:

```powershell
npm run dev:api
```

Running both local processes with `npm run dev` is likewise intended only for workflows that explicitly need the legacy server.

## Build and verification

Use the scripts defined in `package.json`:

```powershell
npm run db:generate
npm run type-check
npx vitest run --exclude "tests/otp/**"
npm run build
```

`npm run build` requires a reachable database. Next.js static generation can execute code that queries Prisma during the build.

## Production operations

Configure production and preview environment variables in Vercel. Keep all values in the deployment environment, never in tracked files:

- `DATABASE_URL`: TiDB Cloud MySQL-compatible connection credential.
- `NEXTAUTH_SECRET`: unique high-entropy authentication signing secret.
- `NEXTAUTH_URL`: canonical application URL for the target environment.
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob read/write token used by upload handlers.
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL`: Resend mail credential and verified sender identity.
- `GAME_API_KEY`: credential accepted by the game redemption API.
- `CRON_SECRET`: bearer credential used to authorize scheduled maintenance routes.
- SMS provider variables, when OTP delivery is enabled: provider URL, API credential, sender number, and timeout.
- `MAINTENANCE_MODE`, when required: optional operational feature flag.
- `VIETQR_BANK_ID`, `VIETQR_BANK_NAME`, `VIETQR_ACCOUNT_NO`, and
  `VIETQR_ACCOUNT_NAME`: receiving account metadata used to build authenticated
  order-payment QR links and display the customer-facing bank details.
- `VIETQR_TEMPLATE`: optional VietQR Quick Link template; defaults to `compact2`.
- `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SHEETS_TAB_NAME`, and
  `GOOGLE_SHEETS_WEB_APP_URL`: managed order-sync workbook, tab, and Apps
  Script deployment URL.
- `GOOGLE_SHEETS_SYNC_SECRET`: high-entropy shared HMAC secret configured in
  both Vercel and Apps Script Properties.
- `GOOGLE_SHEETS_SYNC_ACTOR_ID`: active admin user used for inbound status
  transitions and audit records.
- `ORDER_SHEET_SYNC_TIMEOUT_MS`: optional Apps Script timeout, default 3000 ms.

After changing authentication credentials, redeploy the affected Vercel environments. Rotating `NEXTAUTH_SECRET` invalidates existing sessions.

## Database changes

Treat Prisma schema changes and migration SQL as production changes:

1. Generate and review migration SQL in a non-production workflow.
2. Validate TiDB compatibility and back up or otherwise protect affected data.
3. Apply reviewed migration SQL, or use the team's approved TiDB migration procedure.
4. Run `npm run db:generate` after schema changes.

Do not run `npm run db:push` against production. It bypasses the reviewed migration history and is not the production migration procedure.

## Payment expiry scheduling

The bank-payment status endpoint performs authoritative lazy expiry whenever the
customer polls it. A Vercel Cron also sweeps abandoned orders. The checked-in
schedule is once daily so it remains compatible with the Vercel Hobby plan;
sub-minute scheduled cleanup requires Vercel Pro or another approved scheduler.

## Google Sheets order synchronization

The application synchronizes database orders to the managed
`Đơn hàng đồng bộ` tab through the Apps Script gateway in
`integrations/google-apps-script/`. The historical `Tháng 8/2026` tab is never
modified. One managed row maps to one order UUID. Customer/order fields are
database-authoritative; only the validated status dropdown is writable back to
the database.

Checkout and admin mutations enqueue sync in the same database transaction,
then attempt a best-effort post-commit flush. Sheet outages never roll back a
successful order. The authenticated `/api/cron/order-sheet-sync` route retries
pending exports and reconciles inbound status revisions in bounded batches.

- Vercel Hobby daily cron: flush failures may take up to 24 hours to recover.
- Vercel Pro with a reviewed five-minute schedule: recovery takes up to five
  minutes.
- Apps Script `onEdit`: realtime inbound status delivery, independent of the
  Vercel cron tier.

If sub-hour outbound recovery is required, use Vercel Pro or an approved
external scheduler. Monitor pending count, oldest pending age,
`SYNC_ACTOR_INVALID`, conflict rate, and retry rate without PII labels. Rotate
the integration actor alongside HMAC secret rotation. Disable the Apps Script
trigger and order-sync cron for rollback; retain pending state for later retry.

Apply the reviewed order-sync migration before enabling the trigger or cron.
Use the cron route's authenticated `POST` in dry-run mode for bounded initial
reconciliation; send `confirm: "ENQUEUE"` only after reviewing each page.
