---
name: write-tests
description: Use when adding or requesting tests for the Ardalan Agent Site — pure logic in /lib, API route handlers, and calculator correctness are the priority areas.
---

# Write Tests

Priority order (this project is small — don't over-test UI):

1. `lib/calculator.ts` — table-test the coverage formula against known input/output pairs; this is the most user-visible piece of logic and the easiest to silently break.
2. `lib/referral.ts` and `lib/auth.ts` — cookie signing/verification, session expiry, bcrypt compare paths (including the failure paths).
3. API route handlers (`app/api/**/route.ts`) — valid input, invalid input (400), and, for admin routes, unauthenticated access (401).
4. `lib/vcard.ts` — output is valid vCard 3.0 for a sample config.
5. Skip snapshot/UI tests for simple presentational components — not worth it at this project's scale; rely on the Phase 5 manual responsive/QA pass instead (PROMPT.md).

Use `vitest`. Run via `pnpm verify`, not a separate ad hoc command.
