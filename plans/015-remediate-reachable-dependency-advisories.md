# Plan 015: Upgrade direct dependencies with reachable security advisories

> **Executor instructions**: Work in a clean branch. Do not use `npm audit fix --force`. Update dependencies deliberately, run the listed checks, and stop on any framework or authentication compatibility break.
>
> **Drift check (run first)**: `git diff --stat 4370999..HEAD -- package.json package-lock.json lib/sanitize.ts utils/authOptions.ts app components tests`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security, dependencies
- **Planned at**: commit `4370999`, 2026-07-14

## Why this matters

`npm audit --omit=dev --json` at the planned commit reports 17 advisories, including high-severity transitive issues through the direct Prisma package and a moderate NextAuth advisory affecting the installed `next-auth` version. The application also invokes DOMPurify before `dangerouslySetInnerHTML`, so its direct outdated DOMPurify dependency is on a reachable content-rendering path. Dependency remediation must be targeted because a blind audit fix can downgrade or otherwise destabilize Next.js.

## Current state

- `package.json:33,43,49-50,77-78` pins direct Prisma client/CLI, DOMPurify, Next.js, NextAuth, and PostCSS ranges.
- `utils/authOptions.ts:1-5,33-154` uses NextAuth credentials sessions on all protected routes.
- `lib/sanitize.ts:1,57-70` imports DOMPurify and returns content to `components/ProductTabs.tsx:166-172`, which uses `dangerouslySetInnerHTML`.
- `npm audit --omit=dev --json` reports direct/affected dependency paths for Prisma, NextAuth, DOMPurify, and Next/PostCSS. Do not rely on its proposed automatic versions without compatibility review.
- The repository guidance in `AGENTS.md:191-192` correctly warns against `npm audit fix --force`; preserve that policy.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Audit baseline/final | `npm audit --omit=dev --json` | No reachable high advisory remains for selected direct paths |
| Generate Prisma client | `npm run db:generate` | Exit 0 |
| Typecheck | `npm run type-check` | Exit 0 |
| Non-DB tests | `npx vitest run --exclude "tests/otp/**"` | All pass |
| Production build | `npm run build` | Exit 0 with a reachable non-production database |
| Lockfile review | `npm ci --ignore-scripts` | Exit 0 in a clean checkout |

## Scope

**In scope**:

- `package.json`
- `package-lock.json`
- Directly affected compatibility code and focused tests only when a targeted upgrade requires it
- `plans/README.md`

**Out of scope**:

- `npm audit fix --force` or broad package-manager rewrites.
- Migrating NextAuth v4 to Auth.js v5 unless the selected patched v4 release cannot work.
- Replacing the sanitization design or changing product-description HTML policy.
- Production database schema changes.

## Steps

### Step 1: Classify audit findings by runtime reachability

Run the baseline audit and create a short classification in the pull request: direct runtime, direct build/dev, transitive runtime, transitive build/dev, and false/irrelevant paths. Prioritize the direct package paths already evidenced above. Do not include advisory exploitation details.

**Verify**: The classification names each high/moderate advisory affecting a direct dependency and explains whether it is runtime-reachable.

### Step 2: Upgrade DOMPurify and verify the product-description boundary

Select a patched DOMPurify release compatible with the installed React/Next setup. Update only the direct version and lockfile. Add or update tests for `sanitizeHtml` so permitted formatting remains and dangerous tags/attributes remain removed before `ProductTabs` renders HTML.

**Verify**: `npx vitest run tests/unit --runInBand` is not valid for Vitest; instead run the exact focused test file(s) created/updated, then `npm run type-check`.

### Step 3: Upgrade NextAuth within v4 if possible

Select a patched NextAuth v4 release rather than jumping major versions. Verify credentials login configuration, JWT callback behavior, session role/id enrichment, middleware integration, and protected-route redirect behavior against `utils/authOptions.ts` and `middleware.ts`.

**Verify**: focused auth/middleware tests pass; `npm run type-check` exits 0.

### Step 4: Upgrade Prisma client and CLI as a matched pair

Choose a patched compatible Prisma release and update `prisma` plus `@prisma/client` together. Generate the client, confirm the TiDB transaction code still typechecks, and run the non-DB suite. Do not change the schema merely to satisfy an upgrade warning.

**Verify**: `npm run db:generate` and `npm run type-check` exit 0.

### Step 5: Reassess Next/PostCSS and remaining transitive advisories

Review the latest compatible patched release line for Next.js 15 and PostCSS. If npm audit only offers an unsafe downgrade or major migration, do not apply it automatically: record the unresolved advisory, upstream relationship, and planned follow-up instead. Update safe transitive dependencies only through their owning direct dependency.

**Verify**: final `npm audit --omit=dev --json` is attached to the pull request and contains no accepted reachable high-severity advisory without an explicit exception.

### Step 6: Run final production gates

Run the exact commands in the table with a real but non-production database connection for build-time Prisma access. Do not print the connection string.

**Verify**: all commands exit 0 and `git diff --check` has no output.

## Test plan

- Sanitization tests for allowed formatting and dangerous markup removal.
- Credentials-session/middleware tests for sign-in, inactive user rejection, role propagation, and protected route access.
- Existing TiDB transaction characterization tests after Prisma upgrade.
- Full non-OTP suite and a production build.

## Done criteria

- [ ] `next-auth` is on a patched compatible v4 release or an approved exception is documented.
- [ ] `dompurify` is on a patched release and sanitization tests pass.
- [ ] `prisma` and `@prisma/client` are updated as a matching pair and generate successfully.
- [ ] Final audit has no unreviewed reachable high-severity advisory.
- [ ] `npm run type-check` passes.
- [ ] `npx vitest run --exclude "tests/otp/**"` passes.
- [ ] `npm run build` passes with a non-production database.

## STOP conditions

- Stop if a proposed update requires downgrading Next.js or moving NextAuth across a major version.
- Stop if an audit fix changes the lockfile beyond the selected dependency tree without a clear reason.
- Stop if sanitization output becomes less restrictive or product description rendering regresses.

## Maintenance notes

Run `npm audit --omit=dev --json` in CI after this plan. Treat audit output as a triage input: track direct reachable issues, not every theoretical dev-only transitive advisory as an emergency.
