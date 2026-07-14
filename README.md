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

After changing authentication credentials, redeploy the affected Vercel environments. Rotating `NEXTAUTH_SECRET` invalidates existing sessions.

## Database changes

Treat Prisma schema changes and migration SQL as production changes:

1. Generate and review migration SQL in a non-production workflow.
2. Validate TiDB compatibility and back up or otherwise protect affected data.
3. Apply reviewed migration SQL, or use the team's approved TiDB migration procedure.
4. Run `npm run db:generate` after schema changes.

Do not run `npm run db:push` against production. It bypasses the reviewed migration history and is not the production migration procedure.
