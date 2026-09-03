# AGENTS.md — Ardalan Agent Site (سایت اختصاصی نماینده فروش بیمه عمر)

Single source of truth. Read this before any other file. Rules are imperative — no exceptions without explicit user approval.

## 0. What this project is
A productized, config-driven marketing + lead-gen website for a single life-insurance sales agent. It is sold repeatedly to different agents ("بسته نماینده فروش"), so the codebase is a **template**: one client = one deployment + one content config, never a code fork for content changes.

## 1. Tech Stack Lock (DO NOT change/add/replace without approval)
- **Framework:** Next.js 15 (App Router), TypeScript strict, Node.js runtime (NOT Edge)
- **UI primitives/tokens:** shadcn/ui (Radix) — components, typography, theme tokens, dark/light
- **Utility CSS:** Tailwind CSS 4 — layout, spacing, flex/grid ONLY. Never use Tailwind for colors/typography that belong to design tokens.
- **Fonts:** Vazirmatn (self-hosted via `next/font/local`), no Google Fonts CDN
- **Theming:** `next-themes` (class-based dark/light)
- **DB/ORM:** Prisma 6 + SQLite (`better-sqlite3` file DB) — one file per deployment, no external DB service
- **Forms/validation:** `react-hook-form` + `zod`
- **QR codes:** `qrcode` (server-generated PNG/SVG)
- **vCard:** generated server-side (`.vcf` route handler), no third-party service
- **WhatsApp contact:** `wa.me` deep link only — no WhatsApp Business API, no automated messaging
- **Package manager:** pnpm
- **Hosting:** self-hosted Node process (PM2 or Docker) on Iranian VPS. Never use Vercel-only APIs, Edge runtime, or serverless KV — this must run as a plain Node server.

Changing any library or moving to a different runtime model is strictly prohibited without explicit sign-off.

## 2. Hard Rules

### 2.1 No Circular Imports
`/lib` (db, env, referral logic, calculator logic, validation schemas) MUST NOT import from `/components`, `/app`, or `/content`. ESLint `import/no-restricted-paths` enforces this — do not disable it.

### 2.2 Secure Environment
Direct `process.env` access is forbidden outside `lib/env.ts`. All env vars are loaded, zod-validated, and exported as a typed object from `lib/env.ts`. Required vars: `DATABASE_URL`, `ADMIN_PASSWORD_HASH`, `WHATSAPP_NUMBER`, `SITE_DOMAIN`, `SESSION_SECRET`.

### 2.3 Content is data, not code
All client-specific text (name, bio, stats, FAQ entries, WhatsApp opener message, pricing if shown) lives in `/content/client.config.ts` and `/content/faq.ts`. Components read from content files — never hardcode a client's name, numbers, or FAQ text inside a `.tsx` file. This is what makes the template reusable.

### 2.4 FAQ is never AI-generated
The Q&A / "quick answer assistant" section renders only pre-written, agent-approved static text from `/content/faq.ts`. No LLM call, no dynamic generation, ever — this is a compliance requirement (insurance answer accuracy), not a style preference.

### 2.5 Referral integrity
Referral attribution (`/r/[code]` → cookie → lead form submit) must be tamper-resistant enough for informal use (signed cookie, server-set) but this is NOT a payments/rewards system. No monetary reward logic is implemented in code — see ARCHITECTURE.md open note on compliance with بیمه مرکزی rules.

### 2.6 Incremental Verification
After any code change, run `pnpm verify` (runs `tsc --noEmit`, `eslint`, `vitest run`). Do not proceed to the next step if it fails.

### 2.7 Admin access
`/admin/*` is protected by a single password (`ADMIN_PASSWORD_HASH`, bcrypt-compared) and a signed session cookie. No multi-user auth, no OAuth — this is a single-operator (the agent) tool.

## 3. Directory boundaries
See ARCHITECTURE.md for the full tree. Do not create new top-level directories without updating ARCHITECTURE.md first.
