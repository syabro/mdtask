# Test — mdtask

Testing infrastructure, patterns, and helpers.

## Test grouping convention

Group related assertions into a single `it()` block when they test variations of the same concept. Keep distinct edge cases (error paths, security, OS boundaries) as separate tests.

Do NOT merge tests that require different filesystem setup (different `writeFileSync` calls).

## Tasks

- [x] TST-044 Group related assertions into fewer test blocks
  Many tests are single-assertion one-liners, creating vertical noise.
  Group logically related assertions into shared `it()` blocks.

  Example: instead of 5 separate `it('parses tag X')` with one expect each,
  one `it('parses various tag formats')` with multiple expects.

  Goal: fewer test blocks, same coverage, better readability.

  **Implemented:**
  - Reduced test blocks from 222 to 194 (13% reduction) across task.test.ts and list.test.ts
  - task.test.ts: merged ID formats, invalid headers, priorities, tags, property keys, CRLF, standalone tokens
  - list.test.ts: merged excludePrefixes and pipe behavior tests
  - Same assertion coverage — no tests removed, only grouped
