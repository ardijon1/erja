---
name: code-review
description: Use before considering any change complete, or when explicitly asked to review a diff for the Ardalan Agent Site.
---

# Code Review

Check against AGENTS.md and DESIGN.md, in this order:

1. **Stack lock:** no new dependency introduced outside AGENTS.md §1 without approval.
2. **Content isolation:** no client-specific string/number hardcoded outside `content/`.
3. **No AI in FAQ path:** confirm nothing in the diff calls an LLM/AI service for FAQ or advice content.
4. **RTL/logical CSS:** no `ml-*`/`mr-*`/`pl-*`/`pr-*` or `margin-left`/`margin-right` — must be `ms-*`/`me-*`/`ps-*`/`pe-*` or logical properties.
5. **Tool segregation:** no color/typography Tailwind utility used where a shadcn token/variant exists.
6. **Env access:** no raw `process.env` outside `lib/env.ts`.
7. **Admin routes:** session check present before any data access.
8. **`pnpm verify` passes** (tsc, eslint, vitest) — do not approve a diff that doesn't.
9. **No Mock Data:** Ensure that all newly added UI elements are fully bound to real database models or state variables. Reject any local hardcoded dummy data arrays in UI views.
10. **Zero-Trust Sync/API Security:** Check that every new data-exchanging route, event, or sync controller has a verified token validation check before reading or writing data. Public access to syncing logic must be rejected with 401.
