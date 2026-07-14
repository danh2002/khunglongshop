# Plan 013: Remove the committed credential-like value and align operational documentation

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving on. If any STOP condition occurs, stop and report; do not improvise. Update the matching row in `plans/README.md` when complete.
>
> **Drift check (run first)**: `git diff --stat 4370999..HEAD -- README.md AGENTS.md .env.example`
> If an in-scope file changed, compare the excerpts below with the live file. A material mismatch is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: security, docs, dx
- **Planned at**: commit `4370999`, 2026-07-14

## Why this matters

The repository documentation still describes the inherited Singitronic application, a separate Express proxy architecture, local MySQL setup, and a credential-like NextAuth secret literal. The real application is a Next.js App Router deployment on Vercel with TiDB Cloud, Vercel Blob, NextAuth, and App Router route handlers that query Prisma directly. This makes onboarding and incident response unreliable; the credential-like value must be treated as compromised even if it was intended as an example.

## Current state

- `README.md` is the public onboarding document. Lines 1-12 describe a different electronics store; lines 127-138 describe a different database and server topology; line 130 contains a literal NextAuth secret value. Never copy that value into a commit, issue, terminal output, or test fixture.
- `AGENTS.md` is the agent-facing operating guide. Lines 21-27 and 97-110 say the application uses an Express backend/proxy and MySQL; lines 42 and 195 say Tailwind is not installed although `package.json:34-35,73,80` and `tailwind.config.ts` prove otherwise. Lines 81-83 prohibit absolute image URLs although `app/api/admin/upload/route.ts:85-92` returns Vercel Blob URLs.
- `.env.example` is already ignored correctly by `.gitignore` and should remain a placeholder-only template.
- Current code conventions: `app/api/products/route.ts:25-50` directly queries Prisma from a Next route handler; `app/api/admin/upload/route.ts:3,85-92` writes production uploads to Vercel Blob; `package.json:5-29` is the source of truth for verification scripts.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Inspect tracked secret-like values | `git grep -nE "NEXTAUTH_SECRET=[^[:space:]]+" -- README.md AGENTS.md .env.example` | Only placeholder values remain after this plan |
| Typecheck | `npm run type-check` | Exit 0 |
| Non-DB tests | `npx vitest run --exclude "tests/otp/**"` | Exit 0 |
| Review scope | `git diff --check` | No output |

## Scope

**In scope**:

- `README.md`
- `AGENTS.md`
- `.env.example`
- `plans/README.md`

**Out of scope**:

- `.env`, `.env.local`, Vercel, TiDB, Blob, GitHub, or any other secret store.
- Production credential rotation itself. This requires an operator with Vercel access.
- Refactoring the legacy `server/` directory.
- UI/source-code mojibake repairs.

## Git workflow

- Branch: `advisor/013-operational-docs`
- Use the existing imperative commit style, for example `Implement code changes to enhance functionality and improve performance`.
- Do not push or deploy unless the operator explicitly asks.

## Steps

### Step 1: Rotate the affected NextAuth secret out of band

Before changing tracked files, have an operator create a new high-entropy `NEXTAUTH_SECRET` in Vercel for Preview and Production, then redeploy. Update any private local environment files separately. Do not paste the old or new value in source, plans, Git commits, terminals, or screenshots.

**Verify**: In Vercel Environment Variables, `NEXTAUTH_SECRET` exists for the intended environments and a fresh deployment completes. Existing sessions may be invalidated; this is expected.

### Step 2: Replace the inherited README with current, safe onboarding

Rewrite `README.md` in UTF-8 without a BOM. It must document:

