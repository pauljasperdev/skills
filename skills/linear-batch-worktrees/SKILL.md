---
name: linear-batch-worktrees
description: Batch-open ready-to-use coding worktrees from Linear issue sets. Use this skill whenever the user asks to open multiple Linear worktrees, start several issues, batch start To Do issues, open the top N Linear todos by priority, open worktrees for a milestone/project/cycle/label, or says things like “open 3 worktrees”, “linear worktrees”, or “start the active todos”. This skill selects issues with the Linear CLI, does not invent priorities, and creates each worktree/session itself.
allowed-tools: Bash(linear:*), Bash(lazyworktree:*), Bash(tmux:*), Bash(git:*), Bash(jq:*), Bash(perl:*), Bash(mktemp:*), Bash(cat:*), Bash(printf:*), Bash(tr:*), Bash(sed:*), Bash(head:*), Bash(sort:*), Bash(tee:*)
---

# Linear Batch Worktrees

Use this skill to turn a Linear issue set into multiple ready-to-use worktrees. This is not a prioritization or planning workflow: selection comes from explicit user filters plus Linear's existing priority order.

## Dependencies

There is no supported cross-skill dependency mechanism to rely on. This skill is self-contained: it includes the same per-issue worktree/session procedure that the standalone `linear-worktree` skill uses.

## Core behavior

1. Resolve the issue set with the Linear CLI.
2. Sort by Linear priority when selecting a limited number.
3. Open each selected issue one-by-one using the embedded per-issue workflow below.
4. Do not attach to tmux sessions or disturb the user's current session.
5. Do not launch extra implementation agents. The only agent-like startup is the `pi "/examine-issue <ISSUE_ID>"` command in each tmux `code` pane.
6. Return one batch report covering every issue.

## Selection rules

### Explicit issue IDs or URLs

If the user gives issue IDs or Linear URLs, extract all IDs like `GEM-123`, de-duplicate while preserving order, and open exactly those issues.

### Count only: “open 3”, “start five todos”

If the user gives only a count, select To Do issues by Linear priority:

```bash
linear issue query --state unstarted --all-teams --sort priority --limit "$COUNT" --json
```

Use `.nodes[].identifier` as the issue IDs. `unstarted` is the Linear state type for To Do/not-started work.

### No filters/count: default behavior

If the user invokes this skill without a specific filter or count, open all current To Do issues, sorted by Linear priority:

```bash
linear issue query --state unstarted --all-teams --sort priority --limit 0 --json
```

If the result is unexpectedly huge, pause and ask before creating dozens of worktrees. Otherwise proceed.

### Milestone/project instructions

If the user says “this milestone”, “milestone X”, or similar, treat the milestone as a filter on issues to start.

Prefer this shape when the project is known:

```bash
linear issue query \
  --project "$PROJECT" \
  --milestone "$MILESTONE" \
  --state unstarted \
  --all-teams \
  --sort priority \
  --limit "$LIMIT_OR_0" \
  --json
```

Linear's CLI requires `--project` with `--milestone`. If the user gives a milestone without a project:

1. Try to infer the project only if it is obvious from the user's words or repository context.
2. Otherwise ask a short clarification for the project name/slug.
3. Do not guess between multiple plausible projects.

If the user explicitly says “all issues in this milestone”, include all active states by using repeated state filters:

```bash
--state unstarted --state started
```

Do not include completed or canceled issues unless the user explicitly asks for those states.

### Other Linear filters

Map common user filters directly to `linear issue query` options:

- “project X” → `--project "X"`
- “cycle active” → `--cycle active`
- “cycle 12” → `--cycle 12`
- “label X” → `--label "X"`
- “team GEM” → `--team GEM` instead of `--all-teams`
- “assigned to me” → use `linear issue mine --json` only if query cannot express it cleanly; otherwise use `--assignee self` if supported by the local CLI

Keep `--state unstarted` unless the user explicitly requests another state. This skill starts work; it should not silently reopen completed/canceled items.

## Running the batch

