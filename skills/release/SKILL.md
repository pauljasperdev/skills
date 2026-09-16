---
name: release
description: Bump a project version and release the changes on pre to main through a concise, CI-gated pull request.
disable-model-invocation: true
---

# Release

Run only for an explicit release request in one of these repositories. `$release` bumps the patch version by default; `$release minor` and `$release major` request the other SemVer bump types.

## Workflow

1. Verify the repository root, current branch `pre`, a clean worktree, `gh` authentication, and the `origin` remote. Fetch `main` and `pre`. Stop on branch divergence or an existing ambiguous release PR.
2. Analyze the complete `main..pre` range before making the release commit. Read the commits and relevant diff, and describe what is actually included. If there is nothing in `main..pre`, stop.
3. Bump the root `VERSION` file directly. It contains one stable `MAJOR.MINOR.PATCH` value; if absent, initialize from `0.0.0`. Change no workspace package versions. Commit only this file on `pre` with `chore(release): bump version to vX.Y.Z`.
4. Push `pre`, create the PR from `pre` to `main`, wait for required CI checks, and merge it with GitHub's merge-commit strategy. Stop with the PR open if CI fails. Never squash, rebase, force-push, or create tags/releases unless requested.

The release is complete when the PR is merged and the resulting merge commit contains the requested version.

## Pull request

Use the title `chore(release): promote pre to main (vX.Y.Z)`. Generate the body from the actual `main..pre` changes. Keep it concise, fill every section, and write `None` where a section does not apply:

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
Links to included PRs and the `main..pre` commit range.
```
