# PROMPT.md — Implementation Roadmap (bottom-up, infra-first)

Do not start a phase until the previous one passes `pnpm verify`. Do not build UI before the data/logic it depends on exists and is tested.

## Phase 1 — Infra
1. Next.js 15 + TS strict scaffold, pnpm, ESLint (`import/no-restricted-paths` for `/lib` isolation)
2. `lib/env.ts` — zod schema for all required env vars, fail fast on missing
3. `lib/logger.ts` — minimal structured logger
4. `lib/db.ts` — Prisma client singleton, SQLite datasource
5. `pnpm verify` script wired (tsc + eslint + vitest)

## Phase 2 — Data
1. `prisma/schema.prisma` per ARCHITECTURE.md models (Referrer, ReferralClick, Lead, AdminSession)
2. Initial migration + seed script (one sample referrer for dev)
3. Unit tests for any Prisma query helpers in `lib/`

## Phase 3 — Integrations (no external APIs — local generation only)
1. `lib/vcard.ts` — vCard 3.0 string builder from `content/client.config.ts`
2. `/api/vcard` route — returns `.vcf` with correct headers
3. `/api/qr` route — `qrcode` package, returns PNG/SVG for a given target URL
4. WhatsApp link helper — builds `wa.me` URL with pre-filled message from config

## Phase 4 — Business logic
1. `lib/calculator.ts` — pure function: income, dependents, debt → estimated coverage (document the formula source/assumptions in a code comment; this is not regulated financial advice, label it as an estimate everywhere it's shown)
2. `lib/referral.ts` — attribution cookie set/read, click logging
3. `lib/auth.ts` — admin password verify (bcrypt) + signed session cookie issue/verify
4. `/api/leads`, `/api/calculator`, `/api/referral/[code]`, `/api/admin/login`, `/api/admin/leaderboard` route handlers, each with zod input validation and unit tests

## Phase 5 — Frontend
1. `app/layout.tsx` — RTL, Vazirmatn, ThemeProvider, WhatsApp float button (global)
2. shadcn/ui init + design tokens per DESIGN.md
3. Home page sections: ProfileHero → NeedsCalculatorForm → FaqPreview → ReferralCta
4. `/card` page
5. `/faq` page
6. `/r/[code]` redirect page
7. `/admin/login` + `/admin/dashboard`
8. Responsive/mobile QA pass against the wireframes, then Lighthouse pass on `/card` specifically (fast-load requirement)

## Content prerequisites (block Phase 5, not earlier phases)
Before Phase 5 can be considered done for a real client, `content/client.config.ts` and `content/faq.ts` must be filled with: profile photo, short bio, years of experience, insured count, satisfaction score, WhatsApp number + opener message, and 10–15 FAQ entries — all supplied and approved by the agent (per the proposal doc, §6 "گام بعدی").
