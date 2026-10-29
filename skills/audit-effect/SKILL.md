---
name: audit-effect
description: Audit Effect usage read-only and turn recurring patterns into focused refactoring prompts.
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Audit Effect

Find recurring Effect practice mismatches and architectural friction, and turn each confirmed pattern family into a refactoring prompt. Representative examples establish a family; the deliverable is not a line-by-line rewrite list.

Read-only: change no code, configuration, dependencies, or external systems, and run no setup, fixers, or application tests. The report goes in the conversation unless the user asks for a file.

## 1. Scope and standard

- Load `$effect` (sources, lookup, patterns) and `$codebase-design` (module depth, seams, testability). If one is unavailable, name it and limit conclusions accordingly.
- Scope: the user's scope, else the repository's first-party source including uncommitted and untracked files. Generated and vendored code are evidence, not targets.
- Read applicable `AGENTS.md`/`CLAUDE.md`, local Effect guidance, and ADRs. Record frameworks, persistence, deployment model, resource lifetimes, and configured Effect diagnostics.
- Resolve each package's installed Effect version. Recommendations for older majors use their available APIs or are labelled migrations.
- Record supplied hypotheses as candidates to verify.

Project conventions govern naming and integration; installed source governs API semantics. A proposal to revisit a convention or ADR is separate from a violation. Nothing here implies an upgrade or framework replacement.

**Done when:** scope, candidates, versions, governing guidance, and evidence gaps are recorded.

## 2. Discover and verify

Search the scoped code for the hand-written shapes in the `$effect` Patterns table, and map composition roots, adapters, callers, and tests. A match is a hypothesis: read its implementation, provisioning, consumers, and tests, and run the `$effect` lookup for the mechanism before classifying it. Inspect healthy examples too.

For each candidate record:

- **Mechanism:** what is hand-written, duplicated, or hidden outside the Effect construct.
- **Consequence:** the concrete caller obligation, maintenance cost, test friction, or failure path.
- **Evidence:** representative `path:line`, the governing library source, and whether it recurs or is local.
- **Counterevidence:** the adapter, runtime constraint, or decision that may justify the shape.
- **Direction:** the Effect construct or deeper module, and the invariants that must survive.

Group by mechanism, not by file. Give every candidate a disposition:

- **Confirmed:** evidence, consequence, direction.
- **Rejected:** a `path:line` from library source or repository showing the construct does not fit or the current design is better. Without it the candidate is **unverified** and stays Deferred.
- **Deferred:** the evidence gap and what would close it.
- **Outside scope:** the owning module.

**Done when:** every Patterns row relevant to the scope is checked, inapplicable, or listed as uninspected, and every candidate has a disposition. Zero confirmed findings is a valid outcome.

## 3. Classify and write prompts

Classify each family as a practice mismatch, an architectural opportunity, or an optional style migration. Prioritize by demonstrated cost, recurrence, and the size of a safe first slice.

Write one standalone prompt per confirmed family containing:

1. Load `$effect`, `$codebase-design`, and local guidance; run the `$effect` lookup for the mechanism before choosing a replacement.
2. The shape to search, with representative paths as starting points.
3. The target outcome and a bounded first slice, plus what remains after it.
4. The behavior, ordering, error, idempotency, durability, privacy, and lifecycle invariants, and legitimate exceptions.
5. Acceptance criteria and validation commands from the target repository, including Effect diagnostics; compare the final diff with the confirmed mechanism.

**Done when:** each confirmed family has a prompt usable without this conversation.

## 4. Report

Lead with the assessment and highest-value opportunities. State scope, versions, guidance used, and limits. Per family: classification, priority, mechanism and consequence, representative links, direction, exceptions, prompt. Then the coverage record and dispositions, good examples to keep, hypotheses not borne out, and Patterns rows to add for mechanisms the table missed. Apply no refactors.
