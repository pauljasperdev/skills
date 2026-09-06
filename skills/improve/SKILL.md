---
name: improve
description: Improve an implementation just completed in this conversation through focused, evidence-backed refactoring and verification. Use for a post-implementation refinement pass, not a read-only review or repository-wide cleanup.
metadata:
  opencode/autoinvoke: "false"
---

# Improve

Treat the implementation completed immediately before invocation as a first complete draft. Re-read the original request, then inspect the implementation's diff, relevant surrounding code, callers, and tests. Use conversation and edit history to distinguish it from unrelated or pre-existing worktree changes.

If no completed implementation can be identified, ask which change to refine before editing. Keep that original change as the scope for the whole pass.

Take a fresh-eyes pass for concrete friction or fragility exposed by the implementation: needless complexity or duplication, awkward boundaries, misplaced responsibilities, brittle assumptions, temporary workarounds, incomplete error handling, poor testability, or divergence from established codebase patterns. Follow evidence rather than mechanically applying this list.

Make improvements now when they materially improve correctness, simplicity, maintainability, or architectural fit. Prefer removing unnecessary machinery and using existing repository or library capabilities. Tie each refactoring to a concrete problem in the scoped implementation; preserve its requested behavior and leave unrelated user-owned changes alone.

Make a focused pass, run verification appropriate to the changes, then re-read the final diff for regressions and scope drift. Resolve problems introduced by the pass; further changes need a concrete correctness or acceptance gap, not another opportunity for polish. Finish when the identified problems are resolved and verification is accounted for, or report a specific blocker. If the implementation is already sound, leave it unchanged and say so.

Report the improvements made and their rationale, the verification performed, and any impediment that remains unresolved.
