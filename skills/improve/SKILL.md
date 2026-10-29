---
name: improve
description: Second pass with fresh eyes over code just implemented, re-solving the problem and cutting what the solution doesn't need.
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Improve

A second pass with fresh eyes. The first pass made it work; this one asks whether what was built is the smallest clear solution to what the human actually wanted. Treat the existing code as one draft, not the answer: you hold a reason for every line you wrote, so question those reasons instead of defending them.

## 1. Re-solve before you re-read

Restate the human's goal and each problem the implementation addresses, as outcomes. For each, sketch the smallest solution you would write today, knowing what you now know about the codebase, before reopening the diff. Lean on what already exists: for every mechanism and safeguard, look up the library construct or existing rule that covers it (`$effect` for Effect code). For a ten-line fix this takes a minute; for a large change, have a subagent that has not seen the implementation write the sketch from the request alone.

Then compare the sketch with what was built. Every material difference (an extra mechanism, column, option, retry path, or hand-written version of something generated or provided by a library) is a cut candidate. A large diff for a few problems is a signal in itself. The step is done when every problem has a sketch and every difference is listed as a candidate.

## 2. Cut

Agreed designs are cut candidates too: the human approved an outcome, not every mechanism serving it.

- **Apply** cuts to what the human never agreed to: unrequested or speculative additions, smaller equivalents of mechanisms you chose on your own, code the change superseded or orphaned, and redundant tests or docs.
- **Propose** cuts to anything the human agreed to, whether behavior or mechanism, and to anything whose necessity is unclear. Give each its trade-off and let the human decide.

Apply these lenses where they fit:

- **Superseded code:** trace what the change replaced or disconnected. Before deleting, verify nothing still needs it, including dynamic loading, framework discovery, and external consumers.
- **Code smells:** read every hunk for names that hide what they hold, duplicated logic, functions doing several things, and flags, counters, or sentinel values carrying control flow. Fix each within the change.
- **Comments:** make the code self-documenting, with names and structure that carry what it does. A comment stays only for what the code cannot say: the reason behind a choice, a non-obvious constraint, a gotcha. Reduce each survivor to that one line; existing comments outside the change stay as they are.
- **UI:** read `$frontend-design` and aim for the smallest interface that makes the task self-explanatory.
- **Effect:** run the cold review from `$effect` and fix its confirmed findings within the change. Name mismatches that recur outside the change and hint at `$audit-effect`.

The step is done when every candidate is applied, proposed, or kept for a stated reason.

## Guardrails

Keep public contracts, compatibility, historical migrations, and required error handling. Reach fewer lines through less machinery, with code that stays plain and correct. Stay within the implementation and what it supersedes, leaving unrelated user changes as they are. Keep tests for behavior that remains, and rerun the relevant tests, type checks, lint, and build after the pass.

## Report

Fit it on one screen:

- Diff size before and after (lines and files), per area when large.
- Cuts applied, one line each.
- Proposed cuts as a table: cut, what it saves, trade-off.
- Each remaining large piece and why it is the minimum.
- Cold review findings: fixed, or rejected with their source; Patterns rows to add.
- Checks run and any gaps.
