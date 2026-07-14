# Plan 016: Replace placeholder CI with reproducible verification gates

> **Executor instructions**: Implement only the CI and script changes in scope. This plan intentionally avoids connecting GitHub Actions to TiDB production. Use mocked/non-DB verification where the repository already supports it.
>
> **Drift check (run first)**: `git diff --stat 4370999..HEAD -- .github/workflows/blank1.yml package.json vitest.config.ts tests .env.example`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/015-remediate-reachable-dependency-advisories.md
- **Category**: dx, tests, migrations
- **Planned at**: commit `4370999`, 2026-07-14

## Why this matters

The repository has a GitHub Actions workflow, but it only checks out source and prints placeholder text. Pull requests can therefore merge without TypeScript validation, the non-DB Vitest suite, dependency audit triage, or a generated Prisma client. The application has TiDB-dependent build behavior, so CI needs an explicit boundary: it must verify deterministic code without silently using production data.

## Current state

- `.github/workflows/blank1.yml:1-36` is the only workflow and contains only `echo` commands.
- `package.json:9-17,23-24` defines build/typecheck/test/database scripts. `db:push` exists but is not a safe production migration command.
- `vitest.config.ts:1-14` configures Node tests; the repository convention is `npx vitest run --exclude "tests/otp/**"` when a live MySQL/TiDB database is unavailable.
- `plans/README.md` records several plans whose executor verification uses `npm run db:generate`, `npm run type-check`, and the non-OTP suite.
- Current production build can query Prisma during static generation, so do not make GitHub Actions run a real production build against TiDB without an isolated database strategy.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Clean install | `npm ci` | Exit 0 |
| Generate client | `npm run db:generate` | Exit 0 |
| Typecheck | `npm run type-check` | Exit 0 |
| Non-DB tests | `npx vitest run --exclude "tests/otp/**"` | All pass |
| Dependency audit | `npm audit --omit=dev --audit-level=high` | Exit 0 after plan 015 or approved exception |
| Workflow syntax | `npx actionlint .github/workflows/blank1.yml` | Exit 0 if actionlint is adopted |

## Scope

**In scope**:

- `.github/workflows/blank1.yml` (rename only if references are updated)
- `package.json` for a non-DB verification script if needed
- `tests/` only if existing tests require a documented dummy environment variable
- `.env.example` comments only if CI-specific non-secret variables must be explained
- `plans/README.md`

**Out of scope**:

- Vercel deployment configuration.
- Using production TiDB credentials in GitHub Actions.
- Running destructive migrations, `prisma db push`, seed, repair, or backfill scripts in CI.
- Browser E2E infrastructure; propose it separately after baseline CI is green.

## Steps

### Step 1: Define the non-DB verification contract

Add a script such as `test:ci` only if it improves clarity. It must set no secret values and must run the same exclusions used by existing plans. If Prisma import requires `DATABASE_URL`, supply a shell-only dummy URL in CI, never commit it to an environment file.

**Verify**: locally run the exact CI test command from a clean shell and confirm it exits 0 without accessing TiDB.

### Step 2: Replace the placeholder workflow

Use `actions/checkout@v4` and `actions/setup-node@v4` with the Node version declared by the repository's supported runtime. Enable npm cache keyed by `package-lock.json`. Run, in order:

1. `npm ci`
2. `npm run db:generate`
3. `npm run type-check`
4. non-DB Vitest suite
5. dependency audit gate after plan 015 establishes its accepted baseline

Use least-privilege workflow permissions. Make the workflow run on `pull_request`, pushes to `main`, and manual dispatch, matching existing intent.

**Verify**: workflow YAML parses and a GitHub Actions run shows each named gate.

### Step 3: Make migration boundaries explicit

Add a CI check that confirms Prisma schema generation, but never applies migrations. Document the production process in README/plan index: reviewed migration SQL or the approved TiDB process runs manually with a backup and valid `DATABASE_URL`.

If the team chooses Prisma migration deployment later, create a separate migration-governance plan; do not add `prisma migrate deploy` blindly because the repository contains manually named SQL migrations.

**Verify**: `rg -n "db:push|migrate deploy|db execute" .github package.json` shows no destructive database operation in CI.

### Step 4: Add useful artifacts and failure messages

Publish Vitest coverage only if it is already configured to produce a stable report without adding a paid service. Otherwise keep the first workflow simple and make job step names diagnostic: install, Prisma generate, typecheck, tests, audit.

**Verify**: an intentionally failing local typecheck is reported at the `Typecheck` step when tested on a temporary branch; revert that temporary experiment before merge.

## Test plan

- Local parity run of every CI command.
- Pull request workflow run with cache miss and cache hit.
- Confirm the workflow does not receive or log production database credentials.
- Confirm test failures produce a nonzero job result.

## Done criteria

- [ ] `.github/workflows/blank1.yml` no longer contains placeholder `echo` steps.
- [ ] CI runs clean install, Prisma generation, typecheck, and non-DB tests on PRs and `main` pushes.
- [ ] CI does not run `db:push`, seed, repair, backfill, or production migrations.
- [ ] CI uses npm caching and least-privilege permissions.
- [ ] Dependency audit gate is enabled after plan 015's baseline is accepted.
- [ ] A real GitHub Actions run is green.

## STOP conditions

- Stop if the test suite needs real TiDB data to execute; do not point CI at production. Report the missing test seam.
- Stop if a dependency audit still fails for accepted advisories; resolve or formally document exceptions before making it a blocking gate.
- Stop if the repository's supported Node version cannot be confirmed from source/hosting configuration.

## Maintenance notes

Every new required check belongs in CI and the README verification section. Keep production migration execution manual until the migration history is normalized and an isolated CI database strategy is explicitly approved.
