---
name: release
description: Open or update the single pre-to-main promotion PR for CI to version, deploy, and publish.
disable-model-invocation: true
---

# Release

1. Read the repository's release procedure and applicable agent guidance. Resolve the canonical repository and fetch its `pre`, `main`, and tags. Use the remote branch heads even when the current checkout is a feature branch. Inspect the commits and diff between `main` and `pre`, using the latest release tag for release context. If there are no changes to promote, report that and stop.
2. Find the existing open PR from this repository's `pre` branch to `main`, or create it when absent. Use the title `Release` and a concise summary of the changes being promoted. Keep one promotion PR; release preparation leaves source files and the checkout unchanged. Do not create release branches or preparation PRs, bump manifest versions, commit, push to protected branches, or change branch protections.
3. Select the bump through the promotion PR's labels: no bump label for patch (the default), `release:minor` for an explicitly requested minor release, or `release:major` for an explicitly requested major release. Remove the other bump labels so the selection is unambiguous. Create the requested label if it does not exist. CI derives the version from stable Git tags, reserves an immutable tag on the production merge commit, and publishes a GitHub Release after successful deployment.
4. Verify the PR has this repository's `pre` as its head and `main` as its base, with the intended bump selection. Return its link and stop. The owner merges with a merge commit; do not merge, enable auto-merge, tag, publish, or deploy as part of this skill.
