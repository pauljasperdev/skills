---
name: to-thread
description: Open a native T3 thread on the current branch and worktree, or preview its dispatch. Use for a separate session on existing work; use to-worktree-thread when a new worktree is needed.
---

# To T3 thread

Create a native **T3 Code thread** and first turn on the current branch and worktree, including uncommitted files. This skill owns the shared T3 adapter, model selection, and verification. [`to-worktree-thread`](../to-worktree-thread/SKILL.md) uses that adapter to create a new worktree instead. Task wrappers supply their own prompts and follow-up actions.

## 1. Resolve the task and model

Resolve the current Git worktree root, a concise title, and the first prompt from the user's request or wrapper input. Carry enough context for an independent thread to do the requested work, including its scope and constraints. For an empty thread request, use `Wait for the user's next instruction.` as the first prompt.

Use the model supplied by the user or calling wrapper, together with any supplied provider and model options. **When no model is supplied, the agent must ask the user which model to use before dispatching**, including when only a provider is supplied. This skill has no default provider, model, or model options.

A provider may be omitted when exactly one configured T3 provider exposes the requested model. Ask which provider to use when multiple providers expose it. Preserve the caller's task: examination, implementation, and review are separate choices.

## 2. Check T3

Resolve this skill's installed directory and run its adapter with Node.js 22 or newer:

```text
node <to-thread-dir>/scripts/t3-worktree.mjs doctor --cwd <absolute-current-worktree-root>
```

The health check lists configured `providers` and their models. Confirm `checkout.projectPath` and `nativeBootstrapRpc: true`. Append `--model <model>`, optional `--provider <instance-id>`, and repeated `--option <id=value>` to validate a supplied selection.

The invoking checkout locates its saved T3 project through existing threads on that worktree, then exact path or Git common-directory identity. A missing project requires adding the repository in T3; report unavailable providers/models without substitution.

**T3 owns creation.** Run the adapter before concluding creation tools are unavailable. It uses the matching official CLI to issue and revoke a temporary session, then authenticated WebSocket RPC `orchestration.dispatchCommand` with one `thread.turn.start` bootstrap. For this skill, `createThread` keeps the current branch/path and `runSetupScript` is `false`. Do not substitute manual Git creation, direct database writes, another app's task tools, or a reconstructed RPC sequence.

## 3. Open the thread

Serialize one JSON object into a file, keeping task text out of shell code, then pass it on stdin:

```text
node <to-thread-dir>/scripts/t3-worktree.mjs open --model <model> [--provider <instance-id>] [--option <id=value>] --json < <thread-json-file>
```

Required task fields:

```json
{"cwd":"/absolute/current-worktree","title":"Review CSV export","prompt":"Review the CSV export changes. Keep the repository read-only."}
```

The adapter preserves the supplied prompt exactly. Optional `dedupeKey` matches a literal substring of active titles on this worktree across providers; otherwise match the complete title. Set `allowDuplicate: true` only for an explicit additional thread request. The current checkout must be branch-backed. Its staged, unstaged, and untracked files stay available; setup is skipped.

Append `--dry-run` to validate access and preview the payload without creating a thread. A preview still uses temporary authentication.

## 4. Verify and report

- `existing`: report the existing thread and skip creation. It may use a different model from the requested selection.
- `dry-run`: report the proposed payload, or an existing match; generated IDs are prospective.
- `created`: require `ok: true`, concrete `thread.id`, non-null `thread.worktreePath`, `worktree.detached: false`, and the requested model/options. The adapter verifies the registered worktree, exact branch/path, skipped setup, and first turn.
- Error: report the concrete code and whether dispatch may have created a thread. Preserve any created thread for diagnosis and stop; never silently retry creation. A batch wrapper may continue only for errors isolated to one task.

Report the provider/model, result, thread ID, branch, worktree, and setup status. A started first turn is a launch receipt, not evidence that the task completed. Return the receipt to a calling wrapper before its follow-up actions.
