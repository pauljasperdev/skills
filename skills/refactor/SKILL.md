---
name: refactor
description: Restructure scoped existing code while preserving observable behavior. Use for an explicit refactoring task; improve handles refinement of the implementation just completed, and implement handles features and fixes.
---

# Refactor

Resolve a concrete structural problem with the smallest coherent change. Use the current worktree and preserve unrelated changes. This skill does not create branches, commit, or push.

## 1. Define the improvement

Read the request, repository instructions, affected code, callers, tests, and current diff. State briefly what should become simpler and which observable contracts must stay unchanged: outputs, errors, side effects, persisted formats, and relevant ordering or performance constraints. If the target is unclear, ask before editing.

## 2. Establish a tested baseline

Run relevant checks before restructuring. Add missing tests that capture current behavior through stable interfaces, including meaningful edge and failure cases, and confirm they pass against the original implementation. Cover the affected behavior, not a repository-wide percentage; use coverage to find gaps rather than as proof of correctness.

Proceed only when the affected contracts have a trustworthy regression check. If failures, flakiness, or missing infrastructure prevent that, report the gap and pause the affected refactoring. Record unrelated baseline failures without expanding into fixing them. Flag apparent existing bugs separately rather than silently changing their behavior.

## 3. Choose the smallest fitting design

Read and apply `$codebase-design` for interface and ownership decisions. Prefer removing unnecessary machinery and using existing repository or library capabilities. An abstraction must simplify a present problem; fewer lines or smaller functions alone do not establish improvement.

For Effect code, check the pinned version: read `$effect` and its relevant references for v4; otherwise use version-matched guidance and repository patterns. Follow the established conventions of other affected libraries too. If a referenced skill is unavailable, report that and use verified repository or library guidance.

## 4. Transform in small steps

Make one coherent transformation, run focused checks, then continue. Investigate new failures before further restructuring. Keep features, bug fixes, dependency upgrades, and intentional behavior changes separate from this refactoring.

Preserve behavioral assertions when adapting tests to changed internal interfaces. Replace implementation-coupled tests with equivalent behavioral protection before removing them; changing expectations or snapshots merely to match new output defeats the safety net.

## 5. Verify and stop

Run broader affected tests, type checks, and integration checks as appropriate. Review the final diff for contract changes, missed callers, and unnecessary additions. Finish when the stated structural problem is resolved and relevant checks pass; report verification limitations rather than claiming unverified safety. Further changes need evidence of a regression or an unmet original objective, not another opportunity for polish.

## 6. Report the result

Explain what became simpler, what stayed unchanged, tests added and checks actually run, and any remaining uncertainty. When documentation needs updating, read and apply `$writing-for-agents`; retain only durable contracts, rationale, conventions, or pitfalls future agents need, preferably in existing authoritative docs. Keep task history in the conversation.
