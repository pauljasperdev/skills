---
name: to-thread
description: Open a native T3 worktree thread for a task or supplied prompt, or inspect its dispatch with a dry run. Use directly without an issue tracker, or as the creation layer for dispatch wrappers.
---

# To T3 thread

Create a native **T3 Code thread**, branch-backed worktree, and first turn from a title and prompt. This skill owns T3 creation; wrappers supply their own task context and follow-up actions.

## 1. Resolve the task

Resolve the invoking checkout, a concise title, and the first prompt from the user's request or wrapper input. Carry enough context for an independent thread to do the requested work, including its scope and constraints. For an empty thread request, use `Wait for the user's next instruction.` as the first prompt.

Resolve profile `claude` or `codex` from the request or calling wrapper; ask when unspecified. Read [`scripts/profiles.mjs`](scripts/profiles.mjs) for the authoritative provider, model, and options. Preserve the requested task: examination and implementation are choices made by the caller.

## 2. Check T3

Resolve this skill's installed directory and run its adapter with Node.js 22 or newer:

```text
node <to-thread-dir>/scripts/t3-worktree.mjs doctor --profile <claude|codex> --cwd <absolute-invoking-checkout>
```

Confirm `checkout.projectPath`, `worktreeDefaults`, `provider`, and `nativeBootstrapRpc: true`. The invoking checkout locates a saved T3 project by exact path or Git common-directory identity. A missing project requires adding the repository in T3; unavailable providers/models must be reported without substitution.

**T3 owns creation.** Run the adapter before concluding creation tools are unavailable. It uses the matching official CLI to issue and revoke a temporary session, then authenticated WebSocket RPC `orchestration.dispatchCommand` with one `thread.turn.start` bootstrap containing `createThread`, `prepareWorktree`, and `runSetupScript: true`. Read-only Git inspection is expected. Do not substitute manual Git creation, direct database writes, another app's task tools, or a reconstructed RPC sequence.

## 3. Open the thread

Serialize one JSON object into a file, keeping task text out of shell code, then pass it on stdin:

```text
node <to-thread-dir>/scripts/t3-worktree.mjs open --profile <claude|codex> --json < <thread-json-file>
```

Required task fields:

```json
{"cwd":"/absolute/repo","title":"Investigate CSV export","prompt":"Use $examine-work to investigate CSV export. Keep the repository read-only."}
```

The prompt is supplied by the caller; the adapter prepends only the automatic-setup gate. Optional fields:

| Field | Meaning |
| --- | --- |
| `baseBranch` | Explicit existing local base branch; otherwise use the saved project's checked-out branch. |
| `branchLabel` | Text to slug into `t3code/<slug>`; defaults to the title. Numeric suffixes resolve branch collisions. |
| `dedupeKey` | Wrapper identity searched as a literal substring of active titles within this saved project, across profiles. Without it, match the complete title. |
| `allowDuplicate` | Set `true` only for an explicit fresh/duplicate request. |

For a preview, append `--dry-run`: the adapter validates access and prepares the payload without creating a thread or worktree. It still uses a temporary authentication session.

T3's `newWorktreesStartFromOrigin` setting determines the starting ref. T3 runs scripts marked `runOnWorktreeCreate`; no configured setup is valid. The first prompt waits for successful setup before starting the task. Never run setup again.

## 4. Verify and report

- `existing`: report the existing thread and skip creation. It may use a different model from the requested profile.
- `dry-run`: report the proposed payload, or an existing match; generated IDs are prospective.
- `created`: require `ok: true`, concrete `thread.id`, non-null `thread.worktreePath`, `worktree.detached: false`, and the requested model/options. The adapter verifies the registered worktree, exact branch, setup launch when configured, and first turn.
- Error: report the concrete code and whether dispatch may have created a thread. Preserve any created thread for diagnosis and stop; never silently retry creation. A batch wrapper may continue only for errors isolated to one task.

Report the profile/model, result, thread ID, worktree, and setup status. `setup: started` and a started first turn are launch receipts, not evidence that setup or the task completed. Return the receipt to a calling wrapper before it performs its own follow-up actions.
