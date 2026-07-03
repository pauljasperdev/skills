#!/usr/bin/env bash
set -uo pipefail
IFS=$'\n\t'

fail_global() {
  printf 'ERROR\t%s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail_global "missing command: $1"
}

emit_fail() {
  printf 'FAIL\t%s\t%s\n' "$1" "$2"
}

slugify() {
  printf '%s-%s' "$1" "$2" \
    | tr '[:upper:]' '[:lower:]' \
    | perl -0pe 's/[^a-z0-9]+/-/g; s/^-|-$//g; s/-+/-/g'
}

is_git_worktree() {
  [[ -e "$1" ]] && git -C "$1" rev-parse --is-inside-work-tree >/dev/null 2>&1
}

if [[ "$#" -lt 1 ]]; then
  fail_global "usage: $0 ISSUE_ID [ISSUE_ID ...]"
fi

for cmd in git linear tmux perl tr mkdir dirname; do
  require_cmd "$cmd"
done

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || fail_global "not inside a git repository"
WORKTREE_PARENT="${TO_WT_WORKTREE_PARENT:-$(dirname "$REPO_ROOT")}" || fail_global "could not resolve worktree parent"
mkdir -p "$WORKTREE_PARENT" || fail_global "could not create worktree parent: $WORKTREE_PARENT"

DEFAULT_BRANCH="$(git remote show origin 2>/dev/null | perl -ne 'print "$1\n" if /HEAD branch: (.+)/' | head -n 1)"
[[ -n "$DEFAULT_BRANCH" ]] || fail_global "could not determine origin HEAD branch"

BASE_BRANCH="${BASE_BRANCH:-origin/$DEFAULT_BRANCH}"
if [[ "$BASE_BRANCH" == origin/* ]]; then
  FETCH_BRANCH="${BASE_BRANCH#origin/}"
else
  FETCH_BRANCH="$DEFAULT_BRANCH"
fi

git fetch origin "$FETCH_BRANCH" >/dev/null || fail_global "failed to fetch origin/$FETCH_BRANCH"
printf 'BASE\t%s\n' "$BASE_BRANCH"

for RAW_ISSUE_ID in "$@"; do
  ISSUE_ID="$(printf '%s' "$RAW_ISSUE_ID" | tr '[:lower:]' '[:upper:]')"

  if [[ ! "$ISSUE_ID" =~ ^[A-Z][A-Z0-9]*-[0-9]+$ ]]; then
    emit_fail "$RAW_ISSUE_ID" "invalid Linear issue identifier"
    continue
  fi

  if ! TITLE="$(linear issue title "$ISSUE_ID" | tr -d '\r')"; then
    emit_fail "$ISSUE_ID" "could not read issue title"
    continue
  fi

  if ! URL="$(linear issue url "$ISSUE_ID" | tr -d '\r')"; then
    emit_fail "$ISSUE_ID" "could not read issue URL"
    continue
  fi

  if linear issue update "$ISSUE_ID" --state "In Progress" >/dev/null; then
    STATUS_NOTE="status: In Progress"
  elif linear issue update "$ISSUE_ID" --state started >/dev/null; then
    STATUS_NOTE="status: started"
  else
    emit_fail "$ISSUE_ID" "failed to move issue In Progress; no worktree created"
    continue
  fi

  WORKTREE_NAME="$(slugify "$ISSUE_ID" "$TITLE")"
  WORKTREE_PATH="$WORKTREE_PARENT/$WORKTREE_NAME"
  WORKTREE_NOTE="worktree: existing"

  if is_git_worktree "$WORKTREE_PATH"; then
    WORKTREE_NOTE="worktree: existing"
  elif [[ -e "$WORKTREE_PATH" ]]; then
    emit_fail "$ISSUE_ID" "path exists but is not a git worktree: $WORKTREE_PATH"
    continue
  else
    if git show-ref --verify --quiet "refs/heads/$WORKTREE_NAME"; then
      if ! git worktree add "$WORKTREE_PATH" "$WORKTREE_NAME" >/dev/null; then
        emit_fail "$ISSUE_ID" "failed to add worktree from existing branch $WORKTREE_NAME"
        continue
      fi
    else
      if ! git worktree add -b "$WORKTREE_NAME" "$WORKTREE_PATH" "$BASE_BRANCH" >/dev/null; then
        emit_fail "$ISSUE_ID" "failed to create worktree from $BASE_BRANCH"
        continue
      fi
    fi
    WORKTREE_NOTE="worktree: created"
  fi

  SESSION="wt-$WORKTREE_NAME"
  TMUX_NOTE="tmux: existing"
  if ! tmux has-session -t "$SESSION" 2>/dev/null; then
    if ! tmux new-session -d -s "$SESSION" -n editor -c "$WORKTREE_PATH" "exec zsh"; then
      emit_fail "$ISSUE_ID" "failed to create tmux session $SESSION"
      continue
    fi
    tmux new-window -t "$SESSION:" -n code -c "$WORKTREE_PATH" "pi \"/examine-issue $ISSUE_ID\"; exec zsh"
    LEFT_PANE="$(tmux display-message -p -t "$SESSION:code" '#{pane_id}')"
    tmux split-window -dh -t "$LEFT_PANE" -c "$WORKTREE_PATH" "bun run bootstrap; exec zsh"
    tmux select-pane -t "$LEFT_PANE"
    tmux new-window -t "$SESSION:" -n tasks -c "$WORKTREE_PATH" "exec zsh"
    tmux select-window -t "$SESSION:code"
    TMUX_NOTE="tmux: created"
  fi

  printf 'OK\t%s\t%s\t%s\t%s\t%s; %s; %s; %s\n' \
    "$ISSUE_ID" "$TITLE" "$WORKTREE_PATH" "$SESSION" "$STATUS_NOTE" "$WORKTREE_NOTE" "$TMUX_NOTE" "$URL"
done
