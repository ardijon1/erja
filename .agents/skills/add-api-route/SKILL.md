---
name: add-api-route
description: Use when adding a new Next.js route handler under app/api/ (e.g. a new admin endpoint, a new lead-capture endpoint). This project has no external backend — "API route" means a Next.js Route Handler.
---

# Add API Route

1. Confirm the route belongs in `app/api/<name>/route.ts` (or nested, e.g. `app/api/admin/<name>/route.ts`) per ARCHITECTURE.md's routes table. Add the route to that table if it's new.
2. Validate all input with a `zod` schema — reject early with a 400, never trust client input for `Lead`/`Referrer` writes.
3. Any DB access goes through `lib/db.ts` (Prisma singleton) — never instantiate a new PrismaClient in a route file.
4. Admin-only routes: verify the session via `lib/auth.ts` at the top of the handler before touching any data; return 401 immediately if invalid.
5. No `process.env` access in the route file — pull config from `lib/env.ts`.
6. Write a test hitting the handler with valid and invalid input before marking the route done.
7. **Security Gate:** If the endpoint involves syncing, modifying, or reading user-specific data, it MUST run an authentication middleware/checker at the top. Return 401/403 immediately upon failure.
8. **Auth Test Cases:** When writing tests for this route, you MUST include a test case that hits the route with NO credentials and verifies it returns a 401.
