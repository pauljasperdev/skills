---
name: to-t3
description: Open unblocked Linear issues as native T3 Code worktree threads and start read-only issue reconnaissance.
---

# To T3

Turn selected Linear work into one native T3 Code worktree thread per issue. Let T3 own the branch, worktree, and configured worktree setup; start issue reconnaissance as the first agent turn.

## Invariants

- Treat invocation as authorization to create T3 threads and move successfully opened issues to the team's started status.
- Use the installed `linear` CLI for reads and updates, following the `/linear-cli` skill when available. Do not require a Codex-only Linear connector.
- Use `scripts/t3-worktree.mjs` for T3 access. It authenticates through the official T3 CLI and calls T3's native worktree bootstrap RPC; do not substitute Computer Use, browser automation, direct database access, or the HTTP dispatch endpoint.
- Do not run `git worktree`, create branches or tmux sessions, or run the repository bootstrap command yourself.
- Treat the invocation checkout only as a repository locator. It may already be a linked worktree; the adapter resolves it to T3's saved project by exact path or Git common-directory identity.
- Never open an issue with an unresolved blocker. A relation or blocker read failure is a failure, not clearance.
- Let T3 use the saved project's configured worktree base and automatic setup.
- Pin the first reconnaissance session to OpenCode model `openai/gpt-5.6-sol` with `variant: high` and `agent: build`.
- Name its branch `t3code/<issue-id>-<issue-title-slug>` so T3 gives the worktree the same issue-derived name; add a numeric suffix only for a real collision.
- Title every thread `<ISSUE_ID> — <issue title>` and start the OpenCode-native `/examine-issue` command as its first prompt.
- Move Linear only after the adapter verifies the concrete branch-backed worktree, setup launch, and first turn. Leave Linear unchanged when creation is unavailable or failed.

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

Resolve the installed skill directory, then run its adapter health check once from the current repository checkout. Pass the absolute invocation checkout, even when it is already a linked worktree; do not guess another checkout path manually:

```text
node <to-t3-skill-dir>/scripts/t3-worktree.mjs doctor --cwd <absolute-current-checkout>
```

Confirm that `checkout.projectPath` is the intended saved T3 project and that `worktreeDefaults.baseBranch` and `worktreeDefaults.startFromOrigin` match the requested launch. Stop with Linear unchanged if resolution or the health check fails. The adapter deliberately version-gates T3's unstable RPC rather than guessing after an app update.

For each clear issue, sequentially:

1. Immediately repeat the blocker gate.
2. Pass trusted structured input on stdin, not interpolated shell flags:

```text
node <to-t3-skill-dir>/scripts/t3-worktree.mjs open --json <<'TO_T3_JSON'
{"cwd":"<absolute-current-checkout>","issue":"<ISSUE_ID>","title":"<issue title>"}
TO_T3_JSON
```

3. Treat `action: "existing"` as skipped existing work and do not change Linear.
4. Treat only `ok: true`, `action: "created"`, a non-null `thread.worktreePath`, and `worktree.detached: false` as successful creation. The adapter uses the saved project's current branch as the base, honors T3's start-from-origin setting, verifies OpenCode is ready, pins the first session to GPT-5.6 Sol High in build mode, creates an issue-derived branch/worktree name, requests automatic setup, starts the fixed reconnaissance prompt, and verifies Git/T3 state.
5. On any adapter error, leave Linear unchanged. Do not fall back to UI automation, manual Git worktrees, direct T3 storage access, or HTTP dispatch.
6. Resolve the issue team's workflow status of type `started` and move the issue to that status. If the update fails, preserve the T3 thread and report the mismatch.

Completion criterion: each clear issue is an existing thread, a concrete new native worktree thread with reconnaissance started, or a recorded failure; only concrete new threads caused a Linear transition.

## 4. Report

Return a compact accounting:

```text
Opened T3 worktree threads

Selection: <selector and filters>
Count: <opened>/<eligible> opened, <existing> existing, <blocked> blocked, <failed> failed

| Issue | Title | T3 thread/worktree | Linear status | Result |
| ... |
```

Include blocked issues and failures only when non-empty. For adapter failures, include the error code and state that Linear was unchanged; never emit a UI-automation fallback.
