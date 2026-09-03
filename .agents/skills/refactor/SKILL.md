---
name: refactor
description: Use when restructuring existing code in the Ardalan Agent Site without changing behavior (e.g. extracting a shared component, moving logic from a component into /lib).
---

# Refactor

1. Confirm current behavior first (read the code + its tests) — do not refactor and change behavior in the same pass.
2. Preserve the `/lib` ↔ `/components` ↔ `/app` boundary from AGENTS.md §2.1; a refactor is a common place this accidentally breaks — re-check the ESLint import rule after moving files.
3. If extracting client-specific text you find hardcoded in a component, move it into `content/client.config.ts` as part of the refactor — this is in scope even though it wasn't the original ask.
4. Output as targeted diffs, never full-file rewrites (AGENTS.md global rule).
5. Run `pnpm verify` after the refactor; if tests were tightly coupled to the old structure, update them minimally rather than deleting coverage.
