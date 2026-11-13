---
name: review-implementation
description: Implementation review of a change. Judges the code inside the modules against the repository's rules and its existing code.
disable-model-invocation: true
---

# Implementation review

Judge the code inside the modules: does it follow the repository's rules and fit the existing code?

Look for:

- **Repository rules**: every rule in `AGENTS.md`, `CLAUDE.md`, and the docs they point to that the change breaks, cited as file plus rule.
- **Reuse**: what the codebase, a maintained library, the platform, or an existing tool already provides, reimplemented; a library used against its documented setup or patched around. Search for them.
- **Needless code**: single-use helpers, files, variables, or wrappers; logic, labels, or dependencies the task does not need.
- **Duplication** within the change, including a value repeated as a literal.
- **Untyped values**: magic strings, dates or IDs as strings, untyped JSON fields, string comparisons where a typed value fits.
- **Naming**: names that hide intent, diverge from the codebase's term for the concept, or are not in English.
- **Code smells** (Fowler): Data Clumps, Repeated Switches.
- **Comments and docs**: comments that restate the code or narrate history; stale comments, READMEs, and instruction files; instruction files holding more than non-obvious facts.

A broken documented rule is a finding. Anything else is a judgement call: report it only when the change shows a concrete cost.

Out of scope: what lint, formatting, and types enforce; interfaces and where code lives; bugs.
