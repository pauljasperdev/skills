---
name: implement
description: Implement an authorized feature, fix, or technical handoff with minimal, maintainable code and verified behavior. Use when asked to build or change code, not for examination, read-only review, or post-implementation polishing.
---

# Implement

Deliver the requested behavior with the smallest coherent design. Every added line carries a maintenance cost; elegance means making the behavior easy to understand and change, not compressing it into fewer lines.

## 1. Establish the contract

Read the request or handoff, applicable repository instructions, and the affected code, callers, and tests. For a referenced Linear issue, use `linear-cli` with the repository's configured workspace to read its requirements and assigned milestone context. Inspect worktree changes so unrelated user work stays intact.

Preserve required behavior, compatibility, and explicit user decisions. Treat handoff design recommendations as evidence-backed starting points: explain consequential departures when current source contradicts them. Ask only about missing decisions that materially change the result.

Ready to edit when acceptance behavior, non-goals, affected ownership, and relevant validation are known, with no blocking scope decision. An implementation request authorizes code changes and proportionate local checks, not deployment, publishing, Linear updates, or session/worktree creation unless separately requested.

## 2. Choose the simplest fitting design

- Read and apply `$codebase-design` before choosing or changing module interfaces and ownership. Use its depth, locality, and deletion tests to decide whether an abstraction earns its place.
- When the affected path uses Effect, check the pinned version. For Effect v4, read `$effect` and its task-matching references before writing Effect code. For another version, follow version-matched package guidance and repository patterns; introducing or upgrading Effect requires an explicit request.
- For every affected library, check existing repository usage and built-in capabilities before writing a substitute. If a referenced skill is unavailable, report that and use repository guidance and verified source rather than inventing its rules.

Keep the design concrete:

- Build for present requirements. New abstractions, dependencies, options, and generalization need a current use or a demonstrable reduction in complexity.
- Give each rule and piece of authoritative state a clear owner. Share repeated domain knowledge; similar-looking code alone does not justify coupling unrelated behavior.
- Reveal intent through domain names, straightforward control flow, and explicit data and failure paths. Comments explain non-obvious reasons and constraints.

Ready to build when the chosen approach satisfies the contract and any custom machinery has a reason existing capabilities cannot meet. Keep this analysis proportional; proceed to implementation rather than returning a waterfall plan.

## 3. Build with feedback

Implement in small, working increments through the real runtime path. Add or adapt tests around observable behavior and meaningful failure cases; for a bug, establish a reproducing check before fixing it when feasible. Use repository-native checks as feedback while working, not only at the end.

Keep adjacent refactoring limited to what makes this change correct and understandable. Preserve necessary validation, error handling, compatibility, and tests while simplifying. A failing check is a problem to explain or fix, not a reason to weaken the contract.

Implementation is complete when every acceptance requirement is connected to working behavior, including required wiring and failure paths, with no placeholder standing in for requested functionality.

## 4. Verify and subtract

Inspect the final diff and ask: what complexity did I introduce that the behavior does not need? Remove or simplify that excess, then rerun affected checks. Favor clarity over line-count reductions; finish after this focused pass rather than reopening unrelated design questions.

Done means acceptance behavior has been checked, relevant verification has passed or its limitations are explicit, and unrelated work remains untouched. Report delivered behavior, consequential design choices, checks actually run, and any remaining blocker. A blocked or unverified result is not a claim of completion.
