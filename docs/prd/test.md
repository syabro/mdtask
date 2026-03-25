# Test — mdtask

Testing infrastructure, patterns, and helpers.

## Tasks

- [ ] TST-001 Group related assertions into fewer test blocks
  Many tests are single-assertion one-liners, creating vertical noise.
  Group logically related assertions into shared `it()` blocks.

  Example: instead of 5 separate `it('parses tag X')` with one expect each,
  one `it('parses various tag formats')` with multiple expects.

  Goal: fewer test blocks, same coverage, better readability.
