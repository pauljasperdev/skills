---
name: audit-effect
description: Audit Effect usage read-only and turn recurring patterns into focused refactoring prompts.
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Audit Effect

Find recurring Effect practice mismatches and architectural friction. Deliver
evidence-backed pattern families and prompts that future agents can use to find
and refactor similar code. Representative examples establish a pattern; the
deliverable is not a line-by-line rewrite inventory.

Keep the audit read-only: inspect source and existing validation evidence; leave
code, configuration, dependencies, and external systems unchanged. Run no setup,
fixers, or application tests. Return the report in conversation unless the user
requests a report file; that file is the only audit write. Refactoring prompts are
handoff text, not instructions to execute during the audit.

## 1. Establish the standard and scope

- Load `$effect` and the topic references relevant to the audit. It owns Effect
  practices; this skill owns discovery, evidence, and the report.
- Load `$codebase-design` to judge module depth, interface obligations, seam
  placement, and testability. Use its architecture vocabulary while keeping
  literal Effect names such as `Context.Service` when describing code.
- Resolve these skills through the environment's skill catalog. If a dependency
  is unavailable, identify the missing source and limit conclusions accordingly;
  continue the parts supported by available evidence.
- Honor a user-specified scope. Otherwise inspect the current repository,
  including relevant uncommitted and untracked first-party source. A branch diff
  is the scope only when requested. Exclude generated output and vendored code as
  audit targets; dependency source remains evidence for library behavior.
- Read applicable `AGENTS.md`/`CLAUDE.md`, local Effect guidance, and relevant
  domain documentation and ADRs when present. Record the chosen frameworks,
  persistence adapters, deployment model, and resource lifetimes.
- Resolve each affected package's installed Effect version, checking manifests
  and lockfiles for declared intent. Read bundled Effect agent guidance once and
  follow relevant examples; settle API questions against that installed source.
  For missing source, seek version-matched upstream evidence read-only and report
  remaining gaps. `$effect` targets v4: recommendations for older majors must use
  available APIs or be explicitly classified as migrations.

Project conventions govern integration and naming; installed source governs API
availability and semantics. Separate any proposal to revisit a convention or ADR
from an established violation. Neither the audit nor its prompts imply a library
upgrade or framework replacement.

**Done when:** scoped source areas, resolved versions, governing guidance, runtime
constraints, and evidence gaps are recorded. If Effect usage is absent, report
that result and finish.

## 2. Discover and verify patterns

Map composition roots, Effect modules, external adapters, callers, and tests.
Use `rg` and source reads to search the scoped code, following the relevant
sections of [PATTERNS.md](references/PATTERNS.md). Search results are hypotheses:
read surrounding implementation, provisioning, consumers, and tests before
classifying a match. Inspect healthy examples as well as suspicious ones.

For each candidate, establish:

- **Mechanism:** what policy, dependency, or lifecycle is duplicated, hidden, or
  handled outside the appropriate Effect abstraction?
- **Consequence:** what concrete caller obligation, maintenance cost, testing
  friction, or supported failure path results?
- **Evidence:** representative `path:line` locations and symbols, the governing
  practice/source, and the surrounding constraints. Verify multiple occurrences
  before calling a pattern widespread; label a concentrated example as local.
- **Counterevidence:** what legitimate adapter, runtime constraint, or documented
  decision might explain this shape? Which nearby implementation already works?
- **Direction:** which installed Effect capability or deeper module would improve
  the interface, locality, or testability, and which invariants must survive?

Group by the underlying mechanism, not by file. Scan every applicable pattern
family in scope and account for each as checked, inapplicable, or uninspected;
representative reporting does not justify silently skipping source areas.

**Done when:** each retained family has verified evidence, a concrete consequence,
a supported direction, and evaluated exceptions; coverage gaps are explicit.
An audit with no supported findings is a valid outcome.

## 3. Classify and write refactoring prompts

Separate **practice mismatches**, **architectural opportunities**, and **optional
style migrations**. A valid API that differs from a skill preference is not by
itself a correctness defect. State uncertainty where behavior is unproven.

Prioritize by demonstrated cost, recurrence, and the size of a safe first slice.
Favor smaller interfaces and concentrated policy over additional pass-through
modules. Preserve working adapters and resource ownership discovered in step 1.

Write one standalone prompt per retained family. Each prompt must include:

1. Load `$effect`, `$codebase-design`, applicable local guidance, and the target
   package's installed Effect source before choosing a replacement.
2. The pattern to discover, search terms or code shapes, and representative
   starting paths/symbols. Treat examples as starting points, not an exhaustive
   edit list.
3. The intended module or Effect practice and a bounded first refactoring slice.
4. Verified behavior, ordering, errors, idempotency, durability, privacy, and
   lifecycle requirements relevant to that family, plus legitimate exceptions.
5. Observable acceptance criteria and focused validation chosen from the target
   repository, including configured Effect diagnostics when applicable.

Keep prompts self-contained: expand shared prerequisites and discovered
invariants into each. Specify the outcome and seam; leave implementation choices
open where several designs satisfy the evidence.

**Done when:** every retained family has a copyable prompt that can discover
related instances and guide one bounded refactor without the audit conversation.

## 4. Report and stop

Lead with the overall assessment and highest-value opportunities. State the
reviewed scope, Effect versions, guidance used, and inspection/validation limits.
For each family include its classification and priority, mechanism/consequence,
representative links, supported direction, exceptions, and standalone prompt.
Group repeated examples and scale the number of findings to the evidence.

Close with good local examples to preserve, meaningful hypotheses that were not
borne out, and uncovered areas. Distinguish absent evidence from absence of a
problem. Deliver the report without applying refactors or launching a follow-up
design workflow.

**Done when:** all retained families and coverage limits are reported, and the
audited worktree remains unchanged apart from any explicitly requested report.
