# DESIGN.md — Ardalan Agent Site

## 1. Tool segregation (strict)
- **shadcn/ui (Radix primitives)** owns: components (button, card, dialog, accordion, table, input), typography scale, color tokens, dark/light theme values, spacing scale for component internals.
- **Tailwind CSS** is used ONLY for: layout (flex/grid), page-level spacing/margins between blocks, responsive breakpoints. Never set a color or font-size utility class where a design-token/shadcn variant already exists.

## 2. RTL & localization
- `<html lang="fa" dir="rtl">` set once in `app/layout.tsx`. No per-component `dir` overrides.
- Use logical CSS properties everywhere: `margin-inline-start/end`, `padding-inline-*`, `inset-inline-*` — never `margin-left/right`. Tailwind's logical utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`) are mandatory instead of `ml-*`/`mr-*`/`pl-*`/`pr-*`.
- All numerals in user-facing copy (stats, prices, phone) rendered as Persian digits via a single `toPersianDigits()` helper in `/lib` — never format numbers ad hoc in components.
- Single language (Persian) — no i18n framework needed. Do not add `next-intl` or similar; it's unnecessary weight for a single-language site.

## 3. Typography & font
- Vazirmatn, self-hosted, loaded once via `next/font/local` in `app/layout.tsx`, exposed as a CSS variable (`--font-vazirmatn`) and applied at the `<body>` level. No other font.

## 4. Theming
- Dark/light via `next-themes`, class strategy (`class="dark"` on `<html>`), toggle persisted in `localStorage`. Tokens defined as CSS variables in `globals.css` under `:root` and `.dark` — shadcn's default token naming (`--background`, `--foreground`, `--primary`, etc.), no custom renaming.
- Default theme: light. Toggle lives in the header on every page (`components/shared/ThemeToggle.tsx`).

### 4.1 Palette — «مهر اعتماد» (Seal of Trust)
Derived from the life-insurance subject itself, not default SaaS hues: dark pine green (stability, long-term commitment) on warm paper ground, with a single bronze accent like a seal on a formal document. Deliberately avoids both the warm-cream+terracotta AI cliché and black+neon fintech cliché.

Rationale:
- RTL + personal trust: the site revolves around trust in one named agent (not a big brand), so warm human tones beat cold corporate blue.
- Bronze instead of red/orange for CTAs («شروع مشاوره», «افزودن به مخاطبین») — conveys assurance and formality, not sales urgency.
- Soft green carries **meaning only** (satisfaction score, "تماس گرفته شد" status in admin, trust ticks) — never decoration.
- No heavy card shadows: hairline borders (per §1) — the feel of a formal document/office, not a card-app. `Card` uses `border` with no `shadow-*`.

Token table (implemented in `globals.css`):

| Token | Light | Dark |
|---|---|---|
| `--background` | `#FBF8F2` | `#10201C` |
| `--card` | `#FFFFFF` | `#172B25` |
| `--foreground` | `#16302B` | `#EDE7DA` |
| `--muted-foreground` | `#6B7570` | `#8FA39B` |
| `--primary` (CTA bronze) | `#C98A3B` | `#D9A24B` |
| `--success` (approval only) | `#4F7A6B` | `#6FA08D` |
| `--border` / `--input` | `#D9D2C3` | `#28433C` |

- Typography variety comes from Vazirmatn weights only (400 body, 500–600 headings/stats) — no second font (stack lock in AGENTS.md §1).
- All user-facing numbers use Persian digits **with the Persian thousands separator «٬»** via `formatNumberFa()` / `formatCurrencyIRT()` in `lib/format.ts` — never `toLocaleString("fa-IR")` ad hoc in components.
- **Currency standard: تومان (IRT) end-to-end** — user input, calculator constants, DB storage, and display are all Toman (since formula v2-2026-08-irt). Never re-introduce ریال or a mid-pipeline conversion. Money input fields format live while typing via `normalizeNumericInput()` (Persian digits + «٬»), and stored values are always read back through `parseIrrInput`-style normalization.

## 5. Page-level design intent

**Home (`/`)** — single scrolling page, sections in order: Profile hero (photo, name, title, years, insured count, satisfaction score) → Needs Calculator (interactive, shows result inline, CTA to submit lead) → FAQ preview (3–4 top questions + "see all" link to `/faq`) → Referral CTA (share-your-link block, visible to anyone who arrives via `/r/[code]`) → Footer (contact, WhatsApp float button persists across whole page).

**Site header (public pages)** — right cluster next to the theme toggle: a lock icon button linking to `/admin/dashboard` (server redirects to `/admin/login` when unauthenticated). This is the single management entry point; no visible "admin" text link anywhere on public pages.

**Digital Card (`/card`)** — deliberately minimal, mobile-first, no navigation chrome: photo, name, title, one-line bio, "Add to Contacts" (triggers `/api/vcard` download), WhatsApp button, QR of the card's own URL for further sharing. This is the page a QR scan lands on — it must render meaningfully in under 1s on a mid-range Android phone.

**FAQ (`/faq`)** — category picker (chips: خسارت، تمدید، تغییر اطلاعات، …) filters an accordion list below. All content from `/content/faq.ts`. A persistent note above the list states answers are written and approved by the agent, not AI-generated — this is a trust/compliance signal, keep it visible, don't bury it in a tooltip.

**Referral landing (`/r/[code]`)** — no distinct UI; sets a cookie server-side then redirects to `/`. If the code is invalid, redirect to `/` without attribution (fail silently, no error page).

**Admin login (`/admin/login`)** — single password field, no username, no "forgot password" flow (agent resets via env var + redeploy).

**Admin dashboard (`/admin/dashboard`)** — two blocks: "Top Referrers" table (name, click count, lead count, sorted desc) and "Leads" table (name, phone, source referrer if any, calculator estimate if any, status, created date). No charts needed at this scale — plain tables.

## 6. States to design for every data-driven component
Loading skeleton, empty state (e.g., zero referrers yet), and error state (form submit failure) — use shadcn `Skeleton` and a shared `EmptyState` component; don't leave any list/table without all three.