1. The product name and current stack: Next.js App Router, TypeScript, Prisma, TiDB Cloud (MySQL-compatible), NextAuth, Vercel Blob, Vercel.
2. Prerequisites and local setup using `.env.example`, without example credentials beyond placeholders such as `replace-with-a-generated-secret`.
3. Exact commands from `package.json`: `npm install`, `npm run db:generate`, `npm run type-check`, `npx vitest run --exclude "tests/otp/**"`, `npm run dev:web`.
4. A clear note that `npm run build` needs a reachable database because static generation can query Prisma.
5. Production operations: configure `DATABASE_URL`, `NEXTAUTH_SECRET`, Blob credential type, mail credential type, and cron credential type in Vercel; do not list their values.
6. Migration policy: do not use `db:push` against production; apply reviewed migration SQL or the approved migration procedure for TiDB.

Do not claim the Next App Router proxies all APIs to Express. If legacy Express still matters locally, document it as legacy/development-only and link to its actual startup command from `package.json`.

**Verify**: `git grep -nE "NEXTAUTH_SECRET=[^[:space:]]+" -- README.md AGENTS.md .env.example` shows only explicitly placeholder values; `rg -n "Singitronic|Electronics eCommerce|localhost:3306/singitronic" README.md` returns no matches.

### Step 3: Reconcile AGENTS.md with the live repository

Update only factual guidance in `AGENTS.md`:

- Name the actual public and dashboard route groups (`app/(public)` and `app/(dashboard)`).
- State that current App Router API handlers access Prisma directly, while `server/` is legacy and must not be changed or started for Vercel production unless a separate migration decision is made.
- State TiDB Cloud rather than local MySQL as the production database.
- Acknowledge styled-components and Tailwind dependencies without forcing either style into new work; match the surrounding module.
- State that image fields can be local paths or Vercel Blob HTTPS URLs and must pass `normalizeCatalogImage`/Next image configuration.
- Replace mojibake in the document with proper UTF-8 Vietnamese only where editing touched prose.

Retain the useful domain rules: VND integer pricing, non-null role enum, blind-box behavior, and safe migration guidance.

**Verify**: `rg -n "thin proxies|port 3001|No Tailwind|Never store absolute URLs|Singitronic" AGENTS.md` returns no matches.

### Step 4: Make `.env.example` a complete, non-secret contract

Keep only placeholders and add brief comments for the credential types actually consumed by current code: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, Blob write token, Resend/mail credential types, game API key, cron secret, and optional maintenance flag. Do not add values copied from any local environment file.

**Verify**: `git diff -- .env.example` contains no secret-looking literal other than documented placeholder text; `npm run type-check` exits 0.

## Test plan

- Documentation scan: no inherited product name, obsolete database URL, literal NextAuth secret, or false proxy architecture statement remains.
- Local developer path: a reviewer can copy `.env.example` to a private environment file and identify every required credential type without discovering a real secret.
- Regression gate: `npx vitest run --exclude "tests/otp/**"` passes.

## Done criteria

- [ ] The operator rotated the `NEXTAUTH_SECRET` credential type in Vercel and redeployed.
- [ ] `README.md` describes Khủng Long Shop, not the inherited project.
- [ ] `README.md` contains no literal credential value.
- [ ] `AGENTS.md` reflects App Router direct Prisma handlers, TiDB Cloud, Vercel Blob, and the mixed styling reality.
- [ ] `.env.example` contains placeholders only.
- [ ] `npm run type-check` exits 0.
- [ ] `npx vitest run --exclude "tests/otp/**"` exits 0.
- [ ] `git diff --check` has no output.

## STOP conditions

- Stop if the literal at `README.md:130` is confirmed to be a currently deployed credential and the operator cannot rotate it immediately; remove access before proceeding.
- Stop if updating docs requires reading or copying a value from a private environment file.
- Stop if the team still intentionally deploys the Express server separately; document the deployment boundary first instead of declaring it legacy.

## Maintenance notes

Keep `.env.example`, README, and AGENTS.md in the same pull request whenever a new environment variable, deployment service, or architecture boundary is introduced. Treat any credential-like literal in a tracked file as an incident, not an example.
