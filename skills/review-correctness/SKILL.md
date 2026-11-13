---
name: review-correctness
description: Correctness review of a change. Judges whether the code does what it intends and whether its tests prove it.
disable-model-invocation: true
---

# Correctness review

Judge whether the code does what it intends, and whether its tests prove it.

Look for:

- **Logic**: wrong conditions, off-by-one, unhandled empty, null, or error cases; keys built from names or other non-unique values; ambiguous input guessed instead of rejected.
- **Failure paths**: swallowed errors, lost causes, the wrong failure mode, missing cleanup; success reported before the write is confirmed; a retry, fallback, or log line that hides a failure instead of fixing its cause.
- **Concurrency and ordering**: races, unawaited work, shared mutable state; retries or parallel writers that create duplicates; one user's action clearing another's work; timeouts shorter than the real worst case.
- **Existing data**: rows, files, and records already stored when the change reshapes or rederives them (migration, backfill, reprocessing); constraints and defaults checked against real data; migrations that are not idempotent. Not needed when nothing is deployed.
- **External systems**: what is sent to a third party (mail body, event payload, API request) matches what it expects.
- **Regressions**: callers of changed functions, types, and contracts; behaviour that changed without being asked for, including in a port or refactor. Read the callers, and read the whole file when a hunk does not explain itself.
- **Test honesty**: weakened or deleted assertions, skipped tests, expected values edited to match output, special-cased test inputs, mocks that replace the behaviour under test, tests that depend on timing.
- **Test value**: a test earns its place when it fails if behaviour someone relies on breaks, and still passes after a refactor that keeps that behaviour. Flag tests that can never fail that way (testing the library, framework, or types; asserting on mocks; repeating another test's case) and tests that break on any refactor (restating the implementation, snapshots of internals).
- **Test coverage**: behaviour the change adds or fixes that could break with no test failing; a fix without a test that fails without it; tests that run in a different mode or environment from where the behaviour lives.

Each finding names a concrete triggering input or call path.

Out of scope: structure, naming, access control, and style.
