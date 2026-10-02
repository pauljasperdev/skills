---
name: review2thread
disable-model-invocation: true
description: Open a separate T3 review thread using the requested model, with the original problem and implemented solution as context.
allowed-tools: Bash(git:*), Bash(pwd:*), Bash(node:*)
---

# Review to thread

Build a review prompt from this conversation, then use [`to-thread`](../to-thread/SKILL.md) to open a separate thread on the current branch and worktree, including uncommitted work. This wrapper owns the review context; `to-thread` owns model selection, creation, and verification.

## 1. Build the review context

Resolve the current Git worktree root and branch with read-only Git commands. Keep staged, unstaged, and untracked work available to the reviewer.

Start the prompt with literal `$review` for every provider, including Claude. Follow it with concise context from this conversation: the original problem and accepted requirements, implemented solution, checks actually run, known gaps, and any user-supplied review instructions, base ref, or issue. Ask for essential problem context when it is missing.

```text
$review

<context of the work done>
```

## 2. Delegate to to-thread

Read the installed `to-thread` skill and follow its model-selection and dispatch workflow. Forward the user's model, optional provider, model options, and preview intent unchanged. When no model is supplied, ask through `to-thread` before dispatching.

Supply the current worktree root as `cwd`, a concise task title ending in ` · review`, and the composed `prompt`. This opens the reviewer on the exact branch and worktree without creating another worktree or running setup. Set `allowDuplicate: true` only for an explicit additional review request.

The `to-thread` and `review` skills must be installed for the selected agent. Use `to-thread`'s adapter and receipt contract.

## 3. Report

Report the `to-thread` receipt: selected provider/model, result, thread ID, current branch and worktree, and setup status. A started turn means the review launched; findings arrive in the new thread.
