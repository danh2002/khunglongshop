# Plan 017: Remove the non-standard build environment that surfaces the false `/404` document error

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4370999..HEAD -- .env.example app/error.tsx app/not-found.tsx "app/(public)/product/not-found.tsx" package.json`
> If any listed file changed since this plan was written, repeat the source
> scan and compare the current-state excerpts before proceeding. If an App
> Router error/not-found file now imports `next/document`, STOP and report the
> exact file and line instead of applying this plan unchanged.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug, dx
- **Planned at**: commit `4370999`, 2026-07-14

## Why this matters

Plan 015 reached the production build gate but `next build` failed while
prerendering `/404` with `<Html> should not be imported outside of
pages/_document`. A complete source scan finds no project import from
`next/document`; the generated `/_not-found` bundle contains only the App
Router not-found/error components, root layout, and Next.js built-ins. The
confirmed project-level build misconfiguration is `.env:2`, which forces `NODE_ENV=development`
during `next build`. Next.js treats that as a non-standard build environment,
and its Pages fallback can emit the misleading `<Html>` error while rendering
`/404`. Removing the override lets Next.js choose `production` for builds and
`development` for the dev server itself.

## Current state

- `.env:2` — ignored local environment file; defines `NODE_ENV=development`
  and is loaded by local `next build`. This is the direct trigger.
- `.env.example:2` — tracked setup template; also defines
  `NODE_ENV=development`, causing new local environments to reproduce the
  invalid build configuration.
- `package.json:7` — the build command is already conventional and must remain
  unchanged:

  ```json
  "build": "prisma generate && next build"
  ```

- `app/not-found.tsx:1-6` — the root not-found page is already a plain App
  Router component and does not use document primitives:

  ```tsx
  import Link from 'next/link'

  export default function NotFound() {
    return (
      <>
        <main className="grid min-h-full place-items-center ...">
  ```

- `app/error.tsx:2-8` — the root error boundary is a client component and does
  not use document primitives:

  ```tsx
  "use client"

  import { AiOutlineWarning } from "react-icons/ai"

  const GlobalError = ({ error }: { error: Error }) => {
    return (
  ```

- `app/(public)/product/not-found.tsx:1-6` follows the same plain-component
  structure as the root not-found page.
- Verified source scan at the planned commit/worktree state:

  ```text
  rg -n --hidden --glob '!node_modules/**' --glob '!.next/**' 'next/document' .
  # expected: no output, exit 1
  ```

Do not add `pages/_document.tsx`. This application uses the App Router and its
root `<html>`/`<body>` structure correctly lives in `app/layout.tsx`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Invalid import scan | `rg -n --hidden --glob '!node_modules/**' --glob '!.next/**' 'next/document' .` | No output; exit 1 |
| Environment-key check | `Get-ChildItem .env,.env.example -ErrorAction SilentlyContinue \| Select-String -Pattern '^\s*NODE_ENV\s*='` | No output after Step 2 |
| Typecheck | `npm run type-check` | Exit 0 |
| Clean production build | `Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue; npm run build` | Exit 0; no `/404` prerender error |
| Diff hygiene | `git diff --check` | No output |

The build requires a reachable non-production database because build-time
routes use Prisma. Load the executor environment normally, but never print the
database connection string or any other credential.

## Scope

**In scope** (the only configuration files the executor may modify):

- `.env` — remove the `NODE_ENV` assignment locally; this file is ignored and
  must never be added to Git.
- `.env.example` — remove the `NODE_ENV` assignment from the tracked template.
- `plans/README.md` — status update only after all done criteria pass.

**Out of scope**:

- `app/error.tsx`, `app/not-found.tsx`, and
  `app/(public)/product/not-found.tsx`; they contain no invalid document import.
- `app/layout.tsx`; its lowercase `<html>` and `<body>` elements are correct
  App Router structure.
- `package.json`, `package-lock.json`, and all dependency versions.
- Any lint warning, mojibake, styling, refactor, or unrelated build warning.
- Adding a Pages Router `pages/_document.*`, `404.*`, `_error.*`, or `500.*`.
- Production environment variables or database schema/data.

Generated `.next/` output may be deleted and regenerated for verification but
must not be committed.

## Git workflow

- Branch: `codex-plan-017-exec-20260714`
- One implementation commit only:
  `fix(env): remove NODE_ENV override that broke production build prerender`
- The executor commit is expected to contain only `.env.example`. `.env`
  remains ignored and uncommitted. After review approval, the advisor updates
  `plans/README.md` with the implementation commit hash.
- Do not push or open a PR unless the operator explicitly requests it.

## Steps

### Step 1: Prove that no project source imports document primitives

Run the exact invalid-import scan from the command table. Also inspect the
three App Router error/not-found files named in "Current state" and confirm
they remain plain React components using no `Html`, `Head`, `Main`, or
`NextScript` imported from `next/document`.

**Verify**:

```powershell
rg -n --hidden --glob '!node_modules/**' --glob '!.next/**' 'next/document' .
```

Expected: no output and exit code 1. If there is a match, trigger the first
STOP condition; do not continue with the environment-only fix.

### Step 2: Remove the non-standard `NODE_ENV` override

Delete only the complete `NODE_ENV=development` line from `.env.example` and,
if it exists in the executor checkout, `.env`. An isolated worktree may not
contain `.env` because it is ignored; absence is acceptable. Do not read,
rewrite, reorder, normalize, or print any other
environment entry. Do not add a replacement `NODE_ENV=production`: Next.js
sets the correct value for `next build` and `next dev` automatically.

**Verify**:

```powershell
Get-ChildItem .env,.env.example -ErrorAction SilentlyContinue |
  Select-String -Pattern '^\s*NODE_ENV\s*='
```

Expected: no output.

Then verify the tracked diff without exposing environment values:

```powershell
git diff -- .env.example
git check-ignore -v .env
```

Expected: the `.env.example` diff removes exactly one `NODE_ENV` line, and
`.env` remains ignored by `.gitignore`.

### Step 3: Install dependencies in the isolated worktree

An isolated git worktree does not share the main checkout's `node_modules`.
Install the locked project dependencies before running any build or typecheck
command. Skip this step only when `node_modules` is already present in the
executor worktree.

**Verify**:

```powershell
npm install
Test-Path -LiteralPath node_modules
```

Expected: `npm install` exits 0 and `Test-Path` prints `True`. The install must
run in the isolated executor worktree, never in the main checkout. If it
changes `package.json` or `package-lock.json`, trigger the out-of-scope STOP
condition instead of committing dependency metadata.

### Step 4: Run a clean production build

Delete the existing ignored `.next` directory so the result cannot reuse the
failed build's artifacts. Run the normal build command with a reachable
non-production database. Do not alter the build script or force `NODE_ENV` in
the shell.

**Verify**:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
```

Expected: exit code 0. Output must not contain either `Error occurred
prerendering page "/404"` or `<Html> should not be imported outside of
pages/_document`.

### Step 5: Run final scope and quality gates

Run the repository typecheck and inspect only tracked changes. Do not address
warnings unrelated to this plan.

**Verify**:

```powershell
npm run type-check
git diff --check
git status --short
```

Expected: typecheck exits 0, `git diff --check` has no output, and no tracked
source/config file outside `.env.example` and `plans/README.md` was changed by
this plan. `.env` does not appear because it remains ignored.

### Step 6: Record completion and commit

Only after Steps 1-5 pass, create the single required implementation commit.
After the reviewer approves the commit, the reviewer changes plan 017 from
`READY` to `DONE` in `plans/README.md` and records the commit hash. Keep plan
015 dependent on 017; it becomes eligible to retry once this row is DONE.

**Verify**:

```powershell
git diff --check
git diff --name-only
```

Expected before the executor commit: only `.env.example` is in the tracked
worktree diff. Create the commit, then verify it:

```powershell
git show --name-only --format='%h %s' HEAD
```

Expected after commit: the commit contains only `.env.example`, and the subject
is exactly
`fix(env): remove NODE_ENV override that broke production build prerender`.

## Test plan

- No new unit test is warranted: the regression is build-environment-specific
  and is fully exercised by a clean `next build`.
- Static regression guard: the source scan must continue to return no
  `next/document` imports outside generated/vendor directories.
- Environment regression guard: neither `.env` nor `.env.example` may define
  `NODE_ENV`; Next.js owns the lifecycle-specific value.
- Build regression guard: a clean production build must generate `/404`
  successfully with no document-context error.

## Done criteria

- [ ] `rg -n --hidden --glob '!node_modules/**' --glob '!.next/**' 'next/document' .` returns no matches.
- [ ] `Get-ChildItem .env,.env.example -ErrorAction SilentlyContinue | Select-String -Pattern '^\s*NODE_ENV\s*='` returns no matches.
- [ ] `npm install` exits 0 in the isolated worktree and `node_modules` exists.
- [ ] `npm run type-check` exits 0.
- [ ] A clean `npm run build` exits 0 with no `/404` prerender error.
- [ ] `git diff --check` has no output.
- [ ] No tracked file outside `.env.example` and `plans/README.md` is changed by this plan.
- [ ] `.env` remains ignored and uncommitted.
- [ ] `plans/README.md` shows plan 017 as `DONE`; plan 015 remains dependent on 017.

## STOP conditions

Stop and report back; do not improvise if:

- The source scan finds any project import from `next/document`. Report the
  exact file and line so this plan can be rewritten around the real source
  culprit instead of applying the environment-only fix.
- Any App Router error/not-found file no longer matches the plain-component
  structures documented above.
- Removing `NODE_ENV` changes or exposes any other environment entry.
- The clean build still emits the `<Html>`/`/404` error. Preserve the complete
  build output and report the first error that appears before the document
  error; do not edit App Router components speculatively.
- The build requires a production database or printing a credential.
- Success would require changing `package.json`, dependency versions, App
  Router files, or any other out-of-scope file.

## Maintenance notes

- Do not restore `NODE_ENV` to `.env` or `.env.example`; `next dev`,
  `next build`, and test tooling set the appropriate lifecycle value.
- Reviewers should confirm that the commit contains no ignored `.env` file and
  no credentials.
- After plan 017 is DONE, retry plan 015 from its first step because its
  dependency/test changes were never committed after the failed build gate.
- If the clean build still fails, the `<Html>` message must be treated as a
  secondary symptom until a project-level `next/document` import is proven.
