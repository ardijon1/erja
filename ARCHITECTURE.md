# ARCHITECTURE.md — Ardalan Agent Site

Read before implementing any feature. Do not create directories outside this tree without updating it first.

## 1. Directory Tree

```
ardalan-agent-site/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                 # Home: profile hero, calculator, FAQ preview, referral CTA
│   │   ├── card/page.tsx            # Compact digital business card (QR-scan destination)
│   │   ├── faq/page.tsx             # Full FAQ page (grows beyond home preview)
│   │   └── r/[code]/page.tsx        # Referral entry — attributes visit, redirects to /
│   ├── admin/
│   │   ├── login/page.tsx
│   │   └── dashboard/page.tsx       # Top-referrers table + lead list
│   ├── api/
│   │   ├── leads/route.ts           # POST: consultation form submit
│   │   ├── calculator/route.ts      # POST: coverage estimate (pure calc, no DB write required)
│   │   ├── vcard/route.ts           # GET: generates .vcf for "Add to Contacts"
│   │   ├── qr/route.ts              # GET: generates QR PNG/SVG for card/referral link
│   │   ├── referral/[code]/route.ts # GET: sets attribution cookie, logs click
│   │   └── admin/
│   │       ├── login/route.ts       # POST: verify password, issue session
│   │       ├── leaderboard/route.ts # GET: top referrers + recent leads (auth)
│   │       ├── logout/route.ts      # POST: clear session
│   │       └── session/route.ts     # GET: session validity check
│   ├── layout.tsx                   # RTL <html dir="rtl">, ThemeProvider, Vazirmatn font
│   └── globals.css                  # design tokens (CSS vars), Tailwind layer imports
├── components/
│   ├── ui/                          # shadcn primitives (button, card, dialog, table, form...)
│   ├── profile/                     # ProfileHero, StatsRow, TrustBadges
│   ├── calculator/                  # NeedsCalculatorForm, ResultCard
│   ├── faq/                         # FaqAccordion, FaqCategoryPicker
│   ├── referral/                    # ReferralBanner, LeaderboardTable
│   ├── card/                        # DigitalCard, AddToContactsButton, QrBlock
│   └── shared/                      # WhatsAppFloatButton, ThemeToggle, Footer
├── content/
│   ├── client.config.ts             # THE per-client file: name, photo, bio, stats, whatsapp msg
│   └── faq.ts                       # FAQ categories + agent-approved answers
├── lib/
│   ├── env.ts                       # zod-validated env, only place process.env is read
│   ├── db.ts                        # Prisma client singleton
│   ├── calculator.ts                # coverage-need formula (pure function)
│   ├── referral.ts                  # cookie attribution logic
│   ├── vcard.ts                     # vCard string builder
│   ├── auth.ts                      # admin session (sign/verify cookie, bcrypt compare)
│   └── logger.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── .agents/skills/
│   ├── scaffold-feature/SKILL.md
│   ├── add-api-route/SKILL.md
│   ├── code-review/SKILL.md
│   ├── refactor/SKILL.md
│   └── write-tests/SKILL.md
├── AGENTS.md · CLAUDE.md · GEMINI.md · ARCHITECTURE.md · DESIGN.md · PROMPT.md · fa_summary.md · project.json
```

## 2. Data Models (Prisma / SQLite)

```prisma
model Referrer {
  id           String   @id @default(cuid())
  code         String   @unique          // short code used in /r/[code]
  displayName  String                    // policyholder's name, entered by agent manually
  createdAt    DateTime @default(now())
  leads        Lead[]
  clicks       ReferralClick[]
}

model ReferralClick {
  id           String   @id @default(cuid())
  referrerId   String
  referrer     Referrer @relation(fields: [referrerId], references: [id])
  createdAt    DateTime @default(now())
  userAgent    String?
}

model Lead {
  id             String    @id @default(cuid())
  name           String
  phone          String
  monthlyIncome  Int?                    // from calculator, optional
  dependents     Int?
  debt           Int?
  estimatedCover Int?                    // calculator output, stored for context
  message        String?
  referrerId     String?
  referrer       Referrer? @relation(fields: [referrerId], references: [id])
  createdAt      DateTime  @default(now())
  status         String    @default("new") // new | contacted | closed
}

model AdminSession {
  id         String   @id @default(cuid())
  tokenHash  String   @unique
  expiresAt  DateTime
  createdAt  DateTime @default(now())
}
```

Notes:
- No `Policyholder`/`User` auth model — referrers are created manually by the agent in the admin dashboard (name only), not self-service accounts. This keeps Phase 1 simple; revisit only if a client asks for self-serve referral signup.
- `estimatedCover` is stored for the agent's context, not recomputed server-side as authoritative advice — see calculator disclaimer in DESIGN.md.

## 3. Routes summary

| Route | Type | Purpose |
|---|---|---|
| `/` | page | Home — all public sections |
| `/card` | page | Compact digital business card for QR scans |
| `/faq` | page | Full FAQ, categorized |
| `/r/[code]` | page | Sets attribution cookie → redirect to `/` |
| `/admin/login` | page | Password login |
| `/admin/dashboard` | page | Leaderboard + leads table (session-protected) |
| `POST /api/leads` | route | Create lead (consultation form) |
| `POST /api/calculator` | route | Pure calc, returns estimate (no DB write) |
| `GET /api/vcard` | route | Returns `.vcf` |
| `GET /api/qr` | route | Returns QR image for a given URL |
| `GET /api/referral/[code]` | route | Logs click, sets signed cookie |
| `POST /api/admin/login` | route | Verifies password, issues session |
| `GET /api/admin/leaderboard` | route | Session-protected: referrer counts + leads |
| `POST /api/admin/logout` | route | Clears session + cookie (POST) |
| `GET /api/admin/session` | route | Checks if current session is valid (frontend auth guard) |

## 4. External services

**There are none that require API keys or rate-limit handling.** This project intentionally has no AI Gateway, no LLM calls, no payment gateway, and no SMS/WhatsApp automated-send API — everything is either static content or a `wa.me` deep link the visitor's own WhatsApp app opens. This is a deliberate contrast with Rahyar (which does need AI Gateway / payment adapters) — do not import patterns from that project's ARCHITECTURE.md here.

## 5. Open / deferred decisions
- **Referral reward mechanism:** not implemented in code. Any cash/discount reward for referrals must be cleared with بیمه مرکزی and the underlying insurer first (legal note in the client's own proposal doc); code only tracks attribution and counts.
- **Multi-client scaling:** for now, one deployment = one client, one `content/client.config.ts`, one SQLite file, one domain. If/when 5+ client sites exist, revisit whether a single multi-tenant deployment (like Rahyar's RLS pattern) is worth the added complexity — do not build that now.
