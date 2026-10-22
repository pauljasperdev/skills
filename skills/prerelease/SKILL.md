---
name: prerelease
description: Open or update the single dev-to-pre promotion PR for CI to deploy and tag as a release candidate.
disable-model-invocation: true
---

# Prerelease

The promotion PR comes from the `prerelease` branch, which pins the `dev` commit being promoted: a PR merges its head branch as it is at merge time, so a PR from `dev` would keep waiting for the deployment check of each newer `dev` head.

1. Read the repository's release procedure and applicable agent guidance. Resolve the canonical repository and fetch its `dev`, `pre`, `prerelease`, and tags. Use the remote branch heads even when the current checkout is a feature branch.
2. Select the promotion commit: the newest commit on `dev` whose deployment check the procedure requires has passed. When no `dev` commit after `pre` has passed, read that check on the `dev` head; when no deployment run for it has passed, is running, or is queued, dispatch the repository's deployment workflow for `dev` as the procedure describes. Report the check's state and stop without waiting for the run.
3. Inspect the commits and diff between `pre` and the promotion commit, using the latest release tag for context. If there are no changes to promote, report that and stop.
4. Point `prerelease` at the promotion commit with a fast-forward push, creating the branch when absent. If the push is not a fast-forward, report the branch's current commit and stop.
5. Find the existing open PR from this repository's `prerelease` branch to `pre`, or create it when absent. Use the title `Prerelease` and a concise summary of the changes being promoted. Keep one promotion PR: report any other open PR into `pre` for the owner to close. Preparation leaves source files and the checkout unchanged. Do not create other branches or preparation PRs, bump manifest versions, commit, push to `dev`, `pre`, or `main`, or change branch protections.
6. Select the bump through the promotion PR's labels: no bump label for patch (the default), `release:minor` for an explicitly requested minor release, or `release:major` for an explicitly requested major release. Remove the other bump labels so the selection is unambiguous. Create the requested label if it does not exist. CI tags the deployed `pre` commit as the next release candidate of that version.
7. Verify the PR has this repository's `prerelease` branch at the promotion commit as its head and `pre` as its base, with the intended bump selection. Return its link, the promoted commit, and the deployment check's state. Then stop. The owner merges with a merge commit; do not merge, enable auto-merge, tag, or publish as part of this skill.
