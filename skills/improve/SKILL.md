---
name: improve
description: Second pass with fresh eyes over code just implemented, re-solving the problem and cutting what the solution doesn't need.
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Improve

Implementation done. Now review it and refactor. Existing code = one draft, not the answer; question your own reasons.

## 1. Re-solve

- Restate the goal and each problem as outcomes
- Before rereading the diff: sketch the smallest solution you'd write today, library and existing code first
- Large change: a subagent that hasn't seen the code sketches from the request alone
- Diff vs sketch: every extra mechanism, column, option, retry path, hand-rolled library feature → cut candidate
- Big diff for few problems = signal
- Done: every problem sketched, every difference listed

## 2. Cut

- Agreed designs are candidates too: the human agreed to outcomes, not mechanisms
- Apply: unrequested or speculative code, self-chosen mechanisms with smaller equivalents, superseded or orphaned code, redundant tests and docs
- Propose, with trade-off: anything agreed, anything unclear
- Lenses:
  - Design: `$codebase-design`; shallow modules, pass-throughs (deletion test), one-adapter seams, wrong owner
  - Superseded code: rule out dynamic loading, framework discovery, external consumers before deleting
  - Smells: names hiding contents, duplication, multi-purpose functions, flags, counters, sentinels as control flow
  - Comments: names carry the what; comment only the why, one line; comments outside the change stay
  - UI: `$frontend-design`; smallest self-explanatory interface
  - Effect: `$effect` lookups; mismatches recurring outside the change → hint `$audit-effect`
- Done: every candidate applied, proposed, or kept with a reason

## 3. Review

- Fresh subagent: diff + request, not your reasoning
- Check:
  - code in the wrong module or package
  - details leaking across interfaces (storage, vendor types, config, env, internal errors)
  - dependency direction, reaching into internals
  - rule or constant owned twice
  - Effect diff: `$effect` cold review
- Fix valid findings; rejected → report with refuting source
- Repeat with a fresh subagent until clean

## Guardrails

- Keep public contracts, compatibility, historical migrations, required error handling
- Fewer lines through less machinery; code stays plain and correct
- Scope: the implementation and what it superseded; unrelated user changes stay
- Keep tests for remaining behavior; rerun tests, types, lint, build

## Report

One screen:

- Diff size before and after (lines, files; per area when large)
- Applied cuts, one line each
- Proposed cuts: table of cut, saves, trade-off
- Each remaining large piece: why it's the minimum
- Review: fixed, rejected with source, open; `$effect` Patterns rows to add
- Checks run, gaps
