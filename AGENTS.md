# Khủng Long Shop — Agent Memory File

> This file is automatically read by Codex and other AI coding agents at session start.
> Do NOT delete. Update this file whenever major architectural decisions are made.

---

## Project Overview

**Name:** Đảo Khủng Long Shop (`khunglongshop`)
**Type:** Vietnamese collectible toy e-commerce website
**Theme:** Dinosaur island / volcanic aesthetic — dark, game-adjacent storefront
**Language:** Vietnamese UI strings throughout; code and comments in English

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), TypeScript |
| Styling | styled-components (SSR-safe registry setup) |
| Icons | Tabler Icons |
| Backend API | Express.js on **port 3001** |
| ORM | Prisma |
| Database | MySQL |
| Package Manager | npm |
| Editor | VSCode on Windows (PowerShell) |

---

## Design Tokens

```
Background:   #070707  (primary dark)
Accent:       #e85d00  (orange)
Text:         #ffffff / #cccccc
```

- Dark theme throughout — always check color contrast before adding new text colors
- Chibi/kawaii dinosaur mascot ("Ricon") — black and gold branded aesthetic
- No Tailwind — all styles via styled-components

---

## Project Structure

```
khunglongshop/
├── app/                    # Next.js App Router
│   ├── (storefront)/       # Public-facing pages
│   │   ├── page.tsx        # Homepage (slider + product sections)
│   │   ├── shop/           # Product listing
│   │   ├── about/          # About page
│   │   └── cart/           # Cart page
│   ├── admin/              # CMS / Admin dashboard
│   │   ├── sliders/        # Slider management
│   │   ├── products/       # Product management
│   │   └── users/          # User management
│   └── api/                # Next.js API routes (proxies to Express)
├── components/             # Shared UI components (styled-components)
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Prisma migration history
├── server/                 # Express.js API (port 3001)
│   ├── routes/             # API route handlers
│   └── index.ts            # Express entry point
├── public/                 # Static assets (images stored here)
├── lib/                    # Shared utilities
└── AGENTS.md               # ← This file
```

---

## Data & Schema Rules

### Prices
- Stored as **integer (VND)** — no decimals, no foreign currency
- Displayed with **"đ" suffix** — e.g. `150,000đ`

### Product Images
- Stored as **project-relative paths** — e.g. `/public/products/dino-01.jpg`
- Never store absolute URLs or external CDN links unless explicitly decided

### User Roles
- Defined as a **non-null enum** in Prisma schema
- Do not change to nullable or string without migration

### Prisma Notes
- Always run `npx prisma generate` after schema changes
- Run `npx prisma migrate dev` for local migrations
- Be careful with concurrent writes — use transactions where needed
- Vietnamese strings in seed files: use Unicode escapes or UTF-8 BOM-safe approach

---

## API Architecture

```
Browser → Next.js App Router (port 3000)
              ↓
         Next.js API Routes (/api/*)
              ↓
         Express.js API (http://localhost:3001)
              ↓
         Prisma → MySQL
```

- Next.js API routes are **thin proxies** to Express — business logic lives in Express
- Always prefix Express routes consistently (e.g. `/api/products`, `/api/sliders`)

---

## Core Features

### Storefront
- **Homepage:** Hero slider (autoplay) + product sections by category
- **Shop:** Product listing with filter/sort
- **Product Detail:** Blind box reveal mechanic
- **Cart & Wishlist:** Managed via API, not local state only
- **About:** Brand story page

### Blind Box System
- Customer purchases a blind box product
- On purchase confirmation → system generates a **redemption code**
- Code can be entered to unlock in-game rewards
- **Set completion bonus:** collecting all items in a set triggers extra reward

### Admin CMS
- **Slider Management:** CRUD for homepage slider images, order, visibility
- **Product Management:** Create/edit products, upload images, set blind box config
- **User Management:** Role-based access, non-null role enum

---

## Known Bugs — Already Fixed (Do NOT reintroduce)

| Bug | Fix Applied |
|---|---|
| styled-components SSR hydration flash | Registry pattern in `app/layout.tsx` |
| Homepage slider autoplay stopping | `setInterval` with proper cleanup in `useEffect` |
| Empty product sections | Fixed Express → Next.js API response shape mismatch |
| Invisible text (contrast) | Always use `#fff` or `#ccc` on dark backgrounds |
| Cart/wishlist API errors | Normalized response handling in all fetch calls |
| Vietnamese strings corrupted | Use Node.js scripts with Unicode escapes for seeds |
| Mixed VI/EN UI strings | All user-facing strings must be Vietnamese |

---

## Coding Conventions

- **TypeScript strict mode** — no `any` unless absolutely necessary
- **Async/await** over `.then()` chains
- **Named exports** for components, default exports for pages
- **Component files:** PascalCase (`ProductCard.tsx`)
- **Utility files:** camelCase (`formatPrice.ts`)
- Error boundaries and loading states required for all data-fetching components
- Always handle empty/null API responses gracefully — never assume data exists

---

## Workflow

This project uses an **AI-assisted spec-driven workflow**:

1. `create-spec` — Write a spec file describing the feature
2. `review-spec` — Validate and refine the spec
3. `implement-spec` — Codex implements from the spec
4. Report results back for diagnosis and iteration

Spec files live in `.codex/specs/` (or equivalent configured path).

---

## Environment

- **OS:** Windows, PowerShell
- **Node:** v20.x
- **Dev ports:** Next.js `3000`, Express `3001`
- **DB:** MySQL (local dev), configure via `DATABASE_URL` in `.env`

```env
DATABASE_URL="mysql://user:password@localhost:3306/khunglongshop"
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## What NOT to Do

- Do not install packages without checking compatibility with Node v20
- Do not use `npm audit fix --force` — it may introduce breaking changes
- Do not change Prisma role field to nullable
- Do not store prices as floats or strings
- Do not use Tailwind (not installed)
- Do not hardcode port numbers — use env vars
- Do not mix Vietnamese and English in user-facing UI strings
