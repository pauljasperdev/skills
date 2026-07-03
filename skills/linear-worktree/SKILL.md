---
name: linear-worktree
description: Create a ready-to-use coding workspace from a Linear issue. Use when the user gives a Linear issue id, Linear URL, or issue title and asks to start work, create a worktree, open panes, or set up a background dev session for it. Resolves the issue with the linear CLI, marks it In Progress, creates a lazyworktree worktree named with issue id + title from the remote default branch unless another base is requested, then manually starts a detached tmux setup that mirrors lazyworktree's dev panes without attaching.
allowed-tools: Bash(linear:*), Bash(lazyworktree:*), Bash(tmux:*), Bash(git:*), Bash(rg:*), Bash(perl:*), Bash(jq:*), Bash(mktemp:*), Bash(cat:*)
---

# Linear Worktree

Use the `linear` CLI for Linear data, `lazyworktree` only to create the worktree, and `tmux` to start the session detached. Do not call `lazyworktree exec --key t`; that attaches and changes the user's current session.

## Workflow

1. Resolve the issue:
   - If input contains an id like `GEM-123`, use it.
   - If input is a URL, extract the same id from the URL.
   - If only a title/search term is given, run:
     ```bash
     linear issue query --search "<term>" --all-states --limit 10 --json
     ```
     Ask the user to choose if there is not one obvious match.

2. Get title + URL:
   ```bash
   ISSUE_ID="GEM-123"
   TITLE="$(linear issue title "$ISSUE_ID" | tr -d '\r')"
   URL="$(linear issue url "$ISSUE_ID" | tr -d '\r')"
   ```

3. Mark the issue In Progress immediately after resolving it and before creating the worktree. This records that the agent/user has picked up the issue. Prefer the workspace's explicit `In Progress` workflow state, and fall back to Linear's generic `started` state type if that exact state name is unavailable. If both updates fail, stop and report the failure instead of creating a worktree for an issue that was not moved into progress.
   ```bash
   STATUS_UPDATED=0
   if linear issue update "$ISSUE_ID" --state "In Progress"; then
     STATUS_UPDATED=1
   elif linear issue update "$ISSUE_ID" --state started; then
     STATUS_UPDATED=1
   else
     echo "Failed to move $ISSUE_ID to In Progress" >&2
     exit 1
   fi
   ```

4. Create a lowercase slug from issue id + title:
   ```bash
   WORKTREE_NAME="$(printf '%s-%s' "$ISSUE_ID" "$TITLE" \
     | tr '[:upper:]' '[:lower:]' \
     | perl -0pe 's/[^a-z0-9]+/-/g; s/^-|-$//g; s/-+/-/g')"
   ```

5. Create the worktree from the remote default branch by default and capture its path. If the user explicitly asks for another base branch, set `BASE_BRANCH` to that branch instead.
   ```bash
   DEFAULT_BRANCH="$(git remote show origin | perl -ne 'print "$1\n" if /HEAD branch: (.+)/')"
   BASE_BRANCH="origin/$DEFAULT_BRANCH"
   git fetch origin "$DEFAULT_BRANCH"
   WORKTREE_PATH_FILE="$(mktemp)"
   lazyworktree create \
     --from-branch "$BASE_BRANCH" \
     --description "$ISSUE_ID: $TITLE" \
     --note "$URL" \
     --output-selection "$WORKTREE_PATH_FILE" \
     "$WORKTREE_NAME"
   WORKTREE_PATH="$(cat "$WORKTREE_PATH_FILE")"
   ```

6. Start a detached tmux session without attaching:
   ```bash
   SESSION="wt-$WORKTREE_NAME"
   if ! tmux has-session -t "$SESSION" 2>/dev/null; then
     tmux new-session -d -s "$SESSION" -n editor -c "$WORKTREE_PATH" "exec zsh"
     tmux new-window -t "$SESSION:" -n code -c "$WORKTREE_PATH" "pi \"/examine-issue $ISSUE_ID\"; exec zsh"
     LEFT_PANE="$(tmux display-message -p -t "$SESSION:code" '#{pane_id}')"
     tmux split-window -dh -t "$LEFT_PANE" -c "$WORKTREE_PATH" "bun run bootstrap; exec zsh"
     tmux select-pane -t "$LEFT_PANE"
     tmux new-window -t "$SESSION:" -n tasks -c "$WORKTREE_PATH" "exec zsh"
     tmux select-window -t "$SESSION:code"
   fi
   ```

The `code` window's left pane starts `pi "/examine-issue <ISSUE_ID>"`; the right pane runs bootstrap. The user's current tmux session is left alone.

Return the issue id, title, worktree path/name, tmux session name, whether the status was updated to In Progress, and whether the tmux session/worktree was created or already existed.
