---
name: implement
description: Implement an authorized feature, fix, or technical handoff with minimal, maintainable code and verified behavior. Use when asked to build or change code, not for examination, read-only review, or post-implementation polishing.
---

# Implement

Implement exactly the human's requested behavior. Every line of code is a maintenance liability: add only what is necessary to deliver and verify that behavior while preserving existing contracts. Aim for clean, lean code that is easy to understand and maintain.

## 1. Establish the contract

Read the request, applicable repository instructions, and affected code, callers, tests, and worktree changes. For a referenced Linear issue, use `linear-cli` in the repository's configured workspace to read the issue and assigned milestone. The milestone provides context, not additional implementation scope.

Identify the requested outcome, acceptance behavior, and what must stay unchanged. A handoff or another agent's recommendation is not authority to add requirements. Follow explicit user decisions; if a proposed approach conflicts with them or with verified source, explain the conflict and ask before departing from it.

If requirements, expected behavior, or the necessity of extra code are unclear, ask the user before implementing the affected part. Do not turn guesses into requirements or add behavior on the assumption that it might be needed. Choose routine implementation mechanics within the established contract; uncertainty about the contract itself requires clarification.

Start editing only when the scope is clear. Authorization covers the requested code changes and proportionate local checks, not deployment, publishing, Linear updates, or session/worktree creation.

## 2. Choose the simplest fitting design

- Read `$codebase-design` when choosing or changing interfaces and ownership. Its design guidance does not expand the task.
- For Effect code, check the pinned version. Read `$effect` and task-matching references for v4; otherwise use version-matched guidance and repository patterns. Introducing or upgrading Effect requires an explicit request.
- Check existing repository and library capabilities before writing custom code. If a referenced skill is unavailable, report that and use verified source and repository guidance.

Each addition must serve a requested requirement, preserve an affected existing contract, or verify the change. Be able to explain what would fail or remain unsolved without it. Possible future use, generic best practice, or a nearby improvement is not sufficient justification.

Prefer the simplest existing path. Extra abstractions, dependencies, configuration, fallbacks, and extension points require demonstrated necessity for this task. Keep ownership clear and control flow direct; do not build a framework around a single use case.

## 3. Build with feedback

Implement through the real runtime path in small, working increments. Add or adapt tests for requested behavior and relevant failure cases; reproduce a bug before fixing it when feasible. Use repository-native checks while working.

Keep adjacent cleanup and unrelated fixes out of the diff. Change surrounding code only where the requested solution requires it. Preserve necessary validation, error handling, compatibility, and tests; minimal code must still be correct and complete.

When docs need changing, read `$writing-for-agents`. Update existing authoritative docs with only necessary, non-obvious contracts, rationale, conventions, or pitfalls for future agents. Link to source instead of duplicating it; keep task history in the conversation.

## 4. Verify and subtract

Review every added block against the scope: is it necessary, or did I invent a requirement? Remove unsupported additions and simplify avoidable complexity within your changes. Reduce code by removing machinery, not by obscuring logic or dropping required safeguards. Rerun affected checks after simplifying.

Finish when all requested behavior is wired and verified, no speculative additions remain, and unrelated work is untouched. Report the delivered behavior, checks actually run, and any unresolved question or verification gap. Stop at the requested outcome; an unverified or blocked result is not complete.
