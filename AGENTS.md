# Đảo Khủng Long Shop - Agent Guide

> Codex and other coding agents read this file at session start. Keep it aligned with architectural, deployment, and domain decisions.

## Project overview

- **Name:** Đảo Khủng Long Shop (`khunglongshop`)
- **Product:** Vietnamese collectible-toy e-commerce storefront and admin dashboard
- **Theme:** Dinosaur island with a dark, game-adjacent visual identity
- **Language:** Vietnamese user-facing text; English code and comments

## Technology

| Layer | Current technology |
|---|---|
| Application | Next.js App Router, React, TypeScript |
| API | Next.js App Router route handlers |
| ORM | Prisma |
| Production database | TiDB Cloud (MySQL-compatible) |
| Authentication | NextAuth |
| Production uploads | Vercel Blob |
| Styling | styled-components and Tailwind CSS |
| Deployment | Vercel |
| Package manager | npm |

Both styled-components and Tailwind dependencies are present. Match the surrounding module when changing UI; do not force either styling approach into code that uses the other.

## Project structure

```text
app/
  (public)/          Public storefront and account routes
  (dashboard)/       Admin dashboard routes
  api/               Active App Router API handlers
components/          Shared UI and feature components
lib/                 Shared application and domain utilities
prisma/
  schema.prisma      Prisma schema
  migrations/        Reviewed migration history
public/              Repository-owned static assets
server/              Legacy development-only Express application
```

Current handlers under `app/api/` access Prisma directly. The `server/` directory is legacy and is not part of the Vercel production architecture. Do not change or start it for Vercel production unless the team makes a separate migration or deployment-boundary decision. Its package script, `npm run dev:api`, is only for explicit legacy development work.

The public route group is `app/(public)`, and the dashboard route group is `app/(dashboard)`.

## Design guidance

- Preserve the dark storefront theme and verify readable color contrast.
- Keep the black-and-gold Ricon dinosaur branding consistent with nearby UI.
- Reuse existing design tokens and component patterns before introducing new ones.
- Keep all user-facing strings in Vietnamese.

## Data and schema rules

### Prices

- Store prices as integer VND values, never floats, decimal currency values, or strings.
- Format displayed prices as Vietnamese đồng, for example `150.000đ`.

### Product images

- Image fields may contain repository-local public paths or Vercel Blob HTTPS URLs.
- Pass catalog image values through `normalizeCatalogImage` where the surrounding flow does so.
- Any remote image host must also be allowed by the Next.js image configuration before use with `next/image`.
- Do not introduce arbitrary external image hosts.

### User roles

- The Prisma role field is a non-null enum.
- Do not make it nullable or replace it with an unconstrained string without an approved migration.

### Prisma and migrations

- Run `npm run db:generate` after Prisma schema changes.
- Develop and review migration SQL outside production before applying it.
- Validate migrations for TiDB Cloud compatibility.
- Apply reviewed migration SQL or the team's approved TiDB migration procedure in production.
- Never run `npm run db:push` against production.
- Use transactions where supported and appropriate for related writes.

## API architecture

```text
Browser
  -> Next.js App Router pages and route handlers
  -> Prisma
  -> TiDB Cloud

Production uploads
  -> App Router upload handler
  -> Vercel Blob
```

- Keep business rules and authorization checks in the active App Router flow.
- Return stable, typed response shapes and handle empty or null results explicitly.
- Do not describe active App Router handlers as proxies to the legacy Express server.

## Domain behavior

### Storefront

- The homepage contains hero and merchandise sections.
- Shop and product routes expose catalog browsing and product details.
- Cart, wishlist, checkout, account, and order flows use application APIs and persisted data.

### Blind-box system

- A customer purchases a blind-box product.
- Purchase confirmation generates or assigns a redemption code according to the existing flow.
- The code unlocks an in-game reward.
- Completing a configured set can trigger the existing set-completion bonus behavior.

### Admin dashboard

- Admin routes manage products, homepage content, orders, users, and collectible configuration.
- Preserve role-based access checks and the non-null role enum.

## Coding conventions

- Keep TypeScript strict and avoid `any` unless an integration boundary makes it unavoidable.
- Prefer `async`/`await` to promise chains.
- Follow existing export and naming conventions in the surrounding directory.
- Use PascalCase for React component files and camelCase for utility files.
- Add loading, empty, and error states to data-fetching UI.
- Never assume API data is present or correctly shaped without validation.
- Preserve valid UTF-8 Vietnamese text when editing files.

## Local workflow

- Primary web application: `npm run dev:web`
- Legacy Express server, only when explicitly required: `npm run dev:api`
- Prisma client generation: `npm run db:generate`
- Type checking: `npm run type-check`
- Non-database tests: `npx vitest run --exclude "tests/otp/**"`

Local credentials belong in an ignored private environment file based on `.env.example`. Never read, print, commit, or copy credentials into documentation or fixtures.

## Do not

- Do not use `npm audit fix --force` without a reviewed dependency-upgrade plan.
- Do not make the Prisma role field nullable.
- Do not store prices as floats or strings.
- Do not mix Vietnamese and English in user-facing UI.
- Do not hardcode credentials, deployment URLs, or private database connection values.
- Do not use `db:push` against production.
- Do not treat `server/` as part of the Vercel production runtime.
