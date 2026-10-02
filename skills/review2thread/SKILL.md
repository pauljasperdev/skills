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

Use this conversation to fill the following prompt. Include accepted clarifications, additional review instructions, and any explicit base ref or issue context. Ask for essential problem context when it is missing:

```text
Use the installed review skill to review the current branch and worktree, including committed, staged, unstaged, and untracked changes. Keep the review read-only and report findings in this thread.

Original problem and requirements:
<original request, desired behavior, constraints, and accepted clarifications>

Implemented solution:
<changed areas, consequential design decisions, checks actually run, and known gaps>

Review instructions:
<the user's additional instructions and explicit base, when supplied>

Verify the solution against the original problem and repository standards. Treat the solution summary as claims to check against the code. Assess the supplied requirements even when no Linear issue owns this branch. Follow the review skill's applicable Linear checks when an issue is supplied or identified.
```

## 2. Delegate to to-thread

Read the installed `to-thread` skill and follow its model-selection and dispatch workflow. Forward the user's model, optional provider, model options, and preview intent unchanged. When no model is supplied, ask through `to-thread` before dispatching.

Supply the current worktree root as `cwd`, a concise task title ending in ` · review`, and the composed `prompt`. This opens the reviewer on the exact branch and worktree without creating another worktree or running setup. Set `allowDuplicate: true` only for an explicit additional review request.

The `to-thread` and `review` skills must be installed for the selected agent. Use `to-thread`'s adapter and receipt contract.

## 3. Report

Report the `to-thread` receipt: selected provider/model, result, thread ID, current branch and worktree, and setup status. A started turn means the review launched; findings arrive in the new thread.
