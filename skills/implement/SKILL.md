---
name: implement
description: Implement an authorized feature, fix, or technical handoff with minimal, maintainable code and verified behavior. Use when asked to build or change code, not for examination, read-only review, or post-implementation polishing.
---

# Implement

Build exactly what was asked. Minimal code, verified. Every line is a liability.

## 1. Contract

- Read: request, repo instructions, affected code, callers, tests, worktree changes
- Issue (referenced, or `<N>` in `t3code/<N>-<slug>`): `gh issue view <N> -R <owner>/<repo> --json title,body,comments,milestone`; milestone = context, not scope
- Pin: outcome, acceptance behavior, what stays unchanged
- Handoffs and agent suggestions ≠ requirements
- Conflict with user decisions or verified source → explain, ask
- Unclear requirement → ask before building that part
- Authorized: code changes + local checks. Not: deploy, publish, issue or Status updates, sessions, worktrees

## 2. Design

- `$codebase-design`: ownership, interfaces, seams
- `$effect`: look up each mechanism as you write it; no new Effect unless asked
- `$vercel-react-best-practices`: React, Next.js
- Library construct before hand-rolled mechanism (flag, counter, retry, polling, wait, cache, lock, state machine); hand-rolled only with the `path:line` where the construct fails
- Local code sets naming and wiring; library docs and source set idiom; contradiction → follow docs, name it
- Skill unavailable → say so, use verified source
- Every addition serves a requirement, an existing contract, or verification
- Simplest path: library, then existing repo code
- No speculative abstractions, dependencies, config, fallbacks, extension points

## 3. UI

- `$frontend-design`, within the product's visual language
- Primary action, choices, state clear from hierarchy, grouping, spacing, familiar controls, feedback
- Short concrete labels; visible label over icon or tooltip
- Supporting text only for consequential choices, input formats, error recovery
- Cut narration, repeated headings, filler, implementation details
- Keep accessibility and feedback

## 4. Build

- Real runtime path, small working increments
- Tests for requested behavior and failure cases; reproduce bugs first
- Keep validation, error handling, compatibility, existing tests
- No adjacent cleanup or unrelated fixes
- Docs: `$writing-for-agents`; update existing docs, non-obvious only, link to source

## 5. Verify

- Each added block: requested or invented? Cut invented
- Cut machinery, not safeguards or clarity
- Rerun affected checks
- UI: render it, exercise the interaction, first-time-user test

## 6. Review

- Fresh subagent: diff + request, not your reasoning
- Check:
  - code in the wrong module or package
  - details leaking across interfaces (storage, vendor types, config, env, internal errors)
  - dependency direction, reaching into internals
  - rule or constant owned twice
  - Effect diff: `$effect` cold review
- Fix valid findings; rejected → report with refuting source
- Repeat with a fresh subagent until clean

## Report

- Delivered behavior
- Mechanisms with source `path:line`
- Checks run
- Review: fixed, rejected, open
- Open questions, verification gaps
- Unverified, unreviewed, or blocked ≠ done
