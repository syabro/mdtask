# Test — mdtask

Testing infrastructure, patterns, and helpers.

## Test grouping convention

Group related assertions into a single `it()` block when they test variations of the same concept. Keep distinct edge cases (error paths, security, OS boundaries) as separate tests.

Do NOT merge tests that require different filesystem setup (different `writeFileSync` calls).

## Tasks

