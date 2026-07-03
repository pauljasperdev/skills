---
name: commit-and-close
description: Commit current worktree changes for the active Linear issue, push the branch, create or reuse a GitHub PR, and move the Linear issue to In Review. Use when the user says /commit-and-close, commit and close, finish this worktree, open a PR for this ticket, commit current changes, or move the ticket to review. Despite the name, never close/complete the Linear issue; merged PRs close work, this skill only marks In Review after a PR exists.
allowed-tools: Bash(git:*), Bash(linear:*), Bash(gh:*), Bash(pwd:*), Bash(basename:*), Bash(mktemp:*), Bash(cat:*), Bash(rm:*), Bash(jq:*), Bash(perl:*), Bash(sed:*), Bash(grep:*), Bash(tr:*)
disable-model-invocation: true
---

# Commit and Close

Finish the current Linear worktree by committing local changes, opening a GitHub PR, and moving the ticket to **In Review**. The skill name is historical: do not close, complete, resolve, or mark the issue Done.

## Workflow

1. Work from the current git root.
   ```bash
   ROOT="$(git rev-parse --show-toplevel)"
   cd "$ROOT"
   ```

2. Resolve the Linear issue id. Prefer an explicit id in the user's prompt, then `linear issue id`, then ids found in the current branch, git root path, or worktree directory name. Ask if no id or multiple plausible ids are found.
   ```bash
   BRANCH="$(git branch --show-current)"
   WORKTREE_NAME="$(basename "$ROOT")"
   ISSUE_ID="$(linear issue id 2>/dev/null || true)"
   ```

3. Get Linear title + URL.
   ```bash
   TITLE="$(linear issue title "$ISSUE_ID" | tr -d '\r')"
   URL="$(linear issue url "$ISSUE_ID" | tr -d '\r')"
   ```

4. Inspect changes before staging. Stop if there are no working-tree changes and no unpushed commits that need a PR. Pause and ask before committing suspicious files such as secrets, huge generated artifacts, or unrelated changes.
   ```bash
   git status --short
   git diff --stat
   ```

5. Stage and commit all intended worktree changes.
   - Use a Conventional Commit subject based on the actual diff: `<type>(<scope>): <imperative summary> [$ISSUE_ID]`.
   - Use standard types such as `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `build`, or `perf`.
   - Include a scope when helpful; omit it when it would be vague.
   - Put the ticket id in brackets at the end of the subject.
   - Put the Linear URL in the body after a blank line.
   - Use `Linear:` / `Refs:` wording, not `Fixes:`, `Closes:`, or `Resolves:`.

   ```bash
   git add -A
   MSG_FILE="$(mktemp)"
   printf '%s\n\nLinear: %s\n' "<type>(<scope>): <imperative summary> [$ISSUE_ID]" "$URL" > "$MSG_FILE"
   git commit -F "$MSG_FILE"
   rm "$MSG_FILE"
   COMMIT_SHA="$(git rev-parse --short HEAD)"
   ```

6. Push the branch. Do not create PRs from `main`, `master`, or `dev`; if currently on a protected/base branch, create a feature branch named from the issue id + title first.
   ```bash
   BRANCH="$(git branch --show-current)"
   git push -u origin "$BRANCH"
   ```

7. Create or reuse a GitHub PR with `gh`.
   - First check for an existing PR for the branch and reuse it if present.
   - Use the repository default branch as the PR base.
   - PR title format: `$ISSUE_ID: $TITLE` unless the user supplied a better title.
   - PR body must include the Linear URL, summary, and verification actually run.

   ```bash
   PR_URL="$(gh pr view --json url -q .url 2>/dev/null || true)"
   if [ -z "$PR_URL" ]; then
     BASE_BRANCH="$(gh repo view --json defaultBranchRef -q '.defaultBranchRef.name')"

     BODY_FILE="$(mktemp)"
     cat > "$BODY_FILE" <<EOF
Linear: $URL

## Summary
- <summarize the committed changes>

## Verification
- <commands actually run, or "Not run">
EOF
     PR_URL="$(gh pr create --base "$BASE_BRANCH" --head "$BRANCH" --title "$ISSUE_ID: $TITLE" --body-file "$BODY_FILE")"
     rm "$BODY_FILE"
   fi
   ```

8. Move the Linear issue to **In Review** only after the PR exists. If this fails, report it; do not mark the issue completed as a fallback.
   ```bash
   linear issue update "$ISSUE_ID" --state "In Review"
   ```

9. Return a concise summary:
   - issue id, title, Linear URL
   - commit SHA + branch
   - PR URL
   - Linear state update result

## Safety rules

- Never close, complete, resolve, archive, or mark Done. Only move to `In Review`.
- Never use `Fixes`, `Closes`, or `Resolves` in commit/PR text for this workflow.
- Never force-push, amend, rebase, or squash unless the user explicitly asks.
- Never create a duplicate PR if one already exists for the branch.
