---
name: improve
description: Second pass over a just-completed implementation that re-solves the problem with fresh eyes and cuts what the solution doesn't need. Use after implementing; not for read-only review or repository-wide cleanup.
metadata:
  opencode/autoinvoke: "false"
---

# Improve

A second pass with fresh eyes. The first pass made it work; this one asks whether what was built is the smallest clear solution to what the human actually wanted. Treat the existing code as one draft, not the answer: you hold a reason for every line you wrote, so question those reasons instead of defending them.

## 1. Re-solve before you re-read

Restate the human's goal and each problem the implementation addresses, as outcomes. For each, sketch the smallest solution you would write today, knowing what you now know about the codebase, before reopening the diff. Lean on what already exists: for every safeguard, check whether an existing mechanism, rule, or library capability already covers that risk. For a ten-line fix this takes a minute; for a large change, have a subagent that has not seen the implementation write the sketch from the request alone.

Then compare the sketch with what was built. Every material difference (an extra mechanism, column, option, retry path, or hand-written version of something generated) is a cut candidate. A large diff for a few problems is a signal in itself.

## 2. Cut

Agreed designs are cut candidates too: the human approved an outcome, not every mechanism serving it.

- **Apply** cuts that keep the behavior the human asked for: unrequested or speculative additions, a smaller mechanism with the same outcome, code the change superseded or orphaned, and redundant tests or docs.
- **Propose** cuts that change agreed behavior, drop something the human explicitly asked for, or whose necessity is unclear. Give each its trade-off and let the human decide.

Apply these lenses where they fit:

- **Superseded code:** trace what the change replaced or disconnected. Before deleting, verify nothing still needs it, including dynamic loading, framework discovery, and external consumers. Keep uncertain candidates and say why.
- **UI:** read `$frontend-design` and aim for the smallest interface that makes the task self-explanatory.
- **Effect:** name practice mismatches that recur beyond the change, leave them in place, and hint at `$audit-effect`.

## Guardrails

Keep public contracts, compatibility, historical migrations, and required error handling; when an existing mechanism already provides one, rely on it. Reach fewer lines through less machinery, with code that stays plain and correct. Stay within the implementation and what it supersedes, leaving unrelated user changes as they are. Keep tests for behavior that remains, and rerun the relevant tests, type checks, lint, and build after the pass.

## Report

Fit it on one screen:

- Diff size before and after (lines and files), per area when large.
- Cuts applied, one line each.
- Proposed cuts as a table: cut, what it saves, trade-off.
- Each remaining large piece and why it is the minimum.
- Checks run and any gaps.
