---
name: to-wt
disable-model-invocation: true
description: Open Linear To Do issues as detached git-worktree/tmux workspaces.
allowed-tools: Bash(bash:*), Bash(linear:*), Bash(tmux:*), Bash(git:*), Bash(jq:*), Bash(perl:*), Bash(mktemp:*), Bash(cat:*), Bash(printf:*), Bash(tr:*), Bash(sed:*), Bash(head:*), Bash(sort:*), Bash(tee:*), Bash(wc:*), Bash(rg:*), Bash(mkdir:*), Bash(dirname:*)
---

# to-wt

`to-wt` means To Do → worktree: resolve Linear work, move it In Progress, create git worktrees, and start detached tmux sessions. It handles one issue, many issues, or the current To Do queue with the same opening procedure.

Use the bundled script `scripts/open-to-wt.sh` for mutation. Resolve that path relative to this `SKILL.md`. The script is the single source of truth for worktree/session creation.

Do not prioritize or plan work yourself. Selection comes from explicit user selectors plus Linear's priority order.

## Steps

1. Resolve the selector into an ordered, de-duplicated issue list.
   - Exact issue IDs or Linear URLs: extract all IDs like `GEM-123`, preserve first-seen order, and open exactly those.
   - One title/search term: run `linear issue query --search "<term>" --all-states --limit 10 --json`; ask only if there is not one obvious match.
   - Count only, such as “open 3” or “start five todos”: select To Do issues by priority.
   - Filters, such as project/cycle/label/milestone/team: map directly to `linear issue query`; keep `--state unstarted` unless the user asks for another state.
   - No selector: select all current To Do issues by priority.
   - Completion criterion: every issue to open has a known Linear identifier, the order is fixed, and any ambiguity has been resolved or asked.

2. If the user asked for dry-run, preview, or a question about what would open, stop before mutation.
   - Return the selected issues and the Linear command/filter logic.
   - Do not update Linear, create worktrees, or start tmux.
   - Completion criterion: the preview names every selected issue and no state changed.

3. Open every selected issue with the bundled script.
   - If the user names another base branch, pass it as `BASE_BRANCH=origin/<branch>` unless they explicitly need a local branch.
   - Optional: set `TO_WT_WORKTREE_PARENT=<dir>` if the user asks for a specific worktree location; otherwise the script creates sibling directories next to the current repo root.
   - Run:
     ```bash
     BASE_BRANCH="${BASE_BRANCH:-}" bash <skill-dir>/scripts/open-to-wt.sh GEM-123 GEM-124
     ```
   - The script moves each issue In Progress before creating its worktree. If that update fails for an issue, that issue gets no worktree.
   - The script starts tmux detached and never attaches.
   - Completion criterion: every selected issue has either a worktree/tmux result or a recorded failure.

4. Return one compact report.
   - Include selection summary, base branch, opened/selected/failed counts, and a table with issue id, title, worktree path/name, tmux session, status update, and created/already-existed notes.
   - Completion criterion: every selected issue appears exactly once in the report.

## Selector commands

### Count-only To Do selection

```bash
linear issue query --state unstarted --all-teams --sort priority --limit "$COUNT" --json
```

Use `.nodes[].identifier` as the issue IDs. `unstarted` is Linear's To Do/not-started state type.

### No-selector default

```bash
linear issue query --state unstarted --all-teams --sort priority --limit 0 --json
```

If this returns more than 12 issues and the user did not explicitly ask for “all”, ask before opening them.

### Milestones

Linear's CLI requires `--project` with `--milestone`:

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

If the user gives a milestone without a project, infer the project only when it is obvious from the user's words or repository context; otherwise ask for the project name/slug.

If the user explicitly says “all issues in this milestone,” include active states with repeated state filters:

```bash
--state unstarted --state started
```

Do not include completed or canceled issues unless the user explicitly asks.

### Other filters

Map common filters directly:

- “project X” → `--project "X"`
- “cycle active” → `--cycle active`
- “cycle 12” → `--cycle 12`
- “label X” → `--label "X"`
- “team GEM” → `--team GEM` instead of `--all-teams`
- “assigned to me” → prefer `--assignee self` if supported; otherwise use `linear issue mine --json`

## Script contract

`open-to-wt.sh` accepts issue IDs as arguments and emits tab-separated result lines:

```text
BASE	<base branch>
OK	<issue>	<title>	<worktree path>	<tmux session>	<notes>
FAIL	<issue>	<reason>
```

For each successful issue, the tmux session is `wt-<issue-title-slug>` with:

- `editor` window: shell at the worktree path
- `code` window left pane: `pi "/examine-issue <ISSUE_ID>"`
- `code` window right pane: `bun run bootstrap`
- `tasks` window: shell at the worktree path

## Report format

```text
Opened Linear worktrees

Selection: <filter summary>
Base branch: <base branch>
Count: <opened>/<selected> opened, <failed> failed

| Issue | Title | Worktree | tmux | Status |
| ... |

Failures:
- <issue>: <short reason>
```
