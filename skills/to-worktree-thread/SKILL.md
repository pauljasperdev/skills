---
name: to-worktree-thread
description: Open a native T3 thread in a new branch-backed worktree, or preview its dispatch. Use for isolated task work; use to-thread for a new thread on the current worktree.
---

# To T3 worktree thread

Create a native **T3 Code thread**, new branch-backed worktree, and first turn. Read [`to-thread`](../to-thread/SKILL.md) for task/model resolution, T3 access, the `t3_thread_launch` launcher, and the receipt contract. Use this skill's adapter to prepare the launch; it shares the implementation with `to-thread` while selecting new-worktree behavior.

Both skills accept the caller's model, optional provider, and model options. Follow `to-thread`'s requirement to ask when no model is supplied. The caller chooses the task and supplies its first prompt.

The shared `to-thread` skill must be installed alongside this one. If missing, install both from the same source:

```sh
npx skills add pauljasperdev/skills -g --agent <invoking-agent> --skill to-thread to-worktree-thread -y
```

## 1. Check T3 and prepare the launch

Resolve this skill's installed directory and run its adapter with Node.js 22 or newer:

```text
node <to-worktree-thread-dir>/scripts/t3-worktree.mjs doctor --cwd <absolute-invoking-checkout>
```

Confirm `checkout.projectPath`, `worktreeDefaults`, and `launcher: "t3_thread_launch"`. Use the same selection-validation flags as `to-thread`.

Serialize the same `cwd`, `title`, and `prompt` task fields as `to-thread` into a JSON file, then pass it on stdin:

```text
node <to-worktree-thread-dir>/scripts/t3-worktree.mjs prepare --model <model> [--provider <instance-id>] [--option <id=value>] --json < <thread-json-file>
```

Optional fields:

| Field | Meaning |
| --- | --- |
| `baseBranch` | Explicit existing local base branch; otherwise use the saved project's checked-out branch. |
| `branchLabel` | Text to slug into `t3code/<slug>`; defaults to the title. Numeric suffixes resolve branch collisions. |
| `dedupeKey` | Literal substring matched against active titles within the saved project, across providers. Otherwise match the complete title. |
| `allowDuplicate` | Set `true` only for an explicit fresh/duplicate request. |

Both skill entry points select their own worktree behavior; omit `reuseWorktree` from task input. A preview request stops at the prepared `launch` arguments.

## 2. Launch, verify, and report

Launch and verify under `to-thread`'s step 4. The prepared `worktree` workspace strategy makes T3 create the thread, worktree, and first message in one launch, starting from the base branch or its origin counterpart per T3's `newWorktreesStartFromOrigin` setting. T3 runs scripts marked `runOnWorktreeCreate` before the agent starts, holding the first run in `preparing`; no configured setup is valid. The adapter prepends a gate requiring successful setup before the task starts. Never run setup again.

For a launched thread, verify the new worktree on the exact requested branch and directory `expected.worktreeName`, the requested model/options, and the first turn. Report `setup: started` or `not-configured`; a started setup and first turn are launch receipts, not completion evidence.
