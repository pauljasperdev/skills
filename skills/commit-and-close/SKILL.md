---
name: commit-and-close
disable-model-invocation: true
description: Commit the current Linear worktree, open/reuse a PR, and move the issue to In Review.
allowed-tools: Bash(git:*), Bash(linear:*), Bash(gh:*), Bash(pwd:*), Bash(basename:*), Bash(mktemp:*), Bash(cat:*), Bash(rm:*), Bash(jq:*), Bash(perl:*), Bash(sed:*), Bash(grep:*), Bash(tr:*), Bash(printf:*)
---

# Commit and Close

`commit-and-close` is a review handoff. “Close” means close the local loop: commit, push, PR, and Linear **In Review**. Never close, complete, resolve, archive, or mark the Linear issue Done.

## Handoff steps

1. Anchor the handoff in the current git root and one Linear issue.
   ```bash
   ROOT="$(git rev-parse --show-toplevel)"
   cd "$ROOT"
   BRANCH="$(git branch --show-current)"
   WORKTREE_NAME="$(basename "$ROOT")"
   ISSUE_ID="$(linear issue id 2>/dev/null || true)"
   ```
   Prefer an explicit issue id from the user's prompt, then `linear issue id`, then ids found in the branch, git root path, or worktree directory name. Ask if there is no id or more than one plausible id.

   Completion criterion: `ROOT`, `BRANCH`, and exactly one `ISSUE_ID` are known.

2. Load the Linear title and URL.
   ```bash
   TITLE="$(linear issue title "$ISSUE_ID" | tr -d '\r')"
   URL="$(linear issue url "$ISSUE_ID" | tr -d '\r')"
   ```

   Completion criterion: title and URL are loaded for the same issue id.

3. Inspect the change set before staging.
   ```bash
   git status --short
   git diff --stat
   git diff --cached --stat
   git log --oneline @{u}..HEAD 2>/dev/null || true
   ```
   Stop if there are no working-tree changes and no unpushed commits. Ask before committing suspicious files: secrets, credentials, huge generated artifacts, vendored dependency dumps, or changes unrelated to the issue.

   Completion criterion: the intended handoff change set is clear, and every suspicious file is either excluded or explicitly approved.

4. Ensure the branch is PR-safe before committing.
   ```bash
   DEFAULT_BRANCH="$(gh repo view --json defaultBranchRef -q '.defaultBranchRef.name' 2>/dev/null || git remote show origin | perl -ne 'print "$1\n" if /HEAD branch: (.+)/')"
   case "$BRANCH" in
     main|master|dev|"$DEFAULT_BRANCH")
       SAFE_TITLE="$(printf '%s' "$TITLE" | tr '[:upper:]' '[:lower:]' | perl -0pe 's/[^a-z0-9]+/-/g; s/^-|-$//g; s/-+/-/g')"
       BRANCH="$(printf '%s-%s' "$ISSUE_ID" "$SAFE_TITLE" | tr '[:upper:]' '[:lower:]')"
       git switch -c "$BRANCH"
       ;;
   esac
   ```

   Completion criterion: the current branch is not `main`, `master`, `dev`, or the repository default branch.

5. Commit uncommitted work, if any.
   - Base the subject on the actual diff: `<type>(<scope>): <imperative summary> [$ISSUE_ID]`.
   - Use `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `build`, or `perf`.
   - Include a scope only when it is specific.
   - Put the Linear URL in the body with `Linear:`. Do not use `Fixes:`, `Closes:`, or `Resolves:`.

   ```bash
   if ! git diff --quiet || ! git diff --cached --quiet; then
     git add -A
     MSG_FILE="$(mktemp)"
     printf '%s\n\nLinear: %s\n' "<type>(<scope>): <imperative summary> [$ISSUE_ID]" "$URL" > "$MSG_FILE"
     git commit -F "$MSG_FILE"
     rm "$MSG_FILE"
   fi
   COMMIT_SHA="$(git rev-parse --short HEAD)"
   ```

   Completion criterion: all intended local changes are committed, or there were none; `COMMIT_SHA` names the handoff commit.

6. Record verification truthfully.
   Run the relevant tests/checks when obvious and cheap. If verification is not run, record `Not run`; do not invent commands.

   Completion criterion: the PR body can state exactly what was run, or exactly that nothing was run.

7. Push the branch without rewriting history.
   ```bash
   git push -u origin "$BRANCH"
   ```

   Completion criterion: the remote branch exists on `origin`.

8. Create or reuse a GitHub PR.
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

   Completion criterion: exactly one PR exists for the branch and `PR_URL` is known.

9. Move Linear to **In Review** only after the PR exists.
   ```bash
   linear issue update "$ISSUE_ID" --state "In Review"
   ```
   If this fails, report the failure. Do not use another terminal state as a fallback.

   Completion criterion: the issue is In Review, or the state-update failure is reported with the PR URL.

10. Return the handoff summary.
    ```text
    Issue: <ISSUE_ID> — <title>
    Commit: <COMMIT_SHA> on <branch>
    PR: <PR_URL>
    Linear: <URL>
    State: In Review | failed to update (<reason>)
    Verification: <commands run | Not run>
    ```

## Hard stops

- No `Fixes:`, `Closes:`, or `Resolves:` anywhere in commit or PR text.
- No force-push, amend, rebase, or squash unless the user explicitly asks.
- No duplicate PR when one already exists for the branch.
