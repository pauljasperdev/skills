---
name: release
description: Prepare a versioned release PR to main with release notes grounded in the actual changes.
disable-model-invocation: true
---

# Release

`$release` prepares a patch release PR; `minor` and `major` select other bumps. The owner merges it using a merge commit; the repository's pipeline owns tagging and deployment. Discussing or editing this skill does not authorize a release.

## 1. Workspace

Verify `gh` authentication and `origin`. Resolve GitHub's default branch, distinct from `main`, and fetch both branches and release tags. Invocation from a feature branch is supported: reuse a clean default-branch worktree or create an isolated worktree at its remote head. Preserve the caller's branch and unrelated work; fast-forward a reused checkout when needed.

Release only feature work already landed on the remote default branch. Confirm that its workflow will tag and deploy after promotion. Preserve divergent branch history without rebasing or force-pushing.

Proceed when the workspace contains the remote source revision and, if resuming, only the pending release bump. Report unresolved prerequisites.

## 2. Scope

Find an existing default-branch → `main` PR to reuse. Record base and source SHAs. Read the `main..default-branch` commits, associated PRs, and actual diff; deduplicate merged work. Distinguish PR changes from branch-tip differences when histories diverge. Inspect every changed migration and configuration contract. Check deployment results before claiming what is already in production; tags and previous PR descriptions are not deployment evidence.

Proceed when every material change is accounted for. If only history or a version-preparation commit differs, report no new release and leave any existing PR unchanged.

## 3. Release notes

Draft the whole release's notes before bumping. Lead with what users or operators gain, followed by:

- **Changes:** concrete behavior and included PR links. Distinguish available interfaces from backend capabilities awaiting an interface. Describe outcomes rather than copying commit subjects or promotion mechanics.
- **Deployment notes, when applicable:** migrations, changed settings, breaking behavior, and operator actions verified against source. Treat database recovery separately from reverting application code.
- **Validation:** checks actually run, results, revision-specific CI links, and gaps. Separate source checks from release-PR checks, and tests added from tests passed. Describe checks as required only when repository rules enforce them.

Omit empty sections. Proceed when the notes cover the reviewed scope, every claim has evidence, and the reader can understand what ships without opening individual commits.

## 4. Version

Use the root manifest's declared package manager with tagging disabled; for Bun, `bun pm version patch|minor|major --no-git-tag-version`. Initialize a missing version at `0.0.0`; leave workspace versions unchanged.

Reuse a pending bump established by the manifest diff and release history, rather than bumping again on retry. Both new and reused versions must be stable SemVer, newer than `main`, and have an unused tag. Format and validate the manifest with repository tooling, then commit the root version change as `release: vX.Y.Z`.

Proceed when the version is valid and the preparation commit changes only the intended root version.

## 5. PR

Recheck remote heads before pushing; reconcile changed scope or a rejected push before continuing. Push the release commit to the default branch and create or update its PR to `main`:

- Title: `Release vX.Y.Z — <main changes>`, using a concrete description of this release.
- Body: the reviewed release notes and a comparison link pinned to the base and final source SHAs. Supply it explicitly instead of accepting generated commit text.

Read back the PR's title, body, version, head, and base. Reconcile again if its scope advanced. Because the default branch stays live, rerun `$release` to refresh notes if further changes land before merging.

Finish when the open PR contains the verified bump and matching release notes. Return its URL, version, and known release concerns. CI can continue asynchronously; preparation is not a claim of successful deployment.

## Boundary

Stop at the open PR. Do not enable auto-merge, merge, create or move tags, publish a GitHub Release, manually trigger deployments, synchronize branches after merge, or change release automation or repository rules. The authorized source-branch push may start normal CI and preproduction deployment.
