---
name: linear2claude
description: Open one, many, filtered, or all unblocked Linear To Do issues as native T3 Code worktree threads, pin each first session to Claude Fable 5.1 at high effort, and start /examine-issue. Use whenever the user asks to send, open, start, or dispatch Linear work to Claude or Fable in T3. Never use for handing an already examined worktree to Codex; use /handoff2codex for that.
---

# Linear to Claude

Turn selected Linear work into one native T3 Code worktree thread per issue. Let T3 own the branch, worktree, and configured worktree setup; start repository-read-only issue examination as the first Claude Code turn.

## Invariants

- Treat invocation as authorization to create T3 threads and move each successfully opened issue to its team's entry `started` status.
- Use the installed `linear` CLI for Linear reads and the one status transition, following `/linear-cli` when available. `/examine-issue` is stateless and never changes Linear.
- Use `scripts/t3-worktree.mjs` for T3 access. It authenticates through the official T3 CLI and calls T3's native worktree bootstrap RPC; do not substitute Computer Use, browser automation, direct database access, or an HTTP dispatch endpoint. T3 is alpha software, so attempt the current CLI and RPC before reporting a concrete incompatibility.
- Do not run `git worktree`, create branches or tmux sessions, or run repository setup yourself.
- Treat the invocation checkout only as a repository locator. It may already be a linked worktree; the adapter resolves it to T3's saved project by exact path or Git common-directory identity.
- Never open an issue with an unresolved blocker. A relation or blocker read failure is a failure, not clearance.
- Let T3 use the saved project's configured worktree base and automatic setup.
- Pin the first session to provider `claudeAgent`, model `claude-fable-5-1`, with `effort: high`.
- Name its branch `t3code/<issue-id>-<issue-title-slug>` so T3 gives the worktree the same issue-derived name; add a numeric suffix only for a real collision.
- Title every thread `<ISSUE_ID> — <issue title>` and start `/examine-issue <ISSUE_ID>` as its first prompt.
- Update Linear only after the adapter verifies the concrete branch-backed worktree, setup launch, and first examination turn. Leave it unchanged for blocked, failed, dry-run, or existing results.

## 1. Select issues

Resolve an ordered, de-duplicated candidate list with the Linear CLI:

- Identifiers or Linear URLs: preserve first-seen order.
- One title or search phrase: search at most ten results and continue only for one obvious match.
- Count only: page through all unstarted issues and sort by Linear priority, then creation time and identifier.
- Project, cycle, label, team, milestone, or assignee filters: map them directly to Linear filters and default to unstarted issues.
- No selector: use the complete unstarted queue in Linear priority order. Ask before opening more than twelve issues unless the user explicitly requested all.

An explicitly named issue may be active, but do not reopen completed, canceled, or duplicate work unless the user explicitly requests it. Do not apply a requested count until after blocker filtering.

Completion criterion: every candidate has a known identifier and deterministic position in the selection.

## 2. Gate blockers

For every candidate, fetch relation-aware issue detail through Linear:

1. Read every `blockedBy` relation.
2. Fetch each blocker and inspect its current workflow-state type.
3. Treat completed, canceled, and duplicate blockers as resolved; every other blocker remains active.
4. Classify the candidate as `CLEAR`, `BLOCKED`, or `FAIL`.

Apply any requested count to the ordered `CLEAR` results. Keep an accounting of blocked and failed candidates skipped while filling it.

For dry-run or preview requests, stop here and report what would open or be skipped. Do not create T3 threads or update Linear.

Completion criterion: every selected issue is clear, blocked with named blockers, or failed with a reason.

## 3. Create native T3 threads

Resolve the installed skill directory, then run its adapter health check once from the current repository checkout. Pass the absolute invocation checkout, even when it is already a linked worktree:

```text
node <linear2claude-skill-dir>/scripts/t3-worktree.mjs doctor --cwd <absolute-current-checkout>
```

Confirm that `checkout.projectPath` is the intended saved T3 project, `worktreeDefaults.baseBranch` and `worktreeDefaults.startFromOrigin` match the requested launch, and `examineProvider` reports Fable 5.1 at high effort. Stop with Linear unchanged if resolution or the health check fails.

For each clear issue, sequentially:

1. Immediately repeat the blocker gate.
2. Pass trusted structured input on stdin, never interpolated shell flags:

```text
node <linear2claude-skill-dir>/scripts/t3-worktree.mjs open --json <<'LINEAR2CLAUDE_JSON'
{"cwd":"<absolute-current-checkout>","issue":"<ISSUE_ID>","title":"<issue title>"}
LINEAR2CLAUDE_JSON
```

3. Treat `action: "existing"` as skipped existing work and do not change Linear.
4. Treat only `ok: true`, `action: "created"`, a non-null `thread.worktreePath`, and `worktree.detached: false` as successful creation. The adapter uses the saved project's current branch as the base, honors T3's start-from-origin setting, verifies Claude Code and Fable 5.1 are ready, creates the issue-derived branch/worktree, requests automatic setup, starts the fixed examination prompt, and verifies Git/T3 state.
5. On any adapter error, make no Linear update and report whether the child turn may have started. Do not fall back to UI automation, manual Git worktrees, direct T3 storage access, or HTTP dispatch.
6. Resolve the issue team's active workflow states and select the `started` state with the lowest workflow position. Fail on a true position tie rather than guessing. Update the issue to that exact state and immediately re-read it to verify the transition. If discovery, update, or verification fails, preserve the T3 thread and report the mismatch.

Completion criterion: each clear issue is an existing thread, a concrete new native worktree thread with examination started and a verified Linear transition, or a recorded failure.

## 4. Report

Return a compact accounting:

```text
Opened Claude worktree threads

Selection: <selector and filters>
Count: <opened>/<eligible> opened, <existing> existing, <blocked> blocked, <failed> failed

| Issue | Title | T3 thread/worktree | Linear status | Result |
| ... |
```

Include blocked issues and failures only when non-empty. Report the verified transition for each newly created thread. For adapter failures, include the error code and state that Linear was unchanged. For a post-creation status failure, keep the thread and report the actual Linear state when it can be freshly read.
