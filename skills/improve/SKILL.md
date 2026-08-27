---
name: improve
description: Review a completed implementation for impediments and worthwhile refactorings, make the justified improvements, and verify the result.
metadata:
  opencode/autoinvoke: "false"
---

# Improve

Treat the implementation completed immediately before invocation as a first complete draft. Re-read the original request, then inspect the implementation's diff, relevant surrounding code, callers, and tests. Use conversation and edit history to distinguish it from unrelated or pre-existing worktree changes.

Take a fresh-eyes pass for concrete friction or fragility exposed by the implementation: needless complexity or duplication, awkward boundaries, misplaced responsibilities, brittle assumptions, temporary workarounds, incomplete error handling, poor testability, or divergence from established codebase patterns. Follow evidence rather than mechanically applying this list.

Make improvements now when they materially improve correctness, simplicity, maintainability, or architectural fit. Preserve the requested behavior and scope. Do not churn code for taste, add speculative abstractions, or alter unrelated user-owned changes.

Run verification appropriate to the final changes. Continue until no evidence-backed, worthwhile improvement remains. If the implementation is already sound, leave it unchanged and say so.

Report the improvements made and their rationale, the verification performed, and any impediment that remains unresolved.
