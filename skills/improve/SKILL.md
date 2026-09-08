---
name: improve
description: Improve an implementation just completed in this conversation through focused, evidence-backed refactoring and verification. Use for a post-implementation refinement pass, not a read-only review or repository-wide cleanup.
metadata:
  opencode/autoinvoke: "false"
---

# Improve

Reduce unnecessary code and complexity in the implementation just completed. Every line is a maintenance liability. The goal is the smallest clear, maintainable solution to the human's original request, not a broader or more ambitious implementation.

Re-read the original request and explicit user decisions, then inspect the implementation's diff, callers, and tests. Use conversation and edit history to separate this implementation from unrelated or pre-existing changes. If the target cannot be identified, ask before editing.

Check each addition against the request: does it deliver requested behavior, preserve an affected existing contract, or verify the change? What would fail or remain unsolved without it? Remove clearly unrequested behavior and speculative machinery introduced by this implementation. If intent or necessity is unclear, ask the user before changing that part; do not guess in favor of adding or deleting behavior.

Prefer deletion, straightforward control flow, and existing repository or library capabilities. Extra abstractions, dependencies, options, fallbacks, and future-proofing need demonstrated necessity for the original task. Simplify the scoped implementation; architectural taste or a nearby smell does not authorize adjacent cleanup.

Add code only to close a verified gap in the original request or preserve an affected contract. Keep required error handling, validation, compatibility, and tests. Reduce lines by eliminating unnecessary machinery, not by making code cryptic or weakening functional correctness. Leave unrelated user-owned changes alone.

When docs need changing, read `$writing-for-agents`. Retain only necessary, durable guidance for future agents in existing authoritative docs where possible. Remove redundant task documentation introduced by this implementation; keep completion summaries in the conversation.

Make one focused pass, run checks appropriate to the changes, and inspect the final diff for regressions and scope drift. Resolve problems introduced by the pass, then stop when the original request is satisfied without unsupported additions. If no justified simplification or correctness fix is found, leave the implementation unchanged.

Report what was removed or simplified and why, any necessary additions, checks actually run, and unresolved questions or verification gaps. Do not claim completion when a required behavior remains blocked or unverified.
