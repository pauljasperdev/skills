---
name: to-thread
description: Open a native T3 worktree thread for a task or supplied prompt, or inspect its dispatch with a dry run. Use directly without an issue tracker, or as the creation layer for dispatch wrappers.
---

# To T3 thread

Create a native **T3 Code thread** and first turn from a title and prompt, using a new branch-backed worktree or the current worktree when requested. This skill owns T3 creation; wrappers supply their own task context and follow-up actions.

## 1. Resolve the task

Resolve the invoking checkout, a concise title, and the first prompt from the user's request or wrapper input. Carry enough context for an independent thread to do the requested work, including its scope and constraints. For an empty thread request, use `Wait for the user's next instruction.` as the first prompt.

Use the model supplied by the user or calling wrapper, together with any supplied provider and model options. **When no model is supplied, the agent must ask the user which model to use before dispatching**, including when only a provider is supplied. This skill has no default provider, model, or model options.

A provider may be omitted when exactly one configured T3 provider exposes the requested model. Ask which provider to use when the model is exposed by multiple providers. Preserve the requested task: examination, implementation, and review are choices made by the caller.

## 2. Check T3

Resolve this skill's installed directory and run its adapter with Node.js 22 or newer:

```text
node <to-thread-dir>/scripts/t3-worktree.mjs doctor --cwd <absolute-invoking-checkout>
```

The health check lists configured `providers` and their models so the agent can resolve the supplied selection or offer choices when asking. Confirm `checkout.projectPath`, `worktreeDefaults`, and `nativeBootstrapRpc: true`. Append `--model <model>`, optional `--provider <instance-id>`, and repeated `--option <id=value>` to validate a supplied selection. The invoking checkout locates its saved T3 project through existing threads on that worktree, then exact path or Git common-directory identity. A missing project requires adding the repository in T3; unavailable providers/models must be reported without substitution.

**T3 owns creation.** Run the adapter before concluding creation tools are unavailable. It uses the matching official CLI to issue and revoke a temporary session, then authenticated WebSocket RPC `orchestration.dispatchCommand` with one `thread.turn.start` bootstrap. A new worktree uses `createThread`, `prepareWorktree`, and `runSetupScript: true`; reusing the current worktree uses `createThread` with its current branch/path and `runSetupScript: false`. Read-only Git inspection is expected. Do not substitute manual Git creation, direct database writes, another app's task tools, or a reconstructed RPC sequence.

## 3. Open the thread

Serialize one JSON object into a file, keeping task text out of shell code, then pass it on stdin:

```text
node <to-thread-dir>/scripts/t3-worktree.mjs open --model <model> [--provider <instance-id>] [--option <id=value>] --json < <thread-json-file>
```

Required task fields:

```json
{"cwd":"/absolute/repo","title":"Investigate CSV export","prompt":"Use $examine-work to investigate CSV export. Keep the repository read-only."}
```

The prompt is supplied by the caller; for a new worktree, the adapter prepends only the automatic-setup gate. Reusing a worktree preserves the prompt exactly. Optional fields:

| Field | Meaning |
| --- | --- |
| `baseBranch` | Explicit existing local base branch; otherwise use the saved project's checked-out branch. |
| `branchLabel` | Text to slug into `t3code/<slug>`; defaults to the title. Numeric suffixes resolve branch collisions. |
| `dedupeKey` | Wrapper identity searched as a literal substring of active titles within this saved project, across providers. Without it, match the complete title. |
| `reuseWorktree` | Set `true` to open the thread on the invoking checkout's current branch and worktree, including uncommitted work; skip worktree creation and setup. |
| `allowDuplicate` | Set `true` only for an explicit fresh/duplicate request. |

For a preview, append `--dry-run`: the adapter validates access and prepares the payload without creating a thread or worktree. It still uses a temporary authentication session.

For a new worktree, T3's `newWorktreesStartFromOrigin` setting determines the starting ref. T3 runs scripts marked `runOnWorktreeCreate`; no configured setup is valid. The first prompt waits for successful setup before starting the task. Never run setup again. With `reuseWorktree: true`, resolve `cwd` to the current Git worktree root; the adapter requires a branch-backed checkout and retains its existing files.

## 4. Verify and report

- `existing`: report the existing thread and skip creation. It may use a different model from the requested selection.
- `dry-run`: report the proposed payload, or an existing match; generated IDs are prospective.
- `created`: require `ok: true`, concrete `thread.id`, non-null `thread.worktreePath`, `worktree.detached: false`, and the requested model/options. The adapter verifies the registered worktree, exact branch, setup launch when configured for a new worktree, or the exact worktree path with setup skipped when reusing it, and first turn.
- Error: report the concrete code and whether dispatch may have created a thread. Preserve any created thread for diagnosis and stop; never silently retry creation. A batch wrapper may continue only for errors isolated to one task.

Report the provider/model, result, thread ID, worktree, and setup status. `setup: started` and a started first turn are launch receipts, not evidence that setup or the task completed. Return the receipt to a calling wrapper before it performs its own follow-up actions.
