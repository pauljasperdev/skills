---
name: improve
description: Improve an implementation just completed in this conversation through focused, evidence-backed refactoring and verification. Use for a post-implementation refinement pass, not a read-only review or repository-wide cleanup.
metadata:
  opencode/autoinvoke: "false"
---

# Improve

Reduce unnecessary code and complexity in the implementation just completed and the code it supersedes. Every line is a maintenance liability. The goal is the smallest clear, maintainable solution to the human's original request, not a broader or more ambitious implementation.

Re-read the original request and explicit user decisions, then inspect the implementation's diff, callers, and tests. Use conversation and edit history to separate this implementation from unrelated or pre-existing changes. If the target cannot be identified, ask before editing.

Check each addition against the request: does it deliver requested behavior, preserve an affected existing contract, or verify the change? What would fail or remain unsolved without it? Remove clearly unrequested behavior and speculative machinery introduced by this implementation. If intent or necessity is unclear, ask the user before changing that part; do not guess in favor of adding or deleting behavior.

Prefer deletion, straightforward control flow, and existing repository or library capabilities. Extra abstractions, dependencies, options, fallbacks, and future-proofing need demonstrated necessity for the original task. Simplify the scoped implementation; architectural taste or a nearby smell does not authorize adjacent cleanup.

Add code only to close a verified gap in the original request or preserve an affected contract. Keep required error handling, validation, compatibility, and tests. Reduce lines by eliminating unnecessary machinery, not by making code cryptic or weakening functional correctness. Leave unrelated user-owned changes alone.

When docs need changing, read `$writing-for-agents`. Retain only necessary, durable guidance for future agents in existing authoritative docs where possible. Remove redundant task documentation introduced by this implementation; keep completion summaries in the conversation.

## Test the change before simplifying

Treat the original contract, changed runtime paths, and superseded behavior as a coverage matrix. Account for each applicable success case, boundary and empty value, malformed input, invalid transition, dependency or infrastructure failure, retry/timeout/cancellation, duplicate or out-of-order request, authorization, persistence/serialization, and concurrency case. Existing green tests are evidence only for the behavior they assert.

For every verified gap, use red-green development: add the smallest failing regression test, make the minimal correctness change, then refactor with the suite green. Check all real layers—unit rules and boundaries, integration seams and wiring, and end-to-end critical user-visible/runtime flows. Prefer deterministic fixtures and controlled failures, while keeping integration and end-to-end tests on real wiring so mocks cannot conceal configuration, serialization, lifecycle, or registration defects. Use coverage or mutation reports when available to locate untested branches; the matrix and observable assertions are the completeness bar, and exclusions need a concrete reason.

Make every retained or added test meaningful: identify its input or action, assert an observable result or invariant, and confirm it would fail for a plausible regression. Tests that only execute lines, mirror implementation details, check mock calls without a contract consequence, accept any result, or add snapshots without semantic assertions do not establish coverage. Prefer fewer strong tests over test count or percentage inflation.

Run focused tests during the pass and the complete relevant unit, integration, and end-to-end suites plus repository-native type, lint, build, and coverage checks afterward. If a required layer or check is unavailable, record the exact blocker and affected unverified behavior. Completion requires every applicable matrix case to be covered by a passing test or an explicitly documented verification gap.

## Dead code and superseded behavior

Trace what the implementation replaces or disconnects, including existing code outside the diff. Look for unused symbols and files, unreachable branches, obsolete state, duplicate paths, and adapters or fallbacks whose purpose the new implementation has removed. Follow their imports, callers, runtime registration, configuration, and dependencies to find anything newly orphaned. Keep this scan tied to the implementation's effects.

Before deleting a candidate, verify that no supported path or contract still needs it. Use repository-wide reference searches and relevant entry points; account for dynamic loading, framework discovery, side effects, and external consumers where applicable. A missing text reference or unused-code warning is a lead, not proof. Preserve required compatibility and historical migrations; retain uncertain candidates and report the evidence gap.

Remove confirmed dead code together with its exclusive wiring, configuration, dependencies, and obsolete tests or fixtures. Preserve coverage of behavior that remains required. Continue through anything those deletions orphan, using the same evidence standard. The scan is complete when affected replacement paths have been traced and identified candidates are either removed or retained for a stated reason.

## UI: clarity through subtraction

When the completed implementation changes UI, read `$frontend-design` within the original scope and established visual language. Aim for the smallest, cleanest interface that makes the task self-explanatory.

Make the primary action, available choices, and current state clear through hierarchy, grouping, spacing, familiar controls, and feedback. Fix confusing interactions before adding explanatory prose. Remove redundant headings and descriptions, narration of obvious controls, filler, implementation details, and decoration without a purpose.

Keep concise labels and action names, plus guidance needed for consequential choices, valid input, and error recovery. Prefer visible labels to ambiguous icons or help hidden in tooltips. Preserve accessibility, discoverability, and necessary feedback.

During verification, inspect the rendered result and exercise affected interactions when the environment permits. Check whether a first-time user can identify the next action and understand its outcome without explanatory narration.

## Verify and finish

Make one focused pass, run the full applicable test and quality checks, and inspect the final diff for regressions, dead paths, and scope drift. Resolve problems introduced by the pass, then stop when the original request is satisfied without unsupported additions. If no justified simplification or correctness fix is found, leave the implementation unchanged.

Report what was removed or simplified and why, any necessary additions, checks actually run, and unresolved questions or verification gaps. Do not claim completion when a required behavior remains blocked or unverified.
