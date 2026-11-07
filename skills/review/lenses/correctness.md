# Correctness lens

**Owns**: whether the code does what it intends, and whether its tests prove it.

Look for:

- **Logic**: wrong conditions, off-by-one, unhandled empty, null, or error cases.
- **Failure paths**: swallowed errors, lost causes, the wrong failure mode, missing cleanup.
- **Concurrency and ordering**: races, unawaited work, shared mutable state.
- **Regressions**: callers of changed functions, types, and contracts. Read them, and read the whole file when a hunk does not explain itself.
- **Test honesty**: weakened or deleted assertions, skipped tests, expected values edited to match output, special-cased test inputs, mocks that replace the behaviour under test.
- **Test coverage**: new branches and failure paths without a test.

Put a concrete triggering input or call path in each finding's `evidence`.

**Hand off**: structure goes to design; naming, reuse, and style to standards; issue gaps to spec; vulnerabilities to security.