After selecting candidates, build a concise preview internally:

```bash
linear issue query ... --json | jq -r '.nodes[] | [.identifier, .priorityLabel, .title] | @tsv'
```

For each selected issue ID, run this per-issue procedure. It is okay to execute it in a shell loop for speed, but keep the behavior identical:

```bash
ISSUE_ID="GEM-123"
TITLE="$(linear issue title "$ISSUE_ID" | tr -d '\r')"
URL="$(linear issue url "$ISSUE_ID" | tr -d '\r')"

STATUS_UPDATED=0
if linear issue update "$ISSUE_ID" --state "In Progress"; then
  STATUS_UPDATED=1
elif linear issue update "$ISSUE_ID" --state started; then
  STATUS_UPDATED=1
else
  echo "Failed to move $ISSUE_ID to In Progress" >&2
  exit 1
fi

WORKTREE_NAME="$(printf '%s-%s' "$ISSUE_ID" "$TITLE" \
  | tr '[:upper:]' '[:lower:]' \
  | perl -0pe 's/[^a-z0-9]+/-/g; s/^-|-$//g; s/-+/-/g')"

DEFAULT_BRANCH="$(git remote show origin | perl -ne 'print "$1\n" if /HEAD branch: (.+)/')"
BASE_BRANCH="${BASE_BRANCH:-origin/$DEFAULT_BRANCH}"
git fetch origin "$DEFAULT_BRANCH"
WORKTREE_PATH_FILE="$(mktemp)"
lazyworktree create \
  --from-branch "$BASE_BRANCH" \
  --description "$ISSUE_ID: $TITLE" \
  --note "$URL" \
  --output-selection "$WORKTREE_PATH_FILE" \
  "$WORKTREE_NAME"
WORKTREE_PATH="$(cat "$WORKTREE_PATH_FILE")"

SESSION="wt-$WORKTREE_NAME"
CREATED_SESSION=0
if ! tmux has-session -t "$SESSION" 2>/dev/null; then
  CREATED_SESSION=1
  tmux new-session -d -s "$SESSION" -n editor -c "$WORKTREE_PATH" "exec zsh"
  tmux new-window -t "$SESSION:" -n code -c "$WORKTREE_PATH" "pi \"/examine-issue $ISSUE_ID\"; exec zsh"
  LEFT_PANE="$(tmux display-message -p -t "$SESSION:code" '#{pane_id}')"
  tmux split-window -dh -t "$LEFT_PANE" -c "$WORKTREE_PATH" "bun run bootstrap; exec zsh"
  tmux select-pane -t "$LEFT_PANE"
  tmux new-window -t "$SESSION:" -n tasks -c "$WORKTREE_PATH" "exec zsh"
  tmux select-window -t "$SESSION:code"
fi
```

If one issue fails after selection, record the failure and continue with the remaining issues unless the failure indicates a global problem such as missing Linear auth, missing git remote, or missing `lazyworktree`.

## Dry-run / preview mode

If the user says “dry run”, “preview”, “show what you would open”, or asks a question rather than requesting action, do not mutate Linear and do not create worktrees. Only return the selected issue list and the command/filter logic used.

## Output format

Return a compact batch report:

```text
Opened Linear worktrees

Selection: <filter summary>
Base branch: <base branch>
Count: <opened>/<selected> opened, <failed> failed

| Issue | Priority | Title | Worktree | tmux | Status |
| ... |

Failures:
- <issue>: <short reason>
```

For each successful issue, include issue id, title, worktree path/name, tmux session name, status update result, and whether worktree/session was created or already existed.

## Guardrails

- Do not reprioritize, estimate, or choose based on your own assessment of importance. Use Linear priority order and the user's filters.
- Ask when the candidate set is ambiguous; do not ask when the user gave exact issue IDs or a clear count/filter.
- Prefer one clear Linear query over many ad-hoc searches.
- Never call `lazyworktree exec --key t`; it attaches and changes the user's current session.
- Do not attach to tmux. Use detached session creation only.
