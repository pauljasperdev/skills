---
name: review2claude
disable-model-invocation: true
description: Start a separate Claude Fable/high T3 review thread on the current branch and worktree, including uncommitted work, without changing the implementing thread.
allowed-tools: Bash(git:*), Bash(pwd:*), Bash(node:*)
---

# Review to Claude

Start a review of the current worktree in its own Fable 5.1 thread. The new thread reuses this worktree and branch rather than creating another one, so it reviews exactly the work sitting here — committed and uncommitted.

## Preconditions

- Run from inside a branch-backed Git worktree that belongs to a saved T3 project. A detached `HEAD` cannot back a T3 thread; stop and say so.
- A dirty worktree is expected and correct here. `/review` covers uncommitted and untracked work, so never stage, commit, stash, or clean before dispatching.
- Do not create a branch or worktree, run repository setup, edit files, update Linear, or start the review yourself in this session.
- Leave the invoking thread and other sibling threads unchanged, including their settlement, archive, and title state.
- The `review` skill must be installed for the Claude Code agent that T3 launches; the new thread's first prompt is the bare slash command.

## 1. Confirm the target

Resolve the current worktree root and branch. Report them before dispatching so the user can catch a wrong-worktree invocation.

Honor text supplied after `/review2claude` by passing it through as `args`; it is appended to the `/review` prompt, which is how the user names a different fixed point (a SHA, tag, or base branch other than the origin default).

Completion criterion: one branch-backed worktree path and its current branch are known.

## 2. Dispatch the thread

Resolve this skill's installed directory. Pass trusted structured input on stdin rather than interpolated shell flags:

```text
node <review2claude-skill-dir>/scripts/t3-review.mjs open --json <<'REVIEW2CLAUDE_JSON'
{"cwd":"<absolute-current-worktree>"}
REVIEW2CLAUDE_JSON
```

Add `"args":"<extra review instructions>"` when the user supplied any, and `"allowDuplicate":true` only when they explicitly asked for another review of the same worktree. Append `--dry-run` for a preview; it must not create a thread.

Use only the adapter's official T3 CLI authentication and native bootstrap RPC. Do not create a Git worktree, run setup, use UI automation, access T3's database directly, or fall back to an HTTP dispatch endpoint.

The adapter resolves the saved T3 project from an existing thread on this worktree, falling back to exact-path and Git common-directory identity, then bootstraps a thread with the current `worktreePath` and `branch` and `runSetupScript: false`. It titles the thread `<base title> · review`, deriving the base from the worktree's existing threads or, failing that, the branch name.

Treat `action: "existing"` as an idempotent success: report the existing review thread and do not create another unless the user explicitly asked for a duplicate.

On an adapter error, stop and report the error code plus any known created thread. Preserve partial state for diagnosis; do not blindly retry a dispatch whose outcome is uncertain.

A successful creation must report provider `claudeAgent`, model `claude-fable-5-1`, `effort: high`, the same `projectId`, `branch`, and canonical `worktreePath` as this worktree, and a started turn whose message is the `/review` prompt.

Completion criterion: one verified new review thread, one reported existing thread, a dry-run preview, or a recorded failure.

## 3. Report

Return a compact receipt:

```text
Review dispatched

Worktree: <path>
Branch: <branch>
Issue: <identifier or none>
Thread: <thread id/title> — Fable 5.1, high
Prompt: <the /review prompt>
Result: <created, dry-run, or existing>
```

Do not claim the review finished or summarize findings; only report that the verified review turn started. The findings land in the new thread.
