---
name: scaffold-feature
description: Use when adding a new page section, page, or self-contained UI feature to the Ardalan Agent Site (e.g. a new home-page section, a new admin table, a new content-driven block).
---

# Scaffold Feature

1. Check ARCHITECTURE.md's directory tree first — place files in the matching existing folder (`components/<domain>/`, `app/<route>/`). Do not invent a new top-level directory.
2. If the feature needs client-specific text/numbers, add fields to `content/client.config.ts` (or `content/faq.ts` for FAQ-shaped content) — never hardcode copy in the component.
3. Component skeleton order: types → pure logic (if any, goes in `/lib`, not the component) → the component itself using shadcn primitives from `components/ui/`.
4. Layout via Tailwind, tokens/typography via shadcn — see DESIGN.md §1 segregation rule.
5. Always include loading/empty/error states for anything backed by data (DESIGN.md §6).
6. Run `pnpm verify` before considering the scaffold done.
