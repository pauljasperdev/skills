---
name: to-worktree-thread
description: Open a native T3 thread in a new branch-backed worktree, or preview its dispatch. Use for isolated task work; use to-thread for a new thread on the current worktree.
---

# To T3 worktree thread

Create a native **T3 Code thread**, new branch-backed worktree, and first turn. Read [`to-thread`](../to-thread/SKILL.md) for task/model resolution, T3 access, and the receipt contract. Use this skill's adapter for creation; it shares the implementation with `to-thread` while selecting new-worktree behavior.

Both skills accept the caller's model, optional provider, and model options. Follow `to-thread`'s requirement to ask when no model is supplied. The caller chooses the task and supplies its first prompt.

The shared `to-thread` skill must be installed alongside this one. If missing, install both from the same source:

```sh
npx skills add pauljasperdev/skills -g --agent <invoking-agent> --skill to-thread to-worktree-thread -y
```

## 1. Check T3 and open the thread

Resolve this skill's installed directory and run its adapter with Node.js 22 or newer:

```text
node <to-worktree-thread-dir>/scripts/t3-worktree.mjs doctor --cwd <absolute-invoking-checkout>
```

Confirm `checkout.projectPath`, `worktreeDefaults`, and `nativeBootstrapRpc: true`. Use the same selection-validation flags as `to-thread`.

Serialize the same `cwd`, `title`, and `prompt` task fields as `to-thread` into a JSON file, then pass it on stdin:

```text
node <to-worktree-thread-dir>/scripts/t3-worktree.mjs open --model <model> [--provider <instance-id>] [--option <id=value>] --json < <thread-json-file>
```

Optional fields:

| Field | Meaning |
| --- | --- |
| `baseBranch` | Explicit existing local base branch; otherwise use the saved project's checked-out branch. |
| `branchLabel` | Text to slug into `t3code/<slug>`; defaults to the title. Numeric suffixes resolve branch collisions. |
| `dedupeKey` | Literal substring matched against active titles within the saved project, across providers. Otherwise match the complete title. |
| `allowDuplicate` | Set `true` only for an explicit fresh/duplicate request. |

Append `--dry-run` for a payload preview. Both skill entry points select their own worktree behavior; omit `reuseWorktree` from task input.

## 2. Verify and report

T3 creates the worktree through one native bootstrap containing `createThread`, `prepareWorktree`, and `runSetupScript: true`. Its `newWorktreesStartFromOrigin` setting determines the starting ref. T3 runs scripts marked `runOnWorktreeCreate`; no configured setup is valid. The adapter prepends a gate requiring successful setup before the task starts. Never run setup again.

Apply `to-thread`'s receipt and error contract. For `created`, verify a registered new worktree on the exact requested branch, the requested model/options, setup launch when configured, and the first turn. Report `setup: started` or `not-configured`; a started setup and first turn are launch receipts, not completion evidence.
