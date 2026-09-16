---
name: release
description: Bump a project version and release the default branch to main through a concise, CI-gated pull request and tagged merge commit.
disable-model-invocation: true
---

# Release

Run only for an explicit release request in one of these repositories. `$release` bumps the patch version by default; `$release minor` and `$release major` request the other SemVer bump types. One invocation runs the complete release.

## Workflow

1. Verify the repository root, a clean worktree, `gh` authentication, and the `origin` remote. Resolve the repository's configured default branch with GitHub; require the current branch to be that branch. Fetch `main` and the default branch. A history divergence between them is expected: the `default branch → main` PR is what reconciles it. Proceed with the PR; do not rebase or force-push.
2. Analyze the complete `main..default-branch` range before making the release commit. Read the commits and relevant diff, and describe what is actually included. If there is nothing in the range, stop. Check for an existing release PR from the default branch to `main` and reuse the single unambiguous PR if one exists.
3. Read the root `package.json` version and use the package manager declared there. For Bun, run `bun pm version patch|minor|major --no-git-tag-version`; for pnpm, use its equivalent no-tag version command. If the root manifest has no version yet, initialize it at `0.0.0` before bumping. If the default branch already contains the release bump commit from an interrupted run, reuse that version instead of bumping again. Change only the root manifest's project version; do not change workspace package versions. Commit only the version change with `chore(release): bump version to vX.Y.Z`.
4. Push the default branch and create the PR from the default branch to `main`. Put the release analysis in the PR body. Request automatic merging with GitHub's merge-commit strategy and wait for required CI checks and approvals. If GitHub reports merge conflicts or a check fails, leave the PR open and report the blocker; the resolution is a PR update, not a rebase.
5. After the PR is merged, create the annotated tag `vX.Y.Z` on the resulting merge commit and push it. Then fast-forward the default branch to that same merge commit, so the tag is reachable from both `main` and the default branch. Do not create a separate GitHub Release unless requested.

The release is complete when the PR is merged, the tag points at its merge commit, and both `main` and the default branch contain that tagged commit.

## Pull request

Use the title `chore(release): promote default branch to main (vX.Y.Z)`. Generate the body from the actual `main..default-branch` changes. Keep it concise, fill every section, and write `None` where a section does not apply:

```markdown
## Release X.Y.Z

### Summary
What this release accomplishes in plain language.

### Included changes
Grouped by feature, fix, infrastructure, and documentation.

### User-visible changes
What behaves differently for users or operators.

### Breaking changes
Explicitly state none, or describe each one.

### Data and deployment changes
Migrations, environment changes, manual steps, and rollout order.

### Validation
Relevant checks, test suites, CI status, and known limitations.

### Risks and rollback
Anything worth watching after promotion.

### Included work
Links to included PRs and the `main..default-branch` commit range.
```
