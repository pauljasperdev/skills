---
name: release
description: Open or update the single pre-to-main promotion PR for CI to deploy, version, and publish.
disable-model-invocation: true
---

# Release

1. Read the repository's release procedure and applicable agent guidance. Resolve the canonical repository and fetch its `pre`, `main`, and tags. Use the remote branch heads even when the current checkout is a feature branch. Inspect the commits and diff between `main` and `pre`, using the latest release tag for release context. If there are no changes to promote, report that and stop.
2. Find the existing open PR from this repository's `pre` branch to `main`, or create it when absent. Use the title `Release` and a concise summary of the changes being promoted. Keep one promotion PR; release preparation leaves source files and the checkout unchanged. Do not create release branches or preparation PRs, bump manifest versions, commit, push to protected branches, or change branch protections.
3. The release takes the version of the release candidate tagged on the `pre` head. Remove any `release:minor` or `release:major` label from the PR; when a different bump is requested, say that it is selected with `prerelease` and needs a new candidate.
4. Read the state of the deployment check the procedure requires for this promotion on the PR's head commit, and the candidate tag on that commit. A failed or missing pre deployment blocks the release: report the failing step and leave recovery to the owner.
5. Verify the PR has this repository's `pre` as its head and `main` as its base, with no bump label. Return its link, the candidate version, and the deployment check's state, then stop. The owner merges with a merge commit; do not merge, enable auto-merge, tag, publish, or deploy as part of this skill.
