---
name: to-thread
description: Open a native T3 thread on the current branch and worktree, or preview its dispatch. Use for a separate session on existing work; use to-worktree-thread when a new worktree is needed.
---

# To T3 thread

Create a native **T3 Code thread** and first turn on the current branch and worktree, including uncommitted files. This skill owns the shared T3 adapter, model selection, and verification. [`to-worktree-thread`](../to-worktree-thread/SKILL.md) uses that adapter to create a new worktree instead. Task wrappers supply their own prompts and follow-up actions.

**The launcher creates the thread.** T3's `t3_thread_launch` tool is the only creation path: the adapter resolves and validates its arguments, and the agent passes them to the launcher unchanged. T3 tools may load late; load a deferred one first (Claude Code: ToolSearch `select:mcp__t3-code__t3_thread_launch,mcp__t3-code__t3_thread_read`) before concluding it is unavailable. When it is genuinely absent, report that and stop; manual Git creation, direct database writes, raw RPC, `t3 thread start`, and another app's task tools are not substitutes.

## 1. Resolve the task and model

Resolve the current Git worktree root, a concise title, and the first prompt from the user's request or wrapper input. Carry enough context for an independent thread to do the requested work, including its scope and constraints. For an empty thread request, use `Wait for the user's next instruction.` as the first prompt.

Use the model supplied by the user or calling wrapper, together with any supplied provider and model options. **When no model is supplied, the agent must ask the user which model to use before dispatching**, including when only a provider is supplied. This skill has no default provider, model, or model options.

A provider may be omitted when exactly one configured T3 provider exposes the requested model. Ask which provider to use when multiple providers expose it. Preserve the caller's task: examination, implementation, and review are separate choices.

## 2. Check T3

Resolve this skill's installed directory and run its adapter with Node.js 22 or newer:

```text
node <to-thread-dir>/scripts/t3-worktree.mjs doctor --cwd <absolute-current-worktree-root>
```

The health check lists configured `providers` and their models. Confirm `checkout.projectPath` and `launcher: "t3_thread_launch"`. Append `--model <model>`, optional `--provider <instance-id>`, and repeated `--option <id=value>` to validate a supplied selection.

The invoking checkout locates its saved T3 project through existing threads on that worktree, then exact path or Git common-directory identity. A missing project requires adding the repository in T3; report unavailable providers/models without substitution. The adapter reads T3 state through a temporary session that it issues and revokes with the matching official CLI; it never writes.

## 3. Prepare the launch

Serialize one JSON object into a file, keeping task text out of shell code, then pass it on stdin:

```text
node <to-thread-dir>/scripts/t3-worktree.mjs prepare --model <model> [--provider <instance-id>] [--option <id=value>] --json < <thread-json-file>
```

Required task fields:

```json
{"cwd":"/absolute/current-worktree","title":"Review CSV export","prompt":"Review the CSV export changes. Keep the repository read-only."}
```

The adapter preserves the supplied prompt exactly. Optional `dedupeKey` matches a literal substring of active titles on this worktree across providers; otherwise match the complete title. Set `allowDuplicate: true` only for an explicit additional thread request. The current checkout must be branch-backed. Its staged, unstaged, and untracked files stay available; setup is skipped.

`prepare` returns one of:

- `existing`: an active matching thread. Report it and skip the launch. It may use a different model from the requested selection.
- `launch`: `launch` holds the exact `t3_thread_launch` arguments, `expected` the values verification checks. The workspace strategy binds the current checkout: `root` for the project checkout, otherwise `existing_worktree`. Runtime and interaction modes are omitted so the thread inherits the caller's.

A preview request stops here: report the `launch` arguments without calling the launcher.

## 4. Launch, verify, and report

Call `t3_thread_launch` with the `launch` object unchanged. After an error or lost reply, retry once with the same arguments: the shared `clientRequestId` makes the retry idempotent. A fresh `prepare` mints a new `clientRequestId` and can create a second thread, so rerun it only after `t3_thread_read` or `t3_thread_list` shows no thread was created.

Then `t3_thread_read` the new thread and match it against `expected`: title, branch, `worktreePath` (or the worktree's directory name `worktreeName`), provider/model/options, and the prompt as the first user message with a started turn. A mismatch or failed turn is an error: report it, preserve the thread for diagnosis, and stop. A batch wrapper may continue only for errors isolated to one task.

Report the provider/model, result, thread `link`, branch, worktree, and `expected.setup`. A started first turn is a launch receipt, not evidence that the task completed. Return the receipt to a calling wrapper before its follow-up actions.
