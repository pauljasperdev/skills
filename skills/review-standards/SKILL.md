---
name: review-standards
description: Standards review of a change. Judges the code inside the modules against the repository's rules and its existing code.
disable-model-invocation: true
---

# Standards review

Judge the code inside the modules: does it follow the repository's rules and fit the existing code?

Look for:

- **Repository rules**: every rule in `AGENTS.md`, `CLAUDE.md`, and the docs they point to that the change breaks, cited as file plus rule.
- **Reuse**: helpers, utilities, or patterns already in the codebase that the change reimplements. Search the repository for them.
- **Duplication** within the change.
- **Naming**: names that hide intent, or that diverge from the codebase's existing term for the same concept.
- **Code smells** (Fowler): Feature Envy, Data Clumps, Primitive Obsession, Repeated Switches, Shotgun Surgery, Divergent Change, Speculative Generality, Message Chains, Middle Man.
- **Stale docs**: comments, READMEs, and instruction files the change made wrong.
- **Effect**: when the change uses Effect, run the `effect` cold review on the diff.

A broken documented rule is a finding. Anything else is a judgement call: report it only when the change shows a concrete cost.

Out of scope: what lint, formatting, and types enforce; interfaces and where code lives; bugs.
